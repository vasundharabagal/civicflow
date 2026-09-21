import json
import random
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.database import get_db
from app.models.complaint import Complaint, ComplaintAction
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintResponse,
    StatusTransitionRequest,
    FollowUpRequest,
    EscalateRequest,
    VerifyResolutionRequest,
    ComplaintActionResponse
)
from app.services.complaint_service import (
    is_valid_transition,
    record_activity,
    calculate_sla_deadline,
    get_sla_metrics,
    trigger_automatic_followup,
    trigger_escalation,
    municipal_gateway
)

router = APIRouter(prefix="/complaints", tags=["Complaints"])


def format_complaint_response(complaint: Complaint) -> ComplaintResponse:
    """Format Complaint model instance to Pydantic ComplaintResponse with parsed JSON fields."""
    sla = get_sla_metrics(complaint)

    # Parse JSON fields safely
    evidence_urls = json.loads(complaint.evidence_urls or "[]")
    evidence_obs = json.loads(complaint.evidence_observations or "[]")
    factors = json.loads(complaint.severity_factors or "[]")
    resolution_urls = json.loads(complaint.resolution_evidence_urls or "[]")

    action_responses = []
    for a in complaint.actions:
        refs = json.loads(a.evidence_references or "[]")
        meta = json.loads(a.metadata_json or "{}")
        action_responses.append(ComplaintActionResponse(
            id=a.id,
            complaint_id=a.complaint_id,
            action=a.action,
            actor=a.actor,
            timestamp=a.timestamp,
            reason=a.reason,
            evidence_references=refs,
            old_status=a.old_status,
            new_status=a.new_status,
            metadata_json=meta
        ))

    return ComplaintResponse(
        id=complaint.id,
        tracking_number=complaint.tracking_number,
        title=complaint.title,
        description=complaint.description,
        category=complaint.category,
        issue_type=complaint.issue_type,
        severity_score=complaint.severity_score,
        severity_level=complaint.severity_level,
        department=complaint.department,
        department_code=complaint.department_code,
        status=complaint.status,
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        address=complaint.address,
        landmark=complaint.landmark,
        is_sensitive_location=complaint.is_sensitive_location,
        citizen_name=complaint.citizen_name or "Citizen Reporter",
        evidence_urls=evidence_urls,
        evidence_observations=evidence_obs,
        severity_factors=factors,
        resolution_evidence_urls=resolution_urls,
        resolution_notes=complaint.resolution_notes,
        citizen_feedback_rating=complaint.citizen_feedback_rating,
        citizen_feedback_comment=complaint.citizen_feedback_comment,
        support_count=complaint.support_count,
        sla_hours=complaint.sla_hours,
        sla_deadline=sla["deadline"],
        sla_remaining_seconds=sla["remaining_seconds"],
        sla_breached=sla["breached"],
        followup_count=complaint.followup_count,
        escalation_level=complaint.escalation_level,
        escalation_reason=complaint.escalation_reason,
        municipal_receipt_id=complaint.municipal_receipt_id,
        assigned_officer=complaint.assigned_officer,
        acknowledged_at=complaint.acknowledged_at,
        resolved_at=complaint.resolved_at,
        closed_at=complaint.closed_at,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        actions=action_responses
    )


@router.post("", response_model=ComplaintResponse, status_code=201)
def create_complaint(data: ComplaintCreate, db: Session = Depends(get_db)):
    """Create a structured citizen complaint and initialize the agentic workflow."""
    tracking_no = f"CF-2026-{random.randint(10000, 99999)}"
    now = datetime.utcnow()

    # Determine SLA hours from severity
    sla_map = {"CRITICAL": 4, "HIGH": 24, "MEDIUM": 72, "LOW": 120}
    sla_hours = sla_map.get(data.severity_level, 72)
    deadline = calculate_sla_deadline(now, sla_hours)

    title = data.title or f"{data.issue_type.replace('_', ' ').title()} at {data.address}"

    # Submit to Demo Municipal Gateway
    gateway_receipt = municipal_gateway.submit_complaint({
        "tracking_number": tracking_no,
        "department": data.department,
        "issue_type": data.issue_type,
        "severity": data.severity_level
    })

    complaint = Complaint(
        tracking_number=tracking_no,
        title=title,
        description=data.description,
        category=data.category,
        issue_type=data.issue_type,
        severity_score=data.severity_score,
        severity_level=data.severity_level,
        department=data.department,
        department_code=data.department_code,
        status="SUBMITTED",
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
        landmark=data.landmark,
        is_sensitive_location=data.is_sensitive_location,
        citizen_name=data.citizen_name or "Citizen Reporter",
        citizen_phone=data.citizen_phone,
        citizen_email=data.citizen_email,
        evidence_urls=json.dumps(data.evidence_urls),
        evidence_observations=json.dumps(data.evidence_observations),
        severity_factors=json.dumps([f.model_dump() for f in data.severity_factors]),
        support_count=1,
        sla_hours=sla_hours,
        sla_deadline=deadline,
        municipal_receipt_id=gateway_receipt.get("receipt_id"),
        created_at=now,
        updated_at=now
    )

    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Immutable Audit Log: CLASSIFY_ISSUE and SUBMIT_COMPLAINT
    record_activity(
        db=db,
        complaint_id=complaint.id,
        action="CLASSIFY_ISSUE",
        actor="AI_AGENT",
        reason=f"Classified as {complaint.issue_type} with severity {complaint.severity_score}/100 ({complaint.severity_level})",
        evidence_references=data.evidence_urls,
        old_status="ANALYZING",
        new_status="SUBMITTED",
        metadata={"department": complaint.department, "sla_hours": sla_hours}
    )

    record_activity(
        db=db,
        complaint_id=complaint.id,
        action="SUBMIT_COMPLAINT",
        actor="CITIZEN",
        reason="Citizen verified AI analysis and submitted formal civic complaint",
        evidence_references=data.evidence_urls,
        old_status=None,
        new_status="SUBMITTED",
        metadata={"receipt_id": gateway_receipt.get("receipt_id")}
    )

    return format_complaint_response(complaint)


@router.get("", response_model=List[ComplaintResponse])
def list_complaints(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List complaints with filtering and search."""
    query = db.query(Complaint)

    if status and status != "ALL":
        query = query.filter(Complaint.status == status)
    if severity and severity != "ALL":
        query = query.filter(Complaint.severity_level == severity)
    if department and department != "ALL":
        query = query.filter(Complaint.department.ilike(f"%{department}%"))
    if search:
        query = query.filter(
            (Complaint.title.ilike(f"%{search}%")) |
            (Complaint.description.ilike(f"%{search}%")) |
            (Complaint.tracking_number.ilike(f"%{search}%")) |
            (Complaint.address.ilike(f"%{search}%"))
        )

    complaints = query.order_by(desc(Complaint.created_at)).offset(skip).limit(limit).all()
    return [format_complaint_response(c) for c in complaints]


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Retrieve full complaint details with immutable activity history."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return format_complaint_response(complaint)


@router.post("/{complaint_id}/status", response_model=ComplaintResponse)
def update_complaint_status(complaint_id: int, data: StatusTransitionRequest, db: Session = Depends(get_db)):
    """Transition complaint along the state machine with validation and audit logging."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_status = complaint.status
    target_status = data.new_status.upper()

    if not is_valid_transition(old_status, target_status):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state transition from '{old_status}' to '{target_status}'. Legal transitions: {list(ALLOWED_TRANSITIONS.get(old_status, []))}"
        )

    complaint.status = target_status
    complaint.updated_at = datetime.utcnow()

    # Capture role actions and timestamps
    if target_status == "ACKNOWLEDGED":
        complaint.acknowledged_at = datetime.utcnow()
        action_name = "ACKNOWLEDGE_COMPLAINT"
    elif target_status == "ASSIGNED":
        complaint.assigned_officer = data.officer_name or "Duty Officer"
        action_name = "ASSIGN_OFFICER"
    elif target_status == "IN_PROGRESS":
        action_name = "UPDATE_PROGRESS"
    elif target_status == "RESOLUTION_REPORTED":
        complaint.resolution_notes = data.resolution_notes or "Work completed on site."
        if data.resolution_evidence_urls:
            complaint.resolution_evidence_urls = json.dumps(data.resolution_evidence_urls)
        action_name = "REPORT_RESOLUTION"
    elif target_status == "RESOLVED":
        complaint.resolved_at = datetime.utcnow()
        action_name = "VERIFY_RESOLUTION"
    elif target_status == "CLOSED":
        complaint.closed_at = datetime.utcnow()
        action_name = "CLOSE_COMPLAINT"
    elif target_status == "REOPENED":
        action_name = "REOPEN_COMPLAINT"
    else:
        action_name = "UPDATE_STATUS"

    db.commit()
    db.refresh(complaint)

    record_activity(
        db=db,
        complaint_id=complaint.id,
        action=action_name,
        actor=data.actor,
        reason=data.reason or f"Status changed to {target_status}",
        evidence_references=data.resolution_evidence_urls,
        old_status=old_status,
        new_status=target_status,
        metadata={"officer": data.officer_name}
    )

    return format_complaint_response(complaint)


@router.post("/{complaint_id}/follow-up", response_model=ComplaintResponse)
def issue_followup(complaint_id: int, data: FollowUpRequest, db: Session = Depends(get_db)):
    """Trigger an automated or manual SLA follow-up reminder."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updated = trigger_automatic_followup(
        db=db,
        complaint=complaint,
        actor=data.actor,
        reason=data.reason or "Automated SLA follow-up dispatched"
    )
    return format_complaint_response(updated)


@router.post("/{complaint_id}/escalate", response_model=ComplaintResponse)
def escalate_complaint(complaint_id: int, data: EscalateRequest, db: Session = Depends(get_db)):
    """Escalate a stalled or critical complaint to higher municipal authority."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updated = trigger_escalation(
        db=db,
        complaint=complaint,
        reason=data.reason,
        escalation_level=data.escalation_level,
        actor=data.actor
    )
    return format_complaint_response(updated)


@router.post("/{complaint_id}/verify-resolution", response_model=ComplaintResponse)
def verify_resolution(complaint_id: int, data: VerifyResolutionRequest, db: Session = Depends(get_db)):
    """Citizen confirms or rejects municipal resolution work."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_status = complaint.status
    if data.confirmed:
        complaint.status = "RESOLVED"
        complaint.resolved_at = datetime.utcnow()
        complaint.citizen_feedback_rating = data.rating
        complaint.citizen_feedback_comment = data.feedback or "Citizen verified repair."
        action = "VERIFY_RESOLUTION"
        reason = f"Citizen confirmed satisfactory resolution (Rating: {data.rating}/5)"
    else:
        complaint.status = "REOPENED"
        complaint.citizen_feedback_comment = data.feedback or "Citizen reported issue unresolved."
        action = "REJECT_RESOLUTION"
        reason = f"Citizen rejected resolution: {data.feedback or 'Work unsatisfactory or incomplete'}"

    complaint.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)

    record_activity(
        db=db,
        complaint_id=complaint.id,
        action=action,
        actor="CITIZEN",
        reason=reason,
        old_status=old_status,
        new_status=complaint.status,
        metadata={"rating": data.rating, "feedback": data.feedback}
    )

    return format_complaint_response(complaint)


@router.post("/{complaint_id}/support", response_model=ComplaintResponse)
def support_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Citizen supports an existing nearby duplicate complaint, boosting its urgency."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.support_count += 1
    # Increment severity score slightly for repeat citizen reports (+2 pts up to 100)
    complaint.severity_score = min(100, complaint.severity_score + 2)
    if complaint.severity_score >= 76 and complaint.severity_level != "CRITICAL":
        complaint.severity_level = "CRITICAL"
        complaint.sla_hours = 4

    complaint.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)

    record_activity(
        db=db,
        complaint_id=complaint.id,
        action="SUPPORT_COMPLAINT",
        actor="CITIZEN",
        reason=f"Corroborating citizen confirmed and supported issue (Total supporters: {complaint.support_count})",
        old_status=complaint.status,
        new_status=complaint.status,
        metadata={"new_support_count": complaint.support_count, "new_severity": complaint.severity_score}
    )

    return format_complaint_response(complaint)
