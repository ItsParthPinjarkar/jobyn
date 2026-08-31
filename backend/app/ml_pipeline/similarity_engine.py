"""
similarity_engine.py — cosine-similarity based role prediction.

No ML libraries. Uses binary skill vectors + manual cosine math.
Explainable, deterministic, stable on small datasets.
"""

import math
from collections import defaultdict


# ── Vector helpers ─────────────────────────────────────────────────────────────

def build_vocabulary(records: list[dict]) -> list[str]:
    """Global sorted skill vocabulary across all records."""
    vocab: set = set()
    for r in records:
        vocab.update(r["detected_skills"])
    return sorted(vocab)


def encode(skills: list[str], vocab: list[str]) -> list[int]:
    """Binary-encode a skill list against the vocabulary."""
    skill_set = set(s.lower().strip() for s in skills)
    return [1 if v in skill_set else 0 for v in vocab]


def cosine_similarity(v1: list[int], v2: list[int]) -> float:
    """Compute cosine similarity between two binary vectors."""
    dot   = sum(a * b for a, b in zip(v1, v2))
    mag1  = math.sqrt(sum(a ** 2 for a in v1))
    mag2  = math.sqrt(sum(b ** 2 for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


# ── Role prediction ────────────────────────────────────────────────────────────

def predict_role(
    skills:  list[str],
    records: list[dict],
    top_k:   int = 3,
) -> dict:
    """
    Predict the most suitable role for a given skill set.

    Algorithm:
      1. Build global vocabulary from all records.
      2. Encode query skill vector.
      3. Compute cosine similarity with every stored resume vector.
      4. Take top-k matches; weighted-vote on role.
      5. Confidence = average similarity of top-k.

    Returns:
        {
            "predicted_role": str,
            "confidence":     float (0–1),
            "reasoning":      str,
            "top_matches":    [{similarity, role, score}]
        }
    """
    if not records:
        return {
            "predicted_role": None,
            "confidence":     0.0,
            "reasoning":      "No historical data available yet.",
            "top_matches":    [],
        }

    vocab      = build_vocabulary(records)
    query_vec  = encode(skills, vocab)

    # Compute similarities
    scored: list[tuple] = []
    for r in records:
        r_vec = encode(r["detected_skills"], vocab)
        sim   = cosine_similarity(query_vec, r_vec)
        scored.append((sim, r["role"], r["final_score"]))

    scored.sort(key=lambda x: -x[0])
    top_matches = scored[:top_k]

    # Weighted role vote — consider both similarity AND success (final_score)
    role_weight: dict = defaultdict(float)
    for sim, role, score in top_matches:
        # We value similarity but boost it by the success score
        # (normalized success score 0-1)
        role_weight[role] += sim * (score / 100.0)

    if not role_weight or all(s == 0 for s in role_weight.values()):
        return {
            "predicted_role": None,
            "confidence":     0.0,
            "reasoning":      "No similar resumes found in the dataset.",
            "top_matches":    [],
        }

    predicted_role = max(role_weight, key=role_weight.get)  # type: ignore[arg-type]
    confidence     = round(
        sum(s for s, _, _ in top_matches) / len(top_matches), 4
    )

    return {
        "predicted_role": predicted_role,
        "confidence":     confidence,
        "reasoning": (
            f"Based on top-{len(top_matches)} similar resumes "
            f"(avg similarity={confidence:.2%}). "
            f"Role '{predicted_role}' received the most weighted votes."
        ),
        "top_matches": [
            {"similarity": round(s, 4), "role": r, "score": sc}
            for s, r, sc in top_matches
        ],
    }
