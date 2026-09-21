import sys
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Ensure ai_engine is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ai_engine")))

from triage.complaint_triage import triage_complaint
from incident_detector import find_duplicate_complaints
from app.database.database import get_db
from app.models.complaint import Complaint
from app.schemas.complaint import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    DuplicateCheckRequest,
    SeverityFactorSchema
)

router = APIRouter(prefix="/analysis", tags=["AI Analysis"])


@router.post("/analyze", response_model=AIAnalysisResponse)
def analyze_complaint_endpoint(data: AIAnalysisRequest):
    """
    Run multimodal issue classification, deterministic 0-100 severity calculation,
    centralized department routing, and evidence grounding.
    """
    result = triage_complaint(
        description=data.description,
        has_image=data.has_image,
        image_metadata=data.image_metadata,
        location_name=data.location_name or "",
        is_sensitive_location=data.is_sensitive_location,
        repeat_reports_count=data.repeat_reports_count
    )

    factors = [
        SeverityFactorSchema(
            factor=f.factor,
            points=f.points,
            max_points=f.max_points,
            detail=f.detail
        ) for f in result.severityFactors
    ]

    return AIAnalysisResponse(
        issueType=result.issueType,
        category=result.category,
        confidence=result.confidence,
        severityScore=result.severityScore,
        severityLevel=result.severityLevel,
        department=result.department,
        departmentCode=result.departmentCode,
        summary=result.summary,
        evidenceObservations=result.evidenceObservations,
        severityFactors=factors,
        departmentReason=result.departmentReason,
        missingInformation=result.missingInformation,
        recommendedResponseTimeHours=result.recommendedResponseTimeHours
    )


@router.post("/check-duplicate")
def check_duplicate_complaints(data: DuplicateCheckRequest, db: Session = Depends(get_db)):
    """
    Check if a similar complaint exists nearby using distance, category, and text similarity.
    """
    recent_complaints = db.query(Complaint).filter(
        Complaint.status.notin_(["CLOSED"])
    ).all()

    existing_dicts = [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "category": c.category,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "created_at": c.created_at.isoformat(),
            "status": c.status,
            "support_count": c.support_count
        }
        for c in recent_complaints
    ]

    target = {
        "description": data.description,
        "category": data.category,
        "latitude": data.latitude,
        "longitude": data.longitude
    }

    duplicates = find_duplicate_complaints(
        target_complaint=target,
        existing_complaints=existing_dicts,
        distance_threshold_km=0.35,
        confidence_threshold=50.0
    )

    return {
        "has_duplicates": len(duplicates) > 0,
        "duplicates": duplicates
    }
