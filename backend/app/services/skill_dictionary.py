"""
skill_dictionary.py — config-driven skill extraction with fuzzy matching.

Loads canonical skill → synonym list from config/skills.json at startup.
Supports exact regex match + edit-distance fuzzy matching for typos.
"""

import re
from app.core.config_loader import load_skills

# ── Load once at startup (module-level cache) ──────────────────────────────────
_SKILL_DICT: dict = load_skills()

# Pre-compile regex patterns for each synonym (10× faster than recompiling each call)
_SKILL_PATTERNS: list[tuple[str, re.Pattern]] = []
for _canonical, _synonyms in _SKILL_DICT.items():
    for _synonym in _synonyms:
        _SKILL_PATTERNS.append(
            (_canonical, re.compile(r"\b" + re.escape(_synonym) + r"\b", re.IGNORECASE))
        )

# Build reverse lookup: any synonym → canonical name (for normalisation)
_SYNONYM_TO_CANONICAL: dict[str, str] = {}
for _canonical, _synonyms in _SKILL_DICT.items():
    for _syn in _synonyms:
        _SYNONYM_TO_CANONICAL[_syn.lower()] = _canonical
    _SYNONYM_TO_CANONICAL[_canonical.lower()] = _canonical

# ── Category mapping (structural, not business config) ─────────────────────────
_SKILL_CATEGORIES: dict[str, set] = {
    "programming": {
        "python", "javascript", "typescript", "java", "c++", "c", "c#",
        "golang", "rust", "kotlin", "swift", "php", "ruby", "scala",
        "matlab", "r", "dart",
    },
    "ml_ai": {
        "machine learning", "deep learning", "tensorflow", "pytorch",
        "scikit-learn", "opencv", "nlp", "computer vision", "transformers",
        "onnx", "mlops", "spark", "data engineering", "data analysis",
        "generative ai", "llm", "prompt engineering", "langchain",
        "vector databases", "rag",
    },
    "backend": {
        "fastapi", "flask", "django", "node.js", "express", "spring boot",
        "nestjs", "api", "rest", "grpc", "microservices",
    },
    "frontend": {
        "react", "next.js", "angular", "vue", "svelte", "html", "css",
        "tailwind", "bootstrap", "redux", "graphql", "figma", "webpack",
    },
    "database": {
        "sql", "postgresql", "mongodb", "firebase", "supabase", "redis",
        "elasticsearch", "dynamodb", "cassandra",
    },
    "tools": {
        "git", "docker", "kubernetes", "linux", "bash", "aws", "azure",
        "gcp", "terraform", "ansible", "jenkins", "prometheus", "nginx",
        "ci/cd",
    },
    "cs_fundamentals": {
        "dsa", "system design", "testing", "oops", "statistics", "agile",
        "cybersecurity", "cloud computing",
    },
}


def _levenshtein(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            cost = 0 if c1 == c2 else 1
            curr_row.append(min(curr_row[j] + 1, prev_row[j + 1] + 1, prev_row[j] + cost))
        prev_row = curr_row
    return prev_row[-1]


def normalize_skill(skill_name: str) -> str:
    """Map any skill string to its canonical form. Returns original if unknown."""
    lowered = skill_name.strip().lower()
    if lowered in _SYNONYM_TO_CANONICAL:
        return _SYNONYM_TO_CANONICAL[lowered]
    # Fuzzy match: find closest synonym within edit distance ≤ 2
    best_match = None
    best_dist = 3  # threshold
    for syn, canonical in _SYNONYM_TO_CANONICAL.items():
        if abs(len(syn) - len(lowered)) > 2:
            continue  # Skip if length diff too large (optimisation)
        dist = _levenshtein(lowered, syn)
        if dist < best_dist:
            best_dist = dist
            best_match = canonical
    return best_match if best_match else skill_name.lower()


def extract_skills(text: str) -> list:
    """
    Return canonical skill names found in *text*.

    - Case-insensitive via pre-compiled patterns
    - Whole-word boundary matching
    - Synonyms resolved to canonical name from skills.json
    """
    text_lower = text.lower()
    found: set = set()
    for canonical, pattern in _SKILL_PATTERNS:
        if canonical not in found and pattern.search(text_lower):
            found.add(canonical)
    return list(found)


def get_skill_synonyms(canonical: str) -> list[str]:
    """Return the canonical name plus all its synonyms (for locating a skill's
    mentions in resume text). Used by the proficiency inference engine."""
    syns = _SKILL_DICT.get(canonical, [])
    return list({canonical, *syns})


def get_skill_category(skill: str) -> str:
    canonical = normalize_skill(skill)
    for category, skill_set in _SKILL_CATEGORIES.items():
        if canonical in skill_set:
            return category
    return "other"


# ── Public alias for _SKILL_CATEGORIES (used by jd_matcher) ───────────────────
SKILL_CATEGORIES = _SKILL_CATEGORIES

# ── Backward-compat alias (used by jd_matcher) ────────────────────────────────
def extract_skills_from_text(text: str) -> dict:
    skills = extract_skills(text)
    categories: dict = {}
    for skill in skills:
        cat = get_skill_category(skill)
        categories.setdefault(cat, []).append(skill)
    return {"skills": skills, "categories": categories, "skill_count": len(skills)}
