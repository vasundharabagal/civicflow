from math import radians, sin, cos, sqrt, atan2
from datetime import datetime


def calculate_distance(lat1, lon1, lat2, lon2):

    earth_radius = 6371

    lat1, lon1, lat2, lon2 = map(
        radians,
        [lat1, lon1, lat2, lon2]
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return earth_radius * c


def calculate_time_score(time_a, time_b):

    time_a = datetime.fromisoformat(time_a)
    time_b = datetime.fromisoformat(time_b)

    hours = abs(
        (time_a - time_b).total_seconds()
    ) / 3600

    if hours >= 6:
        return 0

    return 1 - (hours / 6)


def calculate_text_similarity(text_a, text_b):

    synonyms = {
        "power": "electricity",
        "electric": "electricity",
        "outage": "electricity",
        "blackout": "electricity",

        "garbage": "waste",
        "trash": "waste",
        "rubbish": "waste",
        "dumped": "waste",

        "piling": "accumulating",
        "pile": "accumulating",
        "potholes": "pothole",
        "roads": "road",

        "shortage": "water",
        "supply": "water",
        "leakage": "leak"
    }

    words_a = text_a.lower().split()
    words_b = text_b.lower().split()

    words_a = {
        synonyms.get(word, word)
        for word in words_a
    }

    words_b = {
        synonyms.get(word, word)
        for word in words_b
    }

    if not words_a or not words_b:
        return 0

    common = words_a.intersection(words_b)
    total = words_a.union(words_b)

    return len(common) / len(total)


def calculate_confidence(a, b):

    # Category
    category_score = (
        1
        if a["category"].lower()
        == b["category"].lower()
        else 0
    )

    # Location
    distance = calculate_distance(
        a["latitude"],
        a["longitude"],
        b["latitude"],
        b["longitude"]
    )

    location_score = max(
        0,
        1 - (distance / 2)
    )

    # Time
    time_score = calculate_time_score(
        a["created_at"],
        b["created_at"]
    )

    # Description
    text_score = calculate_text_similarity(
        a["description"],
        b["description"]
    )

    confidence = (
        category_score * 25
        + location_score * 25
        + time_score * 20
        + text_score * 30
    )

    return round(confidence, 2)


def detect_area_incident(complaints):

    if not complaints:
        return {
            "incident_detected": False,
            "complaint_count": 0
        }

    related = [complaints[0]]

    for complaint in complaints[1:]:

        confidence = calculate_confidence(
            complaints[0],
            complaint
        )

        if confidence >= 60:
            related.append(complaint)

    if len(related) < 3:

        return {
            "incident_detected": False,
            "complaint_count": len(related)
        }

    categories = [
        c["category"]
        for c in related
    ]

    severities = [
        c.get("severity", "Medium")
        for c in related
    ]

    if "High" in severities:
        severity = "High"
    elif "Medium" in severities:
        severity = "Medium"
    else:
        severity = "Low"

    scores = []

    for complaint in related[1:]:

        scores.append(
            calculate_confidence(
                related[0],
                complaint
            )
        )

    average_confidence = (
        sum(scores) / len(scores)
        if scores
        else 100
    )

    return {
        "incident_detected": True,
        "complaint_count": len(related),
        "category": max(
            set(categories),
            key=categories.count
        ),
        "severity": severity,
        "incident_confidence": round(
            average_confidence,
            2
        ),
        "related_complaint_ids": [
            c["id"]
            for c in related
        ],
        "reason": [
            "Same civic issue category",
            "Complaints are geographically close",
            "Complaints occurred within a similar time window",
            "Complaint descriptions show similarity"
        ],
        "recommended_action":
            "Prioritize for departmental review"
    }
if __name__ == "__main__":
    print("CivicFlow AI Engine is working!")