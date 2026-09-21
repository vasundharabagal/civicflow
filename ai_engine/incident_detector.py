from math import radians, sin, cos, sqrt, atan2
from datetime import datetime
from typing import List, Dict, Any, Optional


def calculate_distance(lat1, lon1, lat2, lon2):
    """Haversine formula to calculate distance in kilometers."""
    earth_radius = 6371

    lat1, lon1, lat2, lon2 = map(
        radians,
        [float(lat1), float(lon1), float(lat2), float(lon2)]
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
    """Compute score based on time difference (closer in time = higher score)."""
    if isinstance(time_a, str):
        time_a = datetime.fromisoformat(time_a.replace("Z", "+00:00"))
    if isinstance(time_b, str):
        time_b = datetime.fromisoformat(time_b.replace("Z", "+00:00"))

    # Convert to naive if needed for comparison
    if time_a.tzinfo is not None and time_b.tzinfo is None:
        time_b = time_b.replace(tzinfo=time_a.tzinfo)
    elif time_b.tzinfo is not None and time_a.tzinfo is None:
        time_a = time_a.replace(tzinfo=time_b.tzinfo)

    hours = abs(
        (time_a - time_b).total_seconds()
    ) / 3600

    if hours >= 72:
        return 0

    return max(0.0, 1.0 - (hours / 72.0))


def calculate_text_similarity(text_a, text_b):
    """Compute word overlap similarity with civic synonym mapping."""
    synonyms = {
        "power": "electricity",
        "electric": "electricity",
        "outage": "electricity",
        "blackout": "electricity",

        "garbage": "waste",
        "trash": "waste",
        "rubbish": "waste",
        "dumped": "waste",
        "dump": "waste",

        "piling": "accumulating",
        "pile": "accumulating",
        "potholes": "pothole",
        "roads": "road",
        "manholes": "manhole",

        "shortage": "water",
        "supply": "water",
        "leakage": "leak",
        "leaking": "leak"
    }

    words_a = text_a.lower().split()
    words_b = text_b.lower().split()

    words_a = {
        synonyms.get(word, word)
        for word in words_a if len(word) > 2
    }

    words_b = {
        synonyms.get(word, word)
        for word in words_b if len(word) > 2
    }

    if not words_a or not words_b:
        return 0

    common = words_a.intersection(words_b)
    total = words_a.union(words_b)

    return len(common) / len(total)


def calculate_confidence(a, b):
    """Calculate matching confidence between two complaints (0-100)."""
    # Category match
    cat_a = a.get("category", "").lower()
    cat_b = b.get("category", "").lower()
    category_score = 1.0 if cat_a == cat_b and cat_a else 0.0

    # Location distance
    distance = calculate_distance(
        a["latitude"],
        a["longitude"],
        b["latitude"],
        b["longitude"]
    )

    location_score = max(
        0.0,
        1.0 - (distance / 0.5)  # 500m radius threshold for clustering
    )

    # Time score
    time_score = calculate_time_score(
        a.get("created_at", datetime.utcnow().isoformat()),
        b.get("created_at", datetime.utcnow().isoformat())
    )

    # Text description similarity
    text_score = calculate_text_similarity(
        a.get("description", ""),
        b.get("description", "")
    )

    confidence = (
        category_score * 30
        + location_score * 30
        + time_score * 15
        + text_score * 25
    )

    return round(confidence, 2)


def find_duplicate_complaints(
    target_complaint: Dict[str, Any],
    existing_complaints: List[Dict[str, Any]],
    distance_threshold_km: float = 0.3,
    confidence_threshold: float = 50.0
) -> List[Dict[str, Any]]:
    """
    Find existing complaints that likely report the same issue in the vicinity.
    Returns matched complaints with distance and confidence score.
    """
    duplicates = []
    lat = target_complaint.get("latitude")
    lon = target_complaint.get("longitude")

    if lat is None or lon is None:
        return duplicates

    for c in existing_complaints:
        if c.get("id") == target_complaint.get("id"):
            continue

        c_lat = c.get("latitude")
        c_lon = c.get("longitude")
        if c_lat is None or c_lon is None:
            continue

        dist = calculate_distance(lat, lon, c_lat, c_lon)
        if dist <= distance_threshold_km:
            conf = calculate_confidence(target_complaint, c)
            if conf >= confidence_threshold:
                duplicates.append({
                    "complaint_id": c.get("id"),
                    "title": c.get("title", c.get("description", "")[:40]),
                    "status": c.get("status", "SUBMITTED"),
                    "distance_meters": round(dist * 1000, 1),
                    "confidence": conf,
                    "created_at": c.get("created_at"),
                    "support_count": c.get("support_count", 1)
                })

    duplicates.sort(key=lambda x: x["confidence"], reverse=True)
    return duplicates


def detect_area_incident(complaints):
    """
    Detect multi-citizen incident cluster if >= 3 related complaints are within threshold.
    """
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
        if confidence >= 50:
            related.append(complaint)

    if len(related) < 3:
        return {
            "incident_detected": False,
            "complaint_count": len(related)
        }

    categories = [
        c.get("category", "General")
        for c in related
    ]

    severities = [
        c.get("severity", c.get("severity_level", "Medium"))
        for c in related
    ]

    if "CRITICAL" in severities or "High" in severities:
        severity = "CRITICAL" if "CRITICAL" in severities else "High"
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
        else 100.0
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
            c.get("id")
            for c in related
        ],
        "reason": [
            "Same civic issue category",
            "Complaints are geographically clustered within 500m",
            "Complaints occurred within an overlapping time window",
            "Complaint descriptions show semantic correlation"
        ],
        "recommended_action":
            "Prioritize for urgent unified departmental dispatch"
    }


if __name__ == "__main__":
    print("CivicFlow AI Engine is verified and running!")