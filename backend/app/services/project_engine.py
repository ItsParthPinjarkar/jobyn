import re

ACTION_VERBS = [
    "developed", "built", "designed", "implemented",
    "optimized", "engineered", "deployed", "created", "trained",
]

COMPLEXITY_KEYWORDS = [
    "scalable", "distributed", "microservices", "real-time",
    "deep learning", "computer vision", "nlp", "api", "cloud",
    "pipeline", "automation", "end-to-end",
]


def calculate_project_score(resume_text: str) -> dict:
    """
    Score 0.0 – 1.0 based on:
      - Number of 'project' mentions   (max 0.30)
      - Action verb count              (max 0.30)
      - Technical complexity keywords  (max 0.40)
    """
    text = resume_text.lower()

    project_mentions = len(re.findall(r"\bproject\b", text))
    action_hits      = sum(1 for v in ACTION_VERBS if v in text)
    complexity_hits  = sum(1 for k in COMPLEXITY_KEYWORDS if k in text)

    project_score   = min(project_mentions * 0.10, 0.30)
    action_score    = min(action_hits      * 0.05, 0.30)
    complexity_score = min(complexity_hits * 0.05, 0.40)

    total = round(project_score + action_score + complexity_score, 4)
    total = min(total, 1.0)

    return {
        "project_score_raw":     total,
        "project_score_percent": int(total * 100),
    }
