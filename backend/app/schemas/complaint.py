from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class SeverityFactorSchema(BaseModel):
    factor: str
    points: int
    max_points: int
    detail: str


class ComplaintActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    complaint_id: int
    action: str
    actor: str
    timestamp: datetime
    reason: Optional[str] = None
    evidence_references: Optional[List[str]] = []
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = {}


class ComplaintCreate(BaseModel):
    title: Optional[str] = None
    description: str
    category: str
    issue_type: str
    severity_score: int = Field(default=50, ge=0, le=100)
    severity_level: str = "MEDIUM"
    department: str
    department_code: Optional[str] = None
    latitude: float
    longitude: float
    address: str
    landmark: Optional[str] = None
    is_sensitive_location: bool = False
    citizen_name: Optional[str] = "Citizen Reporter"
    citizen_phone: Optional[str] = None
    citizen_email: Optional[str] = None
    evidence_urls: List[str] = []
    evidence_observations: List[str] = []
    severity_factors: List[SeverityFactorSchema] = []


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tracking_number: str
    title: str
    description: str
    category: str
    issue_type: str
    severity_score: int
    severity_level: str
    department: str
    department_code: Optional[str] = None
    status: str
    latitude: float
    longitude: float
    address: str
    landmark: Optional[str] = None
    is_sensitive_location: bool
    citizen_name: Optional[str] = "Citizen Reporter"
    evidence_urls: List[str] = []
    evidence_observations: List[str] = []
    severity_factors: List[Dict[str, Any]] = []
    resolution_evidence_urls: List[str] = []
    resolution_notes: Optional[str] = None
    citizen_feedback_rating: Optional[int] = None
    citizen_feedback_comment: Optional[str] = None
    support_count: int
    sla_hours: int
    sla_deadline: Optional[datetime] = None
    sla_remaining_seconds: Optional[int] = None
    sla_breached: bool = False
    followup_count: int
    escalation_level: int
    escalation_reason: Optional[str] = None
    municipal_receipt_id: Optional[str] = None
    assigned_officer: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    actions: List[ComplaintActionResponse] = []


class StatusTransitionRequest(BaseModel):
    new_status: str
    actor: str = "OFFICER"
    reason: Optional[str] = None
    officer_name: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolution_evidence_urls: List[str] = []


class AIAnalysisRequest(BaseModel):
    description: str
    has_image: bool = False
    image_metadata: Optional[Dict[str, Any]] = None
    location_name: Optional[str] = ""
    is_sensitive_location: bool = False
    repeat_reports_count: int = 0


class AIAnalysisResponse(BaseModel):
    issueType: str
    category: str
    confidence: float
    severityScore: int
    severityLevel: str
    department: str
    departmentCode: str
    summary: str
    evidenceObservations: List[str]
    severityFactors: List[SeverityFactorSchema]
    departmentReason: str
    missingInformation: List[str]
    recommendedResponseTimeHours: int


class FollowUpRequest(BaseModel):
    actor: str = "AI_AGENT"
    reason: Optional[str] = "SLA milestone exceeded without authority acknowledgment"


class EscalateRequest(BaseModel):
    actor: str = "AI_AGENT"
    reason: str
    escalation_level: int = 1


class VerifyResolutionRequest(BaseModel):
    confirmed: bool
    rating: Optional[int] = Field(default=5, ge=1, le=5)
    feedback: Optional[str] = None


class DuplicateCheckRequest(BaseModel):
    description: str
    category: str
    latitude: float
    longitude: float


class AnalyticsSummary(BaseModel):
    total_complaints: int
    open_complaints: int
    in_progress_complaints: int
    resolved_complaints: int
    escalated_complaints: int
    sla_compliance_rate_pct: float
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    department_stats: Dict[str, int]
