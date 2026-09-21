import sys
import os
import json
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

# Ensure ai_engine is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ai_engine")))

from incident_detector import detect_area_incident
from app.database.database import get_db
from app.models.complaint import Complaint, ComplaintAction

router = APIRouter(tags=["Incidents & Analytics"])


@router.get("/incidents/detect")
def detect_incidents_endpoint(db: Session = Depends(get_db)):
    """Detect civic incident clusters from active complaints."""
    active = db.query(Complaint).filter(
        Complaint.status.notin_(["RESOLVED", "CLOSED"])
    ).all()

    complaints_list = [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "category": c.category,
            "severity": c.severity_level,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "created_at": c.created_at.isoformat()
        }
        for c in active
    ]

    result = detect_area_incident(complaints_list)
    return result


@router.get("/analytics")
def get_analytics_summary(db: Session = Depends(get_db)):
    """Generate high-level civic intelligence analytics for the Admin dashboard."""
    all_complaints = db.query(Complaint).all()
    total = len(all_complaints)

    open_statuses = {"SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP_PENDING", "ESCALATION_PENDING"}
    open_count = sum(1 for c in all_complaints if c.status in open_statuses)
    in_progress_count = sum(1 for c in all_complaints if c.status == "IN_PROGRESS")
    resolved_count = sum(1 for c in all_complaints if c.status in {"RESOLVED", "CLOSED"})
    escalated_count = sum(1 for c in all_complaints if c.status == "ESCALATED")

    critical_count = sum(1 for c in all_complaints if c.severity_level == "CRITICAL")
    high_count = sum(1 for c in all_complaints if c.severity_level == "HIGH")
    medium_count = sum(1 for c in all_complaints if c.severity_level == "MEDIUM")
    low_count = sum(1 for c in all_complaints if c.severity_level == "LOW")

    # SLA Compliance rate
    now = datetime.utcnow()
    breached_count = 0
    for c in all_complaints:
        if c.sla_deadline and c.sla_deadline < now and c.status not in ["RESOLVED", "CLOSED"]:
            breached_count += 1

    sla_compliance_pct = round(((total - breached_count) / total * 100), 1) if total > 0 else 100.0

    # Department breakdown
    dept_stats = {}
    for c in all_complaints:
        dept = c.department or "Other"
        dept_stats[dept] = dept_stats.get(dept, 0) + 1

    # Recent immutable activities across the system
    recent_actions = db.query(ComplaintAction).order_by(desc(ComplaintAction.id)).limit(15).all()
    audit_stream = [
        {
            "id": a.id,
            "complaint_id": a.complaint_id,
            "action": a.action,
            "actor": a.actor,
            "timestamp": a.timestamp.isoformat(),
            "reason": a.reason,
            "old_status": a.old_status,
            "new_status": a.new_status
        }
        for a in recent_actions
    ]

    return {
        "total_complaints": total,
        "open_complaints": open_count,
        "in_progress_complaints": in_progress_count,
        "resolved_complaints": resolved_count,
        "escalated_complaints": escalated_count,
        "sla_breached_count": breached_count,
        "sla_compliance_rate_pct": sla_compliance_pct,
        "critical_count": critical_count,
        "high_count": high_count,
        "medium_count": medium_count,
        "low_count": low_count,
        "department_stats": dept_stats,
        "recent_activities": audit_stream
    }
