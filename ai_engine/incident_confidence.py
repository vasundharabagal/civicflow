from datetime import datetime

from incident_detector import calculate_distance
from complaint_similarity import calculate_similarity


def calculate_time_score(time_a, time_b, max_hours=6):
    """
    Convert time difference into a score between 0 and 1.
    """

    time_a = datetime.fromisoformat(time_a)
    time_b = datetime.fromisoformat(time_b)

    difference_hours = abs(
        (time_a - time_b).total_seconds()
    ) / 3600

    if difference_hours >= max_hours:
        return 0.0

    return 1 - (difference_hours / max_hours)


def calculate_location_score(
    lat1,
    lon1,
    lat2,
    lon2,
    max_distance_km=2
):
    """
    Convert geographical distance into a score between 0 and 1.
    """

    distance = calculate_distance(
        lat1,
        lon1,
        lat2,
        lon2
    )

    if distance >= max_distance_km:
        return 0.0

    return 1 - (distance / max_distance_km)


def calculate_incident_confidence(
    complaint_a,
    complaint_b
):
    """
    Calculate an explainable incident confidence score.

    Weighting:
    Category       = 25%
    Location       = 25%
    Time           = 20%
    Description    = 30%
    """

    # Category score
    category_score = (
        1.0
        if complaint_a["category"].lower()
        == complaint_b["category"].lower()
        else 0.0
    )

    # Location score
    location_score = calculate_location_score(
        complaint_a["latitude"],
        complaint_a["longitude"],
        complaint_b["latitude"],
        complaint_b["longitude"]
    )

    # Time score
    time_score = calculate_time_score(
        complaint_a["created_at"],
        complaint_b["created_at"]
    )

    # Description similarity
    description_score = calculate_similarity(
        complaint_a["description"],
        complaint_b["description"]
    )

    # Weighted confidence
    confidence = (
        category_score * 0.25
        + location_score * 0.25
        + time_score * 0.20
        + description_score * 0.30
    )

    return {
        "confidence": round(confidence * 100, 2),
        "category_score": round(category_score * 100, 2),
        "location_score": round(location_score * 100, 2),
        "time_score": round(time_score * 100, 2),
        "description_score": round(description_score * 100, 2)
    }