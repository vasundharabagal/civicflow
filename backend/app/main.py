import json
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.database import Base, engine, SessionLocal
from app.models.complaint import Complaint, ComplaintAction, DepartmentConfig
from app.api.complaints import router as complaints_router
from app.api.analysis import router as analysis_router
from app.api.incidents import router as incidents_router
from app.api.departments import router as departments_router, DEPARTMENT_LIST

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicFlow API",
    description="AI-Powered Smart Civic Issue Resolution Agent Backend",
    version="2.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(complaints_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")
app.include_router(departments_router, prefix="/api")


@app.on_event("startup")
def seed_initial_demo_data():
    """Seed initial demo and judge testing complaints if database is empty."""
    db = SessionLocal()
    try:
        # Seed departments
        if db.query(DepartmentConfig).count() == 0:
            for d in DEPARTMENT_LIST:
                db.add(DepartmentConfig(
                    code=d["code"],
                    name=d["name"],
                    category=d["category"],
                    contact_email=d["contact_email"],
                    head_officer=d["head_officer"],
                    active=True
                ))
            db.commit()

        # Seed realistic complaints if database has no complaints
        if db.query(Complaint).count() == 0:
            now = datetime.utcnow()

            sample_complaints = [
                {
                    "tracking_number": "CF-2026-10492",
                    "title": "Uncovered Manhole near School on Main Road",
                    "description": "Dangerous open manhole with missing cast-iron cover located 50 meters from St. Xavier School entrance on the busy roadway.",
                    "category": "Drainage & Sewerage",
                    "issue_type": "OPEN_MANHOLE",
                    "severity_score": 84,
                    "severity_level": "CRITICAL",
                    "department": "Drainage & Sewerage Department",
                    "department_code": "DSD",
                    "status": "SUBMITTED",
                    "latitude": 18.5204,
                    "longitude": 73.8567,
                    "address": "MG Road, Camp, Pune",
                    "landmark": "Opposite St. Xavier High School",
                    "is_sensitive_location": True,
                    "citizen_name": "Aarav Deshmukh",
                    "evidence_urls": ["https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?w=800&q=80"],
                    "evidence_observations": [
                        "Citizen reports uncovered drainage hole beside school pathway.",
                        "Visual evidence confirms missing safety cover exposing 6ft drop.",
                        "Direct vehicle and pedestrian exposure along public roadway."
                    ],
                    "severity_factors": [
                        {"factor": "Base Issue Risk", "points": 30, "max_points": 30, "detail": "Open manhole hazard"},
                        {"factor": "Immediate Safety Hazard", "points": 25, "max_points": 25, "detail": "Immediate drop/fall hazard"},
                        {"factor": "Population / Traffic Impact", "points": 15, "max_points": 15, "detail": "Dense pedestrian transit and school traffic"},
                        {"factor": "Infrastructure Importance", "points": 8, "max_points": 10, "detail": "Major municipal transit artery"},
                        {"factor": "Sensitive Location", "points": 6, "max_points": 10, "detail": "School zone active pedestrian area"}
                    ],
                    "sla_hours": 4,
                    "sla_deadline": now + timedelta(hours=4),
                    "municipal_receipt_id": "MCGM-2026-X8841"
                },
                {
                    "tracking_number": "CF-2026-10493",
                    "title": "Severe Pothole Cluster Disrupting Traffic",
                    "description": "Deep crater pothole in center lane causing vehicle undercarriage damage and traffic congestion.",
                    "category": "Roads & Public Works",
                    "issue_type": "POTHOLE",
                    "severity_score": 62,
                    "severity_level": "HIGH",
                    "department": "Roads & Public Works Department",
                    "department_code": "RPWD",
                    "status": "IN_PROGRESS",
                    "latitude": 18.5314,
                    "longitude": 73.8446,
                    "address": "Shivaji Road, Shivajinagar, Pune",
                    "landmark": "Near Central Bus Depot",
                    "is_sensitive_location": False,
                    "citizen_name": "Pooja Kadam",
                    "evidence_urls": ["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80"],
                    "evidence_observations": [
                        "Road crater exceeding 8 inches depth.",
                        "Traffic bottleneck formed on arterial commuter route."
                    ],
                    "severity_factors": [
                        {"factor": "Base Issue Risk", "points": 20, "max_points": 30, "detail": "Road depression"},
                        {"factor": "Immediate Safety Hazard", "points": 18, "max_points": 25, "detail": "Two-wheeler skid hazard"},
                        {"factor": "Population / Traffic Impact", "points": 14, "max_points": 15, "detail": "Arterial route traffic congestion"},
                        {"factor": "Infrastructure Importance", "points": 10, "max_points": 10, "detail": "Central bus corridor"}
                    ],
                    "sla_hours": 24,
                    "sla_deadline": now + timedelta(hours=20),
                    "municipal_receipt_id": "MCGM-2026-X8842",
                    "assigned_officer": "Er. Sunita Patil"
                },
                {
                    "tracking_number": "CF-2026-10494",
                    "title": "Overflowing Garbage Dump near Market",
                    "description": "Commercial waste dumped outside bins, attracting stray animals and blocking sidewalk.",
                    "category": "Solid Waste Management",
                    "issue_type": "GARBAGE",
                    "severity_score": 45,
                    "severity_level": "MEDIUM",
                    "department": "Solid Waste Management Department",
                    "department_code": "SWMD",
                    "status": "ACKNOWLEDGED",
                    "latitude": 16.7050,
                    "longitude": 74.2433,
                    "address": "Mahadwar Road, Kolhapur",
                    "landmark": "Near Bhavani Mandap",
                    "is_sensitive_location": False,
                    "citizen_name": "Vikram Shinde",
                    "evidence_urls": [],
                    "evidence_observations": [
                        "Uncollected domestic and market waste spilling onto pedestrian sidewalk."
                    ],
                    "severity_factors": [
                        {"factor": "Base Issue Risk", "points": 15, "max_points": 30, "detail": "Sanitation buildup"},
                        {"factor": "Immediate Safety Hazard", "points": 10, "max_points": 25, "detail": "Health hazard and stray animals"},
                        {"factor": "Population / Traffic Impact", "points": 12, "max_points": 15, "detail": "Market footfall area"},
                        {"factor": "Infrastructure Importance", "points": 8, "max_points": 10, "detail": "Bazaar street"}
                    ],
                    "sla_hours": 72,
                    "sla_deadline": now + timedelta(hours=68),
                    "municipal_receipt_id": "KMC-2026-X102"
                },
                {
                    "tracking_number": "CF-2026-10495",
                    "title": "High-Pressure Water Pipeline Leak",
                    "description": "Underground drinking water main ruptured, flooding street and wasting clean water.",
                    "category": "Water Supply",
                    "issue_type": "WATER_LEAKAGE",
                    "severity_score": 68,
                    "severity_level": "HIGH",
                    "department": "Water Supply Department",
                    "department_code": "WSD",
                    "status": "ASSIGNED",
                    "latitude": 18.9220,
                    "longitude": 72.8347,
                    "address": "Marine Drive, Churchgate, Mumbai",
                    "landmark": "Opposite Cricket Club of India",
                    "is_sensitive_location": False,
                    "citizen_name": "Rohan Mehta",
                    "evidence_urls": [],
                    "evidence_observations": [
                        "Drinking water pipeline gushing on main avenue."
                    ],
                    "severity_factors": [
                        {"factor": "Base Issue Risk", "points": 18, "max_points": 30, "detail": "Pressurized water line"},
                        {"factor": "Immediate Safety Hazard", "points": 20, "max_points": 25, "detail": "Flooding roadway"},
                        {"factor": "Population / Traffic Impact", "points": 15, "max_points": 15, "detail": "High-density transit artery"},
                        {"factor": "Infrastructure Importance", "points": 15, "max_points": 10, "detail": "Primary water supply conduit"}
                    ],
                    "sla_hours": 24,
                    "sla_deadline": now + timedelta(hours=18),
                    "municipal_receipt_id": "MCGM-2026-W901"
                }
            ]

            for s in sample_complaints:
                c = Complaint(
                    tracking_number=s["tracking_number"],
                    title=s["title"],
                    description=s["description"],
                    category=s["category"],
                    issue_type=s["issue_type"],
                    severity_score=s["severity_score"],
                    severity_level=s["severity_level"],
                    department=s["department"],
                    department_code=s["department_code"],
                    status=s["status"],
                    latitude=s["latitude"],
                    longitude=s["longitude"],
                    address=s["address"],
                    landmark=s["landmark"],
                    is_sensitive_location=s["is_sensitive_location"],
                    citizen_name=s["citizen_name"],
                    evidence_urls=json.dumps(s["evidence_urls"]),
                    evidence_observations=json.dumps(s["evidence_observations"]),
                    severity_factors=json.dumps(s["severity_factors"]),
                    sla_hours=s["sla_hours"],
                    sla_deadline=s["sla_deadline"],
                    municipal_receipt_id=s["municipal_receipt_id"],
                    assigned_officer=s.get("assigned_officer"),
                    created_at=now - timedelta(hours=1),
                    updated_at=now - timedelta(hours=1)
                )
                db.add(c)
                db.commit()
                db.refresh(c)

                # Add initial action log
                db.add(ComplaintAction(
                    complaint_id=c.id,
                    action="SUBMIT_COMPLAINT",
                    actor="CITIZEN",
                    timestamp=c.created_at,
                    reason="Initial citizen complaint lodged and registered",
                    old_status=None,
                    new_status="SUBMITTED",
                    metadata_json=json.dumps({"receipt": c.municipal_receipt_id})
                ))
                db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "project": "CivicFlow",
        "tagline": "Report. Route. Resolve.",
        "description": "AI-Powered Smart Civic Issue Resolution Agent API",
        "status": "healthy",
        "version": "2.0.0"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }