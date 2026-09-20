from incident_detector import detect_area_incident


complaints = [
    {
        "id": 101,
        "category": "Electricity",
        "description": "No electricity in our area since morning",
        "latitude": 16.7050,
        "longitude": 74.2433,
        "created_at": "2026-09-20T14:00:00",
        "severity": "High"
    },
    {
        "id": 102,
        "category": "Electricity",
        "description": "Power outage has affected our locality",
        "latitude": 16.7060,
        "longitude": 74.2440,
        "created_at": "2026-09-20T15:00:00",
        "severity": "Medium"
    },
    {
        "id": 103,
        "category": "Electricity",
        "description": "Electric supply is not available for several hours",
        "latitude": 16.7045,
        "longitude": 74.2428,
        "created_at": "2026-09-20T16:00:00",
        "severity": "High"
    },
    {
        "id": 104,
        "category": "Electricity",
        "description": "No power in our neighborhood",
        "latitude": 16.7055,
        "longitude": 74.2438,
        "created_at": "2026-09-20T16:30:00",
        "severity": "Medium"
    }
]


result = detect_area_incident(complaints)

print("\nCIVICFLOW AREA INCIDENT ANALYSIS")
print("--------------------------------")
print("Incident detected:", result["incident_detected"])
print("Category:", result.get("category"))
print("Affected complaints:", result.get("complaint_count"))
print("Severity:", result.get("severity"))
print("Confidence:", result.get("incident_confidence"), "%")
print("Related IDs:", result.get("related_complaint_ids"))

print("\nWhy was this detected?")
for reason in result.get("reason", []):
    print("-", reason)

print("\nRecommended action:")
print(result.get("recommended_action"))
