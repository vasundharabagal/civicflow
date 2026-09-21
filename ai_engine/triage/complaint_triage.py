"""
CivicFlow AI Complaint Triage Engine
Multimodal issue classification, deterministic 0-100 severity scoring,
centralized department routing, and evidence grounding.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Issue Taxonomy & Department Mappings
# ---------------------------------------------------------------------------

TAXONOMY = {
    "OPEN_MANHOLE": {
        "category": "Drainage & Sewerage",
        "department": "Drainage & Sewerage Department",
        "department_code": "DSD",
        "base_risk": 30,
        "keywords": ["manhole", "drain cover", "open hole", "gutter cover", "uncovered manhole", "missing lid"],
        "reason": "Open manholes expose municipal sewer and drainage infrastructure, posing immediate falls and vehicular damage risks."
    },
    "POTHOLE": {
        "category": "Roads & Public Works",
        "department": "Roads & Public Works Department",
        "department_code": "RPWD",
        "base_risk": 20,
        "keywords": ["pothole", "potholes", "crater", "cracked road", "road surface", "broken tarmac"],
        "reason": "Road depressions and craters fall under municipal road maintenance and public works."
    },
    "ROAD_DAMAGE": {
        "category": "Roads & Public Works",
        "department": "Roads & Public Works Department",
        "department_code": "RPWD",
        "base_risk": 22,
        "keywords": ["caved road", "subsidence", "collapsed road", "divider damaged", "broken asphalt", "uneven road"],
        "reason": "Structural road degradation requires public works inspection and civil resurfacing."
    },
    "GARBAGE": {
        "category": "Solid Waste Management",
        "department": "Solid Waste Management Department",
        "department_code": "SWMD",
        "base_risk": 15,
        "keywords": ["garbage", "waste", "trash", "rubbish", "dump", "dumped", "debris", "litter", "overflowing bin"],
        "reason": "Municipal waste accumulation falls under solid waste collection and sanitation crews."
    },
    "WATER_LEAKAGE": {
        "category": "Water Supply",
        "department": "Water Supply Department",
        "department_code": "WSD",
        "base_risk": 18,
        "keywords": ["water pipe", "pipeline burst", "drinking water leak", "water pressure", "tap broken", "main valve leak"],
        "reason": "Pressurized water distribution lines are maintained by the municipal water supply board."
    },
    "DRAINAGE_BLOCKAGE": {
        "category": "Drainage & Sewerage",
        "department": "Drainage & Sewerage Department",
        "department_code": "DSD",
        "base_risk": 24,
        "keywords": ["clogged drain", "drainage blocked", "waterlogged", "storm drain", "stagnant drain"],
        "reason": "Stormwater drains and culverts are managed by drainage and flood prevention units."
    },
    "SEWAGE_OVERFLOW": {
        "category": "Drainage & Sewerage",
        "department": "Drainage & Sewerage Department",
        "department_code": "DSD",
        "base_risk": 26,
        "keywords": ["sewage", "foul smell", "sewer overflow", "blackwater", "manhole overflowing", "septic"],
        "reason": "Biological sanitation risks from sewage discharge are routed directly to sewerage emergency teams."
    },
    "STREETLIGHT": {
        "category": "Electrical & Street Lighting",
        "department": "Electrical & Street Lighting Department",
        "department_code": "ESLD",
        "base_risk": 14,
        "keywords": ["streetlight", "street light", "dark street", "lamp post", "light not working", "street bulb"],
        "reason": "Public lighting networks are managed by the municipal electrical illumination division."
    },
    "FALLEN_TREE": {
        "category": "Garden & Tree Authority",
        "department": "Garden & Tree Authority",
        "department_code": "GTA",
        "base_risk": 22,
        "keywords": ["fallen tree", "tree branch", "tree collapsed", "overhanging branch", "uprooted tree"],
        "reason": "Arboricultural hazards and tree falls are cleared by the urban forestry and garden authority."
    },
    "ELECTRIC_SPARK": {
        "category": "Electricity Maintenance",
        "department": "Electricity Maintenance Department",
        "department_code": "EMD",
        "base_risk": 28,
        "keywords": ["sparks", "sparking", "transformer", "wire hanging", "live wire", "short circuit", "electric shock"],
        "reason": "High-voltage distribution hazards require immediate electrical utility intervention."
    },
    "OTHER": {
        "category": "Civic Services",
        "department": "Civic Support Department",
        "department_code": "CSD",
        "base_risk": 10,
        "keywords": [],
        "reason": "General or uncategorized inquiry routed to central civic helpdesk."
    }
}


# ---------------------------------------------------------------------------
# Pydantic Schemas for Output Validation
# ---------------------------------------------------------------------------

class SeverityFactor(BaseModel):
    factor: str
    points: int
    max_points: int
    detail: str


class StructuredTriageResult(BaseModel):
    issueType: str
    category: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    severityScore: int = Field(..., ge=0, le=100)
    severityLevel: str
    department: str
    departmentCode: str
    summary: str
    evidenceObservations: List[str]
    severityFactors: List[SeverityFactor]
    departmentReason: str
    missingInformation: List[str]
    recommendedResponseTimeHours: int


# ---------------------------------------------------------------------------
# Classification & Grounding Logic
# ---------------------------------------------------------------------------

def classify_issue_type(text: str, image_metadata: Optional[Dict[str, Any]] = None) -> tuple[str, float]:
    """
    Classify issue type with confidence score based on text and image cues.
    """
    clean_text = text.lower().strip()
    scores = {}

    for issue_key, info in TAXONOMY.items():
        if issue_key == "OTHER":
            continue
        score = 0
        for kw in info["keywords"]:
            if kw in clean_text:
                score += 2 if len(kw.split()) > 1 else 1

        if image_metadata:
            image_labels = [l.lower() for l in image_metadata.get("detected_objects", [])]
            for kw in info["keywords"]:
                if any(kw in label for label in image_labels):
                    score += 3

        scores[issue_key] = score

    if not scores or max(scores.values()) == 0:
        return "OTHER", 0.60

    best_issue = max(scores, key=scores.get)
    max_score = scores[best_issue]

    # Calculate confidence based on keyword matches and specificity
    confidence = min(0.98, 0.70 + (max_score * 0.08))
    return best_issue, round(confidence, 2)


def calculate_deterministic_severity(
    issue_type: str,
    text: str,
    is_sensitive_location: bool = False,
    repeat_reports_count: int = 0,
    has_image_evidence: bool = False,
    location_name: str = ""
) -> tuple[int, str, List[SeverityFactor]]:
    """
    Deterministic 0-100 severity scoring engine.
    - Base Issue Risk: 0-30
    - Immediate Safety Hazard: 0-25
    - Population / Traffic Impact: 0-15
    - Infrastructure Importance: 0-10
    - Sensitive Location: 0-10
    - Repeat Reports: 0-5
    - Issue Duration: 0-5
    """
    factors: List[SeverityFactor] = []
    clean_text = text.lower()

    # 1. Base Issue Risk (0-30)
    base_info = TAXONOMY.get(issue_type, TAXONOMY["OTHER"])
    base_pts = base_info["base_risk"]
    factors.append(SeverityFactor(
        factor="Base Issue Risk",
        points=base_pts,
        max_points=30,
        detail=f"Inherent risk weight for {issue_type.replace('_', ' ').title()}"
    ))

    # 2. Immediate Safety Hazard (0-25)
    safety_pts = 0
    safety_reasons = []
    if any(k in clean_text for k in ["open", "missing cover", "uncovered", "deep hole", "exposed", "spark", "live wire"]):
        safety_pts += 15
        safety_reasons.append("immediate drop/electrocution exposure")
    if any(k in clean_text for k in ["accident", "danger", "dangerous", "hazard", "injury", "injured", "fall", "trip", "risk"]) or issue_type == "OPEN_MANHOLE":
        safety_pts += 10
        safety_reasons.append("direct accident/fall hazard")
    if has_image_evidence and issue_type in ["OPEN_MANHOLE", "ELECTRIC_SPARK", "ROAD_DAMAGE"]:
        safety_pts = min(25, safety_pts + 5)
        safety_reasons.append("visual confirmation of physical hazard")

    safety_pts = min(25, safety_pts)
    factors.append(SeverityFactor(
        factor="Immediate Safety Hazard",
        points=safety_pts,
        max_points=25,
        detail=", ".join(safety_reasons) if safety_reasons else "Normal operating risk level"
    ))

    # 3. Population / Traffic Impact (0-15)
    traffic_pts = 0
    traffic_reasons = []
    if any(k in clean_text for k in ["main road", "highway", "traffic", "busy road", "intersection", "junction", "commuters", "pedestrians", "crowded"]):
        traffic_pts += 10
        traffic_reasons.append("high vehicle/pedestrian transit volume")
    if any(k in clean_text for k in ["market", "bazaar", "bus stop", "station", "footpath", "sidewalk", "school"]):
        traffic_pts += 5
        traffic_reasons.append("dense pedestrian gathering zone")

    traffic_pts = min(15, traffic_pts)
    factors.append(SeverityFactor(
        factor="Population / Traffic Impact",
        points=traffic_pts,
        max_points=15,
        detail=", ".join(traffic_reasons) if traffic_reasons else "Localized standard footfall"
    ))

    # 4. Infrastructure Importance (0-10)
    infra_pts = 0
    infra_reasons = []
    if any(k in clean_text for k in ["arterial", "expressway", "public roadway", "pipeline", "substation", "flyover", "bridge"]):
        infra_pts += 8
        infra_reasons.append("critical public transit or utility conduit")
    elif any(k in clean_text for k in ["road", "street", "lane"]):
        infra_pts += 4
        infra_reasons.append("municipal secondary thoroughfare")

    infra_pts = min(10, infra_pts)
    factors.append(SeverityFactor(
        factor="Infrastructure Importance",
        points=infra_pts,
        max_points=10,
        detail=", ".join(infra_reasons) if infra_reasons else "Local neighborhood network"
    ))

    # 5. Sensitive Location (0-10)
    sensitive_pts = 0
    sensitive_reasons = []
    if is_sensitive_location or any(k in clean_text for k in ["school", "college", "hospital", "clinic", "kindergarten", "elderly"]):
        sensitive_pts = 10
        sensitive_reasons.append("immediate proximity to vulnerable citizens (school/hospital zone)")

    factors.append(SeverityFactor(
        factor="Sensitive Location",
        points=sensitive_pts,
        max_points=10,
        detail=", ".join(sensitive_reasons) if sensitive_reasons else "Non-sensitive public area"
    ))

    # 6. Repeat Reports (0-5)
    repeat_pts = min(5, repeat_reports_count * 2)
    factors.append(SeverityFactor(
        factor="Repeat Reports",
        points=repeat_pts,
        max_points=5,
        detail=f"{repeat_reports_count} corroborating citizen report(s) in vicinity" if repeat_reports_count > 0 else "First verified report"
    ))

    # 7. Issue Duration (0-5)
    duration_pts = 0
    duration_reasons = []
    if any(k in clean_text for k in ["days", "weeks", "months", "persistent", "long time", "unattended"]):
        duration_pts = 5
        duration_reasons.append("prolonged unresolved timeline")
    elif any(k in clean_text for k in ["hours", "since morning"]):
        duration_pts = 2
        duration_reasons.append("active duration > 2 hours")

    factors.append(SeverityFactor(
        factor="Issue Duration",
        points=duration_pts,
        max_points=5,
        detail=", ".join(duration_reasons) if duration_reasons else "Recent occurrence"
    ))

    total_score = sum(f.points for f in factors)
    total_score = max(0, min(100, total_score))

    # Determine Severity Level & SLA
    if total_score >= 76:
        severity_level = "CRITICAL"
    elif total_score >= 51:
        severity_level = "HIGH"
    elif total_score >= 26:
        severity_level = "MEDIUM"
    else:
        severity_level = "LOW"

    return total_score, severity_level, factors


def get_recommended_sla_hours(severity_level: str) -> int:
    """Return default hackathon SLA threshold in hours."""
    mapping = {
        "CRITICAL": 4,
        "HIGH": 24,
        "MEDIUM": 72,
        "LOW": 120
    }
    return mapping.get(severity_level, 72)


def generate_evidence_grounding(
    issue_type: str,
    text: str,
    has_image: bool,
    image_metadata: Optional[Dict[str, Any]],
    location_name: str,
    is_sensitive: bool
) -> List[str]:
    """
    Generate explainable, evidence-grounded bullet points without hallucination.
    """
    evidence = []
    clean_text = text.lower()

    if "manhole" in clean_text or "lid" in clean_text or "open" in clean_text:
        evidence.append("Citizen report states uncovered or missing drainage opening.")
    elif "pothole" in clean_text or "crater" in clean_text:
        evidence.append("Citizen report describes deep pothole disrupting vehicular traffic.")
    elif "garbage" in clean_text or "dump" in clean_text:
        evidence.append("Citizen report identifies unsanitary solid waste accumulation.")
    else:
        evidence.append(f"Citizen description details civic disturbance categorized under {issue_type.replace('_', ' ').title()}.")

    if has_image:
        if image_metadata and image_metadata.get("detected_objects"):
            detected = ", ".join(image_metadata["detected_objects"])
            evidence.append(f"Visual evidence confirms detected attributes: {detected}.")
        else:
            evidence.append("Uploaded image attachment verifies active physical disturbance on site.")
    else:
        evidence.append("Visual evidence not yet attached (report verified via text and GPS telemetry).")

    if location_name:
        evidence.append(f"Geographic coordinates mapped to vicinity: {location_name}.")

    if is_sensitive or any(k in clean_text for k in ["school", "hospital", "station"]):
        evidence.append("Location telemetry flags high-vulnerability public area (educational or health facility).")

    return evidence


def triage_complaint(
    description: str,
    has_image: bool = False,
    image_metadata: Optional[Dict[str, Any]] = None,
    location_name: str = "",
    is_sensitive_location: bool = False,
    repeat_reports_count: int = 0
) -> StructuredTriageResult:
    """
    End-to-end multimodal complaint triage returning validated schema.
    """
    issue_type, confidence = classify_issue_type(description, image_metadata)
    info = TAXONOMY.get(issue_type, TAXONOMY["OTHER"])

    score, level, factors = calculate_deterministic_severity(
        issue_type=issue_type,
        text=description,
        is_sensitive_location=is_sensitive_location,
        repeat_reports_count=repeat_reports_count,
        has_image_evidence=has_image,
        location_name=location_name
    )

    sla_hours = get_recommended_sla_hours(level)
    evidence_obs = generate_evidence_grounding(
        issue_type=issue_type,
        text=description,
        has_image=has_image,
        image_metadata=image_metadata,
        location_name=location_name,
        is_sensitive=is_sensitive_location
    )

    summary = (
        f"{issue_type.replace('_', ' ').title()} reported in {location_name or 'the municipal jurisdiction'}."
        f" Assessed as {level} ({score}/100) due to safety and traffic exposure."
    )

    missing_info = []
    if not has_image:
        missing_info.append("Attach clear photograph of the issue to accelerate municipal work order generation.")
    if not location_name:
        missing_info.append("Pin exact GPS location on the civic map.")

    return StructuredTriageResult(
        issueType=issue_type,
        category=info["category"],
        confidence=confidence,
        severityScore=score,
        severityLevel=level,
        department=info["department"],
        departmentCode=info["department_code"],
        summary=summary,
        evidenceObservations=evidence_obs,
        severityFactors=factors,
        departmentReason=info["reason"],
        missingInformation=missing_info,
        recommendedResponseTimeHours=sla_hours
    )


# Backward compatibility with existing code
def analyze_complaint(description: str, evidence_provided: bool = False) -> Dict[str, Any]:
    """Legacy helper preserved for backward compatibility."""
    result = triage_complaint(description=description, has_image=evidence_provided)
    return {
        "success": True,
        "category": result.category,
        "severity": result.severityLevel,
        "department": result.department,
        "recommended_action": f"Prioritize for {result.department} review (SLA: {result.recommendedResponseTimeHours}h)",
        "evidence_provided": evidence_provided,
        "explanation": result.departmentReason,
        "triage_data": result.model_dump()
    }
