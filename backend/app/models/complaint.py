from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    tracking_number = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    issue_type = Column(String(64), nullable=False, index=True)
    severity_score = Column(Integer, default=50)
    severity_level = Column(String(32), default="MEDIUM", index=True)
    department = Column(String(128), nullable=False, index=True)
    department_code = Column(String(32), nullable=True)
    status = Column(String(64), default="SUBMITTED", index=True)

    # Location Telemetry
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=False)
    landmark = Column(String(255), nullable=True)
    is_sensitive_location = Column(Boolean, default=False)

    # Citizen details (private / guarded)
    citizen_name = Column(String(128), default="Citizen Reporter")
    citizen_phone = Column(String(32), nullable=True)
    citizen_email = Column(String(128), nullable=True)

    # Evidence & AI Grounding (Stored as JSON strings)
    evidence_urls = Column(Text, default="[]")
    evidence_observations = Column(Text, default="[]")
    severity_factors = Column(Text, default="[]")

    # Resolution Details
    resolution_evidence_urls = Column(Text, default="[]")
    resolution_notes = Column(Text, nullable=True)
    citizen_feedback_rating = Column(Integer, nullable=True)
    citizen_feedback_comment = Column(Text, nullable=True)

    # SLA, State & Escalation
    support_count = Column(Integer, default=1)
    sla_hours = Column(Integer, default=72)
    sla_deadline = Column(DateTime, nullable=True)
    followup_count = Column(Integer, default=0)
    escalation_level = Column(Integer, default=0)
    escalation_reason = Column(Text, nullable=True)
    municipal_receipt_id = Column(String(64), nullable=True)
    assigned_officer = Column(String(128), nullable=True)

    # Timestamps
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to immutable audit trail
    actions = relationship("ComplaintAction", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintAction.id")


class ComplaintAction(Base):
    """
    Immutable activity record capturing every AI agent, system, officer, or citizen action.
    """
    __tablename__ = "complaint_actions"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), index=True, nullable=False)
    action = Column(String(64), nullable=False)
    actor = Column(String(32), nullable=False)  # CITIZEN, AI_AGENT, SYSTEM, OFFICER, ADMIN
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    reason = Column(Text, nullable=True)
    evidence_references = Column(Text, default="[]")
    old_status = Column(String(64), nullable=True)
    new_status = Column(String(64), nullable=True)
    metadata_json = Column(Text, default="{}")

    complaint = relationship("Complaint", back_populates="actions")


class DepartmentConfig(Base):
    __tablename__ = "department_configs"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, nullable=False)
    name = Column(String(128), nullable=False)
    category = Column(String(100), nullable=False)
    contact_email = Column(String(128), nullable=False)
    head_officer = Column(String(128), default="Chief Municipal Engineer")
    active = Column(Boolean, default=True)
