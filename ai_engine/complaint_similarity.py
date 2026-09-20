import re


# Common words that do not add much meaning
STOP_WORDS = {
    "the", "a", "an", "is", "are", "in", "on",
    "of", "to", "our", "my", "has", "have",
    "since", "from", "and", "for", "this",
    "there", "been", "with"
}


# Basic civic-issue vocabulary normalization
SYNONYMS = {
    "power": "electricity",
    "electric": "electricity",
    "outage": "electricity",
    "blackout": "electricity",
    "current": "electricity",

    "water": "water",
    "supply": "water",
    "shortage": "water",
    "leakage": "leak",

    "garbage": "waste",
    "trash": "waste",
    "rubbish": "waste",
    "dumped": "waste",

    "pothole": "road",
    "potholes": "road",
    "damaged": "road",
    "roads": "road"
}


def normalize_text(text):
    """
    Convert complaint text into meaningful normalized words.
    """

    text = text.lower()

    # Keep only words
    words = re.findall(r"[a-z]+", text)

    normalized_words = []

    for word in words:

        if word in STOP_WORDS:
            continue

        word = SYNONYMS.get(word, word)

        normalized_words.append(word)

    return set(normalized_words)


def calculate_similarity(text_a, text_b):
    """
    Calculate simple explainable similarity between
    two complaint descriptions.

    Returns a value between 0 and 1.
    """

    words_a = normalize_text(text_a)
    words_b = normalize_text(text_b)

    if not words_a or not words_b:
        return 0.0

    intersection = words_a.intersection(words_b)
    union = words_a.union(words_b)

    return len(intersection) / len(union)


def are_descriptions_similar(
    text_a,
    text_b,
    threshold=0.25
):
    """
    Determine whether two complaint descriptions
    are sufficiently similar.
    """

    similarity = calculate_similarity(
        text_a,
        text_b
    )

    return similarity >= threshold