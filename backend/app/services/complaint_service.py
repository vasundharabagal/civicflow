import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.complaint import Complaint, ComplaintAction


# ---------------------------------------------------------------------------
# State Machine & Valid Transitions
# ---------------------------------------------------------------------------

VALID_STATUSES = {
    "DRAFT",
    "ANALYZING",
    "AWAITING_CONFIRMATION",
    "SUBMITTED",
    "ACKNOWLEDGED",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLUTION_REPORTED",
    "RESOLVED",
    "REOPENED",
    "FOLLOW_UP_PENDING",
    "ESCALATION_PENDING",
    "ESCALATED",
    "CLOSED"
}

ALLOWED_TRANSITIONS = {
    "DRAFT": ["ANALYZING", "SUBMITTED"],
    "ANALYZING": ["AWAITING_CONFIRMATION", "SUBMITTED"],
    "AWAITING_CONFIRMATION": ["SUBMITTED", "DRAFT"],
    "SUBMITTED": ["ACKNOWLEDGED", "ASSIGNED", "FOLLOW_UP_PENDING", "ESCALATED"],
    "ACKNOWLEDGED": ["ASSIGNED", "IN_PROGRESS", "FOLLOW_UP_PENDING", "ESCALATED"],
    "ASSIGNED": ["IN_PROGRESS", "FOLLOW_UP_PENDING", "ESCALATED"],
    "IN_PROGRESS": ["RESOLUTION_REPORTED", "FOLLOW_UP_PENDING", "ESCALATED"],
    "FOLLOW_UP_PENDING": ["ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "ESCALATED"],
    "ESCALATION_PENDING": ["ESCALATED", "IN_PROGRESS"],
    "ESCALATED": ["ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "RESOLUTION_REPORTED"],
    "RESOLUTION_REPORTED": ["RESOLVED", "REOPENED"],
    "REOPENED": ["ASSIGNED", "IN_PROGRESS", "ESCALATED"],
    "RESOLVED": ["CLOSED", "REOPENED"],
    "CLOSED": ["REOPENED"]
}


def is_valid_transition(current_status: str, new_status: str) -> bool:
    """Validate if transition between state machine states is legal."""
    if current_status == new_status:
        return True
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])
    return new_status in allowed


# ---------------------------------------------------------------------------
# Immutable Audit Trail Logger
# ---------------------------------------------------------------------------

def record_activity(
    db: Session,
    complaint_id: int,
    action: str,
    actor: str,
    reason: Optional[str] = None,
    evidence_references: Optional[List[str]] = None,
    old_status: Optional[str] = None,
    new_status: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> ComplaintAction:
    """Append an immutable audit entry to the complaint action history."""
    action_log = ComplaintAction(
        complaint_id=complaint_id,
        action=action,
        actor=actor,
        timestamp=datetime.utcnow(),
        reason=reason,
        evidence_references=json.dumps(evidence_references or []),
        old_status=old_status,
        new_status=new_status,
        metadata_json=json.dumps(metadata or {})
    )
    db.add(action_log)
    db.commit()
    db.refresh(action_log)
    return action_log


# ---------------------------------------------------------------------------
# SLA & Escalation Engine
# ---------------------------------------------------------------------------

SEVERITY_SLA_HOURS = {
    "CRITICAL": 4,
    "HIGH": 24,
    "MEDIUM": 72,
    "LOW": 120
}


def calculate_sla_deadline(created_at: datetime, sla_hours: int) -> datetime:
    """Calculate SLA target deadline timestamp."""
    return created_at + timedelta(hours=sla_hours)


def get_sla_metrics(complaint: Complaint) -> Dict[str, Any]:
    """Calculate remaining seconds and whether SLA is breached."""
    if not complaint.sla_deadline:
        deadline = calculate_sla_deadline(complaint.created_at, complaint.sla_hours)
    else:
        deadline = complaint.sla_deadline

    now = datetime.utcnow()
    remaining = (deadline - now).total_seconds()
    breached = remaining < 0 and complaint.status not in ["RESOLVED", "CLOSED"]

    return {
        "deadline": deadline,
        "remaining_seconds": int(remaining),
        "breached": breached
    }


def trigger_automatic_followup(
    db: Session,
    complaint: Complaint,
    actor: str = "AI_AGENT",
    reason: str = "SLA milestone reached without authority acknowledgment"
) -> Complaint:
    """
    Automated agent sends high-priority follow-up to responsible municipal authority.
    If 3 follow-ups have been issued without response, automatically escalates!
    """
    complaint.followup_count += 1
    old_status = complaint.status

    if complaint.followup_count >= 3 and complaint.status not in ["RESOLVED", "CLOSED"]:
        return trigger_escalation(
            db=db,
            complaint=complaint,
            reason=f"Multiple automated follow-ups ({complaint.followup_count}) ignored by authority. Automatic escalation triggered.",
            escalation_level=complaint.escalation_level + 1,
            actor="SYSTEM"
        )

    # Transition to FOLLOW_UP_PENDING if currently in SUBMITTED
    if complaint.status == "SUBMITTED":
        complaint.status = "FOLLOW_UP_PENDING"

    record_activity(
        db=db,
        complaint_id=complaint.id,
        action="SEND_FOLLOW_UP",
        actor=actor,
        reason=reason,
        old_status=old_status,
        new_status=complaint.status,
        metadata={"followup_sequence": complaint.followup_count}
    )

    db.commit()
    db.refresh(complaint)
    return complaint


def trigger_escalation(
    db: Session,
    complaint: Complaint,
    reason: str,
    escalation_level: int = 1,
    actor: str = "AI_AGENT"
) -> Complaint:
    """
    Escalate complaint to senior municipal authority (Executive Engineer / Municipal Commissioner).
    """
    old_status = complaint.status
    complaint.status = "ESCALATED"
    complaint.escalation_level = max(complaint.escalation_level + 1, escalation_level)
    complaint.escalation_reason = reason

    authority_title = "Ward Executive Engineer" if complaint.escalation_level == 1 else "Additional Municipal Commissioner"

    record_activity(
        db=db,
        complaint_id=complaint.id,
        action="ESCALATE_COMPLAINT",
        actor=actor,
        reason=f"Escalated to {authority_title}: {reason}",
        old_status=old_status,
        new_status="ESCALATED",
        metadata={
            "escalation_level": complaint.escalation_level,
            "escalation_authority": authority_title
        }
    )

    db.commit()
    db.refresh(complaint)
    return complaint


# ---------------------------------------------------------------------------
# Demo Municipal Gateway Adapter
# ---------------------------------------------------------------------------

class AuthorityAdapter:
    """Abstract interface for municipal authority gateway integration."""
    def submit_complaint(self, complaint_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def get_status(self, receipt_id: str) -> Dict[str, Any]:
        raise NotImplementedError

    def send_follow_up(self, receipt_id: str, reason: str) -> Dict[str, Any]:
        raise NotImplementedError

    def escalate_complaint(self, receipt_id: str, reason: str) -> Dict[str, Any]:
        raise NotImplementedError

    def report_resolution(self, receipt_id: str, evidence: List[str]) -> Dict[str, Any]:
        raise NotImplementedError


class MockMunicipalAdapter(AuthorityAdapter):
    """
    Realistic simulated authority gateway labeled as 'Demo Municipal Gateway'.
    Generates realistic municipal acknowledgment receipts and tracking payloads.
    """
    def submit_complaint(self, complaint_data: Dict[str, Any]) -> Dict[str, Any]:
        import random
        receipt_no = f"MCGM-2026-X{random.randint(1000, 9999)}"
        return {
            "gateway": "Demo Municipal Gateway (Simulated Authority Integration)",
            "receipt_id": receipt_no,
            "status": "QUEUED_IN_DISPATCH",
            "department": complaint_data.get("department", "Municipal Works"),
            "timestamp": datetime.utcnow().isoformat(),
            "message": f"Successfully registered into Municipal Dispatch System under receipt #{receipt_no}."
        }

    def get_status(self, receipt_id: str) -> Dict[str, Any]:
        return {
            "gateway": "Demo Municipal Gateway (Simulated Authority Integration)",
            "receipt_id": receipt_id,
            "department_status": "OFFICER_REVIEW",
            "timestamp": datetime.utcnow().isoformat()
        }

    def send_follow_up(self, receipt_id: str, reason: str) -> Dict[str, Any]:
        return {
            "gateway": "Demo Municipal Gateway (Simulated Authority Integration)",
            "receipt_id": receipt_id,
            "action": "FOLLOW_UP_RECORDED",
            "response": "Automated reminder prioritized on departmental duty officer terminal.",
            "timestamp": datetime.utcnow().isoformat()
        }

    def escalate_complaint(self, receipt_id: str, reason: str) -> Dict[str, Any]:
        return {
            "gateway": "Demo Municipal Gateway (Simulated Authority Integration)",
            "receipt_id": receipt_id,
            "action": "ESCALATION_FILED",
            "response": "Case dossier forwarded to Ward Executive Engineer.",
            "timestamp": datetime.utcnow().isoformat()
        }

    def report_resolution(self, receipt_id: str, evidence: List[str]) -> Dict[str, Any]:
        return {
            "gateway": "Demo Municipal Gateway (Simulated Authority Integration)",
            "receipt_id": receipt_id,
            "action": "WORK_COMPLETION_FILED",
            "evidence_count": len(evidence),
            "timestamp": datetime.utcnow().isoformat()
        }


# Singleton instance of MockMunicipalAdapter
municipal_gateway = MockMunicipalAdapter()
