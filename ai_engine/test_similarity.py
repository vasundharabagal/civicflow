from complaint_similarity import (
    calculate_similarity,
    are_descriptions_similar
)


complaints = [
    (
        "No electricity since morning",
        "Power outage since morning"
    ),
    (
        "Large pothole on the main road",
        "Road has a huge pothole"
    ),
    (
        "Garbage is piling up",
        "Waste is accumulating in the area"
    ),
    (
        "No water supply since morning",
        "Water shortage in our locality"
    ),
    (
        "No electricity in my area",
        "Garbage collection has stopped"
    )
]


print("\nCIVICFLOW COMPLAINT SIMILARITY TEST")
print("-----------------------------------")


for text_a, text_b in complaints:

    similarity = calculate_similarity(
        text_a,
        text_b
    )

    similar = are_descriptions_similar(
        text_a,
        text_b
    )

    print("\nComplaint A:", text_a)
    print("Complaint B:", text_b)
    print(f"Similarity: {similarity:.2f}")
    print("Related:", similar)