"""
projection_engine.py — simulate the score impact of adding a new skill.

Strategy:
  Find the top-k most similar resumes to the PROJECTED skill set, then
  compute a similarity-weighted average of their scores.

  score_improvement = projected_avg - current_avg

No ML. Fully deterministic and explainable.
"""

from app.ml_pipeline.similarity_engine import build_vocabulary, encode, cosine_similarity


# ── Internal helper ────────────────────────────────────────────────────────────

def _weighted_avg_score(
    skills:  list[str],
    records: list[dict],
    top_k:   int = 5,
) -> float:
    """
    Similarity-weighted average final_score from top-k matching records.
    Returns 0.0 if no similar records exist.
    """
    vocab     = build_vocabulary(records)
    query_vec = encode(skills, vocab)

    scored: list[tuple] = []
    for r in records:
        r_vec = encode(r["detected_skills"], vocab)
        sim   = cosine_similarity(query_vec, r_vec)
        if sim > 0:
            scored.append((sim, r["final_score"]))

    scored.sort(key=lambda x: -x[0])
    top = scored[:top_k]

    if not top:
        return 0.0

    total_weight = sum(s for s, _ in top)
    if total_weight == 0:
        return 0.0

    return sum(s * score for s, score in top) / total_weight


# ── Public API ─────────────────────────────────────────────────────────────────

def project_score(
    current_skills: list[str],
    add_skill:      str,
    records:        list[dict],
    top_k:          int = 5,
) -> dict:
    """
    Simulate adding *add_skill* to the resume and predict the score change.

    Returns:
        {
            "skill_added":               str,
            "current_predicted_score":   float,
            "projected_predicted_score": float,
            "expected_improvement":      float,
            "recommendation":            str
        }
    """
    if not records:
        return {
            "skill_added":               add_skill,
            "current_predicted_score":   0.0,
            "projected_predicted_score": 0.0,
            "expected_improvement":      0.0,
            "recommendation":            "No historical data available yet.",
        }

    norm_current   = [s.lower().strip() for s in current_skills]
    norm_projected = list(set(norm_current + [add_skill.lower().strip()]))

    current_score   = _weighted_avg_score(norm_current,   records, top_k)
    projected_score = _weighted_avg_score(norm_projected, records, top_k)
    improvement     = projected_score - current_score

    if improvement >= 5:
        recommendation = f"Highly recommended — adding '{add_skill}' is projected to raise your score significantly."
    elif improvement > 0:
        recommendation = f"Beneficial — adding '{add_skill}' shows a moderate projected improvement."
    elif improvement == 0:
        recommendation = f"Neutral — '{add_skill}' does not appear in enough similar profiles to project impact."
    else:
        recommendation = f"Low priority — '{add_skill}' shows minimal positive impact based on current data."

    return {
        "skill_added":               add_skill,
        "current_predicted_score":   round(current_score,   1),
        "projected_predicted_score": round(projected_score, 1),
        "expected_improvement":      round(improvement,     1),
        "recommendation":            recommendation,
    }
