import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure backend and ai_engine in path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)
sys.path.insert(0, os.path.abspath(os.path.join(backend_dir, "..", "ai_engine")))

from app.main import app

client = TestClient(app)


def test_health_and_root():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["project"] == "CivicFlow"
    assert data["tagline"] == "Report. Route. Resolve."

    res_h = client.get("/health")
    assert res_h.status_code == 200
    assert res_h.json()["status"] == "healthy"


def test_ai_analysis_endpoint():
    payload = {
        "description": "Open manhole with missing cover near school on the main road.",
        "has_image": True,
        "image_metadata": {"detected_objects": ["uncovered manhole"]},
        "location_name": "MG Road, Pune",
        "is_sensitive_location": True
    }
    res = client.post("/api/analysis/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["issueType"] == "OPEN_MANHOLE"
    assert data["category"] == "Drainage & Sewerage"
    assert data["department"] == "Drainage & Sewerage Department"
    assert data["severityLevel"] == "CRITICAL"
    assert data["severityScore"] >= 76
    assert data["recommendedResponseTimeHours"] == 4
    assert len(data["evidenceObservations"]) > 0


def test_complaint_lifecycle():
    # 1. Create complaint
    create_payload = {
        "title": "Open Manhole near School",
        "description": "Open manhole posing severe accident hazard near St. Xavier School.",
        "category": "Drainage & Sewerage",
        "issue_type": "OPEN_MANHOLE",
        "severity_score": 84,
        "severity_level": "CRITICAL",
        "department": "Drainage & Sewerage Department",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "address": "MG Road, Pune",
        "is_sensitive_location": True,
        "citizen_name": "Test Citizen",
        "evidence_urls": ["https://example.com/manhole.jpg"],
        "evidence_observations": ["Missing cover observed", "School zone flag active"],
        "severity_factors": [
            {"factor": "Base Issue Risk", "points": 30, "max_points": 30, "detail": "Open manhole"},
            {"factor": "Immediate Safety Hazard", "points": 25, "max_points": 25, "detail": "Fall hazard"}
        ]
    }
    res = client.post("/api/complaints", json=create_payload)
    assert res.status_code == 201
    complaint = res.json()
    c_id = complaint["id"]
    assert complaint["status"] == "SUBMITTED"
    assert complaint["sla_hours"] == 4
    assert complaint["municipal_receipt_id"] is not None
    assert len(complaint["actions"]) >= 2

    # 2. Transition to ACKNOWLEDGED
    res_ack = client.post(f"/api/complaints/{c_id}/status", json={
        "new_status": "ACKNOWLEDGED",
        "actor": "OFFICER",
        "officer_name": "Er. Kulkarni"
    })
    assert res_ack.status_code == 200
    assert res_ack.json()["status"] == "ACKNOWLEDGED"

    # 3. Transition to IN_PROGRESS
    res_prog = client.post(f"/api/complaints/{c_id}/status", json={
        "new_status": "IN_PROGRESS",
        "actor": "OFFICER",
        "officer_name": "Er. Kulkarni"
    })
    assert res_prog.status_code == 200
    assert res_prog.json()["status"] == "IN_PROGRESS"

    # 4. Officer reports resolution
    res_resol = client.post(f"/api/complaints/{c_id}/status", json={
        "new_status": "RESOLUTION_REPORTED",
        "actor": "OFFICER",
        "resolution_notes": "Heavy duty cast-iron manhole lid installed and sealed.",
        "resolution_evidence_urls": ["https://example.com/resolved.jpg"]
    })
    assert res_resol.status_code == 200
    assert res_resol.json()["status"] == "RESOLUTION_REPORTED"

    # 5. Citizen verifies resolution
    res_ver = client.post(f"/api/complaints/{c_id}/verify-resolution", json={
        "confirmed": True,
        "rating": 5,
        "feedback": "Cover replaced securely. Thank you!"
    })
    assert res_ver.status_code == 200
    assert res_ver.json()["status"] == "RESOLVED"
    assert res_ver.json()["citizen_feedback_rating"] == 5


def test_followup_and_escalation():
    # Create high severity complaint
    create_payload = {
        "title": "Pipeline Burst Test",
        "description": "Clean water pipe leaking heavily on street.",
        "category": "Water Supply",
        "issue_type": "WATER_LEAKAGE",
        "severity_score": 70,
        "severity_level": "HIGH",
        "department": "Water Supply Department",
        "latitude": 18.9220,
        "longitude": 72.8347,
        "address": "Marine Drive, Mumbai",
        "is_sensitive_location": False
    }
    res = client.post("/api/complaints", json=create_payload)
    c_id = res.json()["id"]

    # Trigger follow-up
    res_f = client.post(f"/api/complaints/{c_id}/follow-up", json={
        "actor": "AI_AGENT",
        "reason": "Automated SLA reminder after 12 hours"
    })
    assert res_f.status_code == 200
    assert res_f.json()["followup_count"] >= 1

    # Trigger escalation
    res_esc = client.post(f"/api/complaints/{c_id}/escalate", json={
        "actor": "AI_AGENT",
        "reason": "Critical SLA threshold exceeded without resolution",
        "escalation_level": 1
    })
    assert res_esc.status_code == 200
    assert res_esc.json()["status"] == "ESCALATED"
    assert res_esc.json()["escalation_level"] >= 1


def test_analytics_and_departments():
    res_a = client.get("/api/analytics")
    assert res_a.status_code == 200
    a = res_a.json()
    assert a["total_complaints"] >= 1
    assert "department_stats" in a
    assert len(a["recent_activities"]) > 0

    res_d = client.get("/api/departments")
    assert res_d.status_code == 200
    depts = res_d.json()
    assert len(depts) >= 4
