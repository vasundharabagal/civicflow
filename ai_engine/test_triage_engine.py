import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from triage.complaint_triage import triage_complaint, calculate_deterministic_severity
from incident_detector import find_duplicate_complaints, detect_area_incident


def test_manhole_triage():
    """Test the primary judge scenario: Open manhole near school on busy road."""
    description = "There is a dangerous open manhole on the main road right beside St. Xavier School. It has missing cover and pedestrians might fall inside."
    result = triage_complaint(
        description=description,
        has_image=True,
        image_metadata={"detected_objects": ["uncovered manhole opening", "street curb"]},
        location_name="MG Road, near St. Xavier High School",
        is_sensitive_location=True,
        repeat_reports_count=1
    )

    print("=== TEST MANHOLE TRIAGE ===")
    print(f"Issue Type: {result.issueType}")
    print(f"Category: {result.category}")
    print(f"Confidence: {result.confidence}")
    print(f"Severity Score: {result.severityScore}/100 ({result.severityLevel})")
    print(f"Department: {result.department} ({result.departmentCode})")
    print(f"SLA Response Hours: {result.recommendedResponseTimeHours}h")
    print("Evidence Observations:")
    for obs in result.evidenceObservations:
        print(f"  - {obs}")
    print("Severity Factors Breakdown:")
    for factor in result.severityFactors:
        print(f"  + {factor.factor} ({factor.points}/{factor.max_points}): {factor.detail}")

    assert result.issueType == "OPEN_MANHOLE"
    assert result.category == "Drainage & Sewerage"
    assert result.department == "Drainage & Sewerage Department"
    assert result.severityLevel == "CRITICAL"
    assert result.severityScore >= 76
    assert result.recommendedResponseTimeHours == 4
    print("[PASS] Open Manhole Test Passed!\n")


def test_pothole_triage():
    """Test standard road pothole complaint."""
    description = "Large pothole on 5th avenue causing vehicle slowdown."
    result = triage_complaint(
        description=description,
        has_image=False,
        location_name="5th Avenue",
        is_sensitive_location=False
    )

    print("=== TEST POTHOLE TRIAGE ===")
    print(f"Issue Type: {result.issueType}")
    print(f"Severity Score: {result.severityScore}/100 ({result.severityLevel})")
    print(f"Department: {result.department}")
    assert result.issueType == "POTHOLE"
    assert result.department == "Roads & Public Works Department"
    assert result.severityLevel in ["LOW", "MEDIUM", "HIGH"]
    print("[PASS] Pothole Test Passed!\n")


def test_duplicate_detection():
    """Test duplicate detection for nearby complaints."""
    existing = [
        {
            "id": 101,
            "title": "Open manhole uncovered on MG road",
            "category": "Drainage & Sewerage",
            "description": "Open manhole uncovered on MG road near school",
            "latitude": 18.5204,
            "longitude": 73.8567,
            "created_at": "2026-09-21T08:00:00",
            "support_count": 2
        }
    ]

    new_report = {
        "title": "Missing drain lid on MG road",
        "category": "Drainage & Sewerage",
        "description": "Missing drain lid and open manhole on MG road",
        "latitude": 18.5205,
        "longitude": 73.8568,
        "created_at": "2026-09-21T09:00:00"
    }

    duplicates = find_duplicate_complaints(new_report, existing, distance_threshold_km=0.3)
    print("=== TEST DUPLICATE DETECTION ===")
    print(f"Found {len(duplicates)} duplicate(s):")
    for d in duplicates:
        print(f"  Matched #{d['complaint_id']} with confidence {d['confidence']}% at {d['distance_meters']}m")
    assert len(duplicates) == 1
    assert duplicates[0]["complaint_id"] == 101
    print("[PASS] Duplicate Detection Test Passed!\n")


if __name__ == "__main__":
    test_manhole_triage()
    test_pothole_triage()
    test_duplicate_detection()
    print("ALL AI ENGINE TRIAGE TESTS PASSED SUCCESSFULLY!")
