from incident_confidence import calculate_incident_confidence


complaint_a = {
    "id": 1,
    "category": "Electricity",
    "description": "No electricity since morning",
    "latitude": 16.7050,
    "longitude": 74.2433,
    "created_at": "2026-09-20T10:00:00"
}


complaint_b = {
    "id": 2,
    "category": "Electricity",
    "description": "Power outage since morning",
    "latitude": 16.7060,
    "longitude": 74.2440,
    "created_at": "2026-09-20T11:00:00"
}


result = calculate_incident_confidence(
    complaint_a,
    complaint_b
)


print("\nCIVICFLOW INCIDENT CONFIDENCE")
print("-----------------------------------")

for key, value in result.items():
    print(f"{key}: {value}")