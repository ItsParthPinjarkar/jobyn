"""
skill_impact.py — statistical skill impact analysis.

For each skill in the dataset:
  - Compute mean final_score of all resumes CONTAINING that skill
  - Compare against the global mean score
  - Rank by delta (positive = high-value skill)

No ML. Fully explainable. Stable on small datasets.
"""

from collections import defaultdict


def compute_skill_impact(records: list[dict]) -> dict:
    """
    Rank skills by their average score impact across the dataset.

    Returns:
        {
            "global_mean_score":     float,
            "dataset_size":          int,
            "skill_impact_ranking":  [
                {
                    "skill":                 str,
                    "mean_score_with_skill": float,
                    "delta_from_global":     float,
                    "sample_count":          int,
                    "impact_label":          str   # HIGH / MEDIUM / LOW
                }
            ]
        }
    """
    if not records:
        return {
            "global_mean_score":    0.0,
            "dataset_size":         0,
            "skill_impact_ranking": [],
        }

    # ── Global mean ────────────────────────────────────────────────────────────
    global_mean = sum(r["final_score"] for r in records) / len(records)

    # ── Per-skill score accumulation ───────────────────────────────────────────
    skill_scores: dict[str, list] = defaultdict(list)
    for r in records:
        for skill in r["detected_skills"]:
            skill_scores[skill].append(r["final_score"])

    # ── Build ranking ──────────────────────────────────────────────────────────
    ranking = []
    for skill, scores in skill_scores.items():
        mean_with = sum(scores) / len(scores)
        delta     = mean_with - global_mean

        # Label
        if delta >= 5:
            label = "HIGH"
        elif delta >= 0:
            label = "MEDIUM"
        else:
            label = "LOW"

        ranking.append({
            "skill":                 skill,
            "mean_score_with_skill": round(mean_with, 1),
            "delta_from_global":     round(delta, 1),
            "sample_count":          len(scores),
            "impact_label":          label,
        })

    # Sort: highest delta first
    ranking.sort(key=lambda x: -x["delta_from_global"])

    return {
        "global_mean_score":    round(global_mean, 1),
        "dataset_size":         len(records),
        "skill_impact_ranking": ranking,
    }
