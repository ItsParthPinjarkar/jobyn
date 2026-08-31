import re

SECTION_HEADINGS = ["skills", "projects", "education", "experience"]


def calculate_ats_score(resume_text: str) -> dict:
    """
    ATS score 0.0 – 1.0:
      - Section headings present  (max 0.60 → 0.15 per heading)
      - Email present             (0.20)
      - Phone number present      (0.20)
    """
    text = resume_text.lower()

    heading_hits = sum(1 for h in SECTION_HEADINGS if h in text)
    section_score = min(heading_hits * 0.15, 0.60)

    email_present = bool(re.search(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", text))
    phone_present = bool(re.search(r"\b\d{10}\b|\+\d{1,3}[\s-]\d{5,}", text))

    contact_score = (0.20 if email_present else 0) + (0.20 if phone_present else 0)

    total = round(min(section_score + contact_score, 1.0), 4)

    return {
        "ats_score_raw":     total,
        "ats_score_percent": int(total * 100),
    }
