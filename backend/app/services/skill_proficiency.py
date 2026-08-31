"""
skill_proficiency.py — infer how confidently a *claimed* skill is actually known.

Phase 1 of the skill-verification feature. A resume only tells us a skill was
*listed*, not that the user can *use* it. This module infers a per-skill
confidence from where and how the skill appears in the resume:

  - listed in the skills section only          → low  (claimed, unverified)
  - used inside a project / experience bullet  → higher (applied)
  - + seniority / usage cues, repeated mentions → higher still (proficient)

The output feeds two things:
  1. a confidence-discounted "provisional" readiness score (see scoring_engine),
  2. the targeting of the optional verification quiz (low-confidence,
     role-critical skills are the ones worth quizzing).

Pure rule-based and deterministic — no LLM call, so it adds no latency or cost
to the analysis pipeline.
"""

from __future__ import annotations
import re

from app.services.skill_dictionary import get_skill_synonyms

# Proficiency levels (ordered).
LEVEL_CLAIMED = "claimed"        # listed only — unverified
LEVEL_APPLIED = "applied"        # evidence of real use
LEVEL_PROFICIENT = "proficient"  # strong evidence (depth / seniority)

# Confidence thresholds for the level labels.
_APPLIED_AT = 0.50
_PROFICIENT_AT = 0.70

# Words near a skill that signal genuine hands-on use or seniority.
_USAGE_CUES = re.compile(
    r"\b(built|created|developed|designed|architected|implemented|led|deployed|"
    r"engineered|optimi[sz]ed|production|year|years|experience|expert|proficient|"
    r"advanced|migrated|scaled|integrated|automated|maintained|shipped|delivered)\b",
    re.IGNORECASE,
)

_CUE_WINDOW = 70  # chars on each side of a skill mention to scan for a cue


def _mentions(synonyms: list[str], text: str) -> int:
    return sum(
        len(re.findall(r"\b" + re.escape(s) + r"\b", text, re.IGNORECASE))
        for s in synonyms
    )


def _appears(synonyms: list[str], text: str) -> bool:
    return any(re.search(r"\b" + re.escape(s) + r"\b", text, re.IGNORECASE) for s in synonyms)


def _has_cue_near(synonyms: list[str], text: str) -> bool:
    """True if a usage/seniority cue word sits within _CUE_WINDOW of any mention."""
    for s in synonyms:
        for m in re.finditer(r"\b" + re.escape(s) + r"\b", text, re.IGNORECASE):
            start = max(0, m.start() - _CUE_WINDOW)
            end = min(len(text), m.end() + _CUE_WINDOW)
            if _USAGE_CUES.search(text[start:end]):
                return True
    return False


def infer_proficiency(
    resume_skills: list[str],
    raw_text: str,
    projects_text: str = "",
    skills_text: str = "",
) -> dict[str, dict]:
    """
    Return {skill: {"level": str, "confidence": float, "evidence": str}} for
    every detected skill. Confidence is in [0, 1].

    Scoring (additive, capped at 1.0):
        0.35  base — the skill was detected at all (claimed)
       +0.35  used in the projects / experience section
       +0.20  a usage/seniority cue word appears next to a mention
       +0.10  mentioned 2+ times across the resume
    """
    raw = raw_text or ""
    proj = projects_text or ""
    out: dict[str, dict] = {}

    for skill in resume_skills:
        syns = get_skill_synonyms(skill)
        in_projects = _appears(syns, proj)
        near_cue = _has_cue_near(syns, raw)
        mentions = _mentions(syns, raw)

        conf = 0.35
        evidence = ["listed"]
        if in_projects:
            conf += 0.35
            evidence.append("used in projects/experience")
        if near_cue:
            conf += 0.20
            evidence.append("hands-on/seniority cue nearby")
        if mentions >= 2:
            conf += 0.10
            evidence.append(f"mentioned {mentions}×")

        conf = round(min(conf, 1.0), 2)
        level = (
            LEVEL_PROFICIENT if conf >= _PROFICIENT_AT
            else LEVEL_APPLIED if conf >= _APPLIED_AT
            else LEVEL_CLAIMED
        )
        out[skill] = {"level": level, "confidence": conf, "evidence": ", ".join(evidence)}

    return out
