from app.services.skill_dictionary import extract_skills_from_text, SKILL_CATEGORIES

CATEGORY_WEIGHTS = {
    "programming": 3,
    "ml_ai": 3,
    "backend": 2,
    "frontend": 2,
    "database": 2,
    "tools": 1
}
def compare_resume_with_jd(resume_skill_data: dict, jd_text: str):
    jd_skill_data = extract_skills_from_text(jd_text)

    resume_skills = set(resume_skill_data["skills"])
    jd_skills = set(jd_skill_data["skills"])

    matched_skills = list(resume_skills.intersection(jd_skills))
    missing_skills = list(jd_skills.difference(resume_skills))

    weighted_total = 0
    weighted_matched = 0
    high_priority_missing = []

    # Build skill → category map
    skill_category_map = {}
    for category, skills in SKILL_CATEGORIES.items():
        for skill in skills:
            skill_category_map[skill] = category

    for skill in jd_skills:
        category = skill_category_map.get(skill)
        weight = CATEGORY_WEIGHTS.get(category, 1)

        weighted_total += weight

        if skill in resume_skills:
            weighted_matched += weight
        else:
            if weight >= 3:
                high_priority_missing.append(skill)

    if weighted_total == 0:
        match_score = 0
    else:
        match_score = int((weighted_matched / weighted_total) * 100)

    # Interpret strength
    if match_score >= 75:
        strength = "Strong Fit"
    elif match_score >= 50:
        strength = "Moderate Fit"
    else:
        strength = "Low Fit"

    return {
        "jd_match_score": match_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "high_priority_missing": high_priority_missing,
        "match_strength": strength
    }
