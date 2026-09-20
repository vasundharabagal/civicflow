from incident_detector import detect_area_incident


def create_complaints(category, descriptions, start_lat, start_lon):
    complaints = []

    for i, description in enumerate(descriptions):
        complaints.append({
            "id": i + 1,
            "category": category,
            "description": description,
            "latitude": start_lat + (i * 0.001),
            "longitude": start_lon + (i * 0.001),
            "severity": "High" if i == 0 else "Medium",
            "created_at": f"2026-09-20T{10 + i}:00:00"
        })

    return complaints


test_cases = [
    {
        "category": "Electricity",
        "descriptions": [
            "No electricity in our area",
            "Power outage since morning",
            "Electricity has stopped",
            "Power cut in nearby area"
        ]
    },
    {
        "category": "Water",
        "descriptions": [
            "No water supply since morning",
            "Water supply stopped",
            "No water coming from the taps",
            "Entire area has water shortage"
        ]
    },
    {
        "category": "Roads",
        "descriptions": [
            "Large pothole on the main road",
            "Road is badly damaged",
            "Multiple potholes near the junction",
            "Road is unsafe for vehicles"
        ]
    },
    {
        "category": "Sanitation",
        "descriptions": [
            "Garbage has not been collected",
            "Garbage is piling up",
            "Waste dumped on the roadside",
            "Sanitation problem in the locality"
        ]
    }
]


for index, test in enumerate(test_cases):

    complaints = create_complaints(
        test["category"],
        test["descriptions"],
        16.7050 + index * 0.01,
        74.2433 + index * 0.01
    )

    result = detect_area_incident(complaints)

    print("\n======================================")
    print(f"TEST: {test['category']}")
    print("======================================")
    print(f"Incident detected: {result['incident_detected']}")
    print(f"Complaint count: {result['complaint_count']}")
    print(f"Category: {result.get('category')}")
    print(f"Severity: {result.get('severity')}")
    print(f"Related IDs: {result.get('related_complaint_ids')}")
    print(f"Recommended action: {result.get('recommended_action')}")