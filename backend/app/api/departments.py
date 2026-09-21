from fastapi import APIRouter
from typing import Dict, Any, List

router = APIRouter(prefix="/departments", tags=["Departments"])

DEPARTMENT_LIST = [
    {
        "code": "DSD",
        "name": "Drainage & Sewerage Department",
        "category": "Drainage & Sewerage",
        "contact_email": "drainage-alert@civicflow.gov",
        "head_officer": "Er. Rajesh Kulkarni (Executive Engineer)",
        "sla_hours": {"CRITICAL": 4, "HIGH": 24, "MEDIUM": 72, "LOW": 120},
        "supported_issues": ["OPEN_MANHOLE", "DRAINAGE_BLOCKAGE", "SEWAGE_OVERFLOW"]
    },
    {
        "code": "RPWD",
        "name": "Roads & Public Works Department",
        "category": "Roads & Public Works",
        "contact_email": "roads-works@civicflow.gov",
        "head_officer": "Er. Sunita Patil (Superintending Engineer)",
        "sla_hours": {"CRITICAL": 4, "HIGH": 24, "MEDIUM": 72, "LOW": 120},
        "supported_issues": ["POTHOLE", "ROAD_DAMAGE"]
    },
    {
        "code": "SWMD",
        "name": "Solid Waste Management Department",
        "category": "Solid Waste Management",
        "contact_email": "sanitation@civicflow.gov",
        "head_officer": "Shri Arvind Shinde (Chief Sanitation Officer)",
        "sla_hours": {"CRITICAL": 6, "HIGH": 24, "MEDIUM": 48, "LOW": 96},
        "supported_issues": ["GARBAGE"]
    },
    {
        "code": "WSD",
        "name": "Water Supply Department",
        "category": "Water Supply",
        "contact_email": "water-helpline@civicflow.gov",
        "head_officer": "Er. Meena Deshmukh (Water Works Superintendent)",
        "sla_hours": {"CRITICAL": 4, "HIGH": 12, "MEDIUM": 48, "LOW": 72},
        "supported_issues": ["WATER_LEAKAGE"]
    },
    {
        "code": "ESLD",
        "name": "Electrical & Street Lighting Department",
        "category": "Electrical & Street Lighting",
        "contact_email": "electrical@civicflow.gov",
        "head_officer": "Er. Deepak Jadhav (Divisional Engineer)",
        "sla_hours": {"CRITICAL": 4, "HIGH": 24, "MEDIUM": 72, "LOW": 120},
        "supported_issues": ["STREETLIGHT", "ELECTRIC_SPARK"]
    },
    {
        "code": "GTA",
        "name": "Garden & Tree Authority",
        "category": "Garden & Tree Authority",
        "contact_email": "gardens@civicflow.gov",
        "head_officer": "Shri Prakash Joshi (Horticulture Officer)",
        "sla_hours": {"CRITICAL": 4, "HIGH": 24, "MEDIUM": 72, "LOW": 120},
        "supported_issues": ["FALLEN_TREE"]
    }
]


@router.get("", response_model=List[Dict[str, Any]])
def list_departments():
    """Retrieve all registered municipal departments and SLA rules."""
    return DEPARTMENT_LIST
