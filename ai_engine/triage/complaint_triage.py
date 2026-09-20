"""
CivicFlow AI Complaint Triage Engine

Analyzes a citizen complaint and determines:
- Category
- Severity
- Responsible department
- Recommended action
- Explanation
"""


CATEGORY_RULES = {
    "Electricity": [
        "electricity",
        "power",
        "outage",
        "blackout",
        "electric",
        "transformer",
        "pole",
        "voltage",
        "current",
    ],
    "Water": [
        "water",
        "leak",
        "leakage",
        "pipeline",
        "tap",
        "supply",
        "shortage",
        "drinking water",
        "sewage",
    ],
    "Roads": [
        "road",
        "pothole",
        "potholes",
        "street",
        "traffic",
        "bridge",
        "footpath",
        "sidewalk",
        "accident",
    ],
    "Sanitation": [
        "garbage",
        "waste",
        "trash",
        "rubbish",
        "dump",
        "dumped",
        "dirty",
        "cleaning",
        "drain",
        "smell",
        "sanitation",
    ],
}


DEPARTMENTS = {
    "Electricity": "Electricity Maintenance Department",
    "Water": "Water Supply Department",
    "Roads": "Roads & Public Works Department",
    "Sanitation": "Sanitation Department",
}


HIGH_SEVERITY_KEYWORDS = [
    "sparks",
    "sparking", 
    "emergency",
    "danger",
    "dangerous",
    "accident",
    "fire",
    "shock",
    "electrocution",
    "burst",
    "flood",
    "injured",
    "injury",
    "collapsed",
    "life threatening",
]


MEDIUM_SEVERITY_KEYWORDS = [
    "hours",
    "days",
    "blocked",
    "overflow",
    "major",
    "severe",
    "urgent",
    "long time",
]


def normalize_text(text):
    """Convert complaint text into a clean lowercase string."""
    return " ".join(text.lower().strip().split())


def classify_category(description):
    """
    Identify the most likely civic issue category
    based on keywords in the complaint.
    """

    text = normalize_text(description)

    scores = {}

    for category, keywords in CATEGORY_RULES.items():
        score = 0

        for keyword in keywords:
            if keyword in text:
                score += 1

        scores[category] = score

    best_category = max(scores, key=scores.get)

    if scores[best_category] == 0:
        return "Other"

    return best_category


def determine_severity(description):
    """
    Determine complaint severity using transparent rules.
    """

    text = normalize_text(description)

    for keyword in HIGH_SEVERITY_KEYWORDS:
        if keyword in text:
            return "High"

    for keyword in MEDIUM_SEVERITY_KEYWORDS:
        if keyword in text:
            return "Medium"

    return "Low"


def determine_department(category):
    """Map the issue category to the responsible department."""

    return DEPARTMENTS.get(
        category,
        "Civic Support Department"
    )


def determine_action(category, severity):
    """Generate a recommended action for the complaint."""

    if severity == "High":
        return "Prioritize for urgent departmental review"

    if severity == "Medium":
        return "Forward to the responsible department for timely resolution"

    if category == "Other":
        return "Route for manual civic support review"

    return "Forward to the responsible department"


def generate_explanation(category, severity):
    """Generate an explainable reason for the AI decision."""

    if category == "Other":
        return (
            "The complaint did not contain enough information "
            "to confidently map it to a supported civic category."
        )

    return (
        f"The complaint was classified as {category} based on "
        f"its description. Severity was assessed as {severity} "
        f"using the urgency and risk indicators detected in the text."
    )


def analyze_complaint(description, evidence_provided=False):
    """
    Main AI triage function.

    Parameters:
        description: Citizen's complaint text
        evidence_provided: Whether supporting evidence was attached

    Returns:
        Structured AI analysis dictionary
    """

    if not description or not description.strip():
        return {
            "success": False,
            "error": "Complaint description cannot be empty."
        }

    category = classify_category(description)
    severity = determine_severity(description)
    department = determine_department(category)
    action = determine_action(category, severity)
    explanation = generate_explanation(
        category,
        severity
    )

    return {
        "success": True,
        "category": category,
        "severity": severity,
        "department": department,
        "recommended_action": action,
        "evidence_provided": evidence_provided,
        "explanation": explanation,
    }


if __name__ == "__main__":

    test_complaint = (
        "There has been no electricity in our area "
        "for 4 hours and the transformer is making sparks."
    )

    result = analyze_complaint(
        test_complaint,
        evidence_provided=True
    )

    print("\nCIVICFLOW AI COMPLAINT TRIAGE")
    print("--------------------------------")

    for key, value in result.items():
        print(f"{key}: {value}")
