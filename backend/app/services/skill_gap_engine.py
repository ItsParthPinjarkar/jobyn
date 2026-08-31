def generate_skill_gap_analysis(
    resume_skills: list,
    core_skills: list,
    optional_skills: list,
    role_name: str = "",
) -> dict:
    """
    Compare resume skills against a role's core and optional skill lists.

    Returns missing skills and structured recommendations with priority + reason.
    """
    resume_set = set(resume_skills)

    missing_core     = [s for s in core_skills     if s not in resume_set]
    missing_optional = [s for s in optional_skills if s not in resume_set]

    recommendations = []

    for skill in missing_core:
        recommendations.append({
            "skill":    skill,
            "priority": "HIGH",
            "reason":   f"Core skill missing for {role_name}" if role_name else "Core skill missing",
        })

    for skill in missing_optional:
        recommendations.append({
            "skill":    skill,
            "priority": "MEDIUM",
            "reason":   f"Optional skill that strengthens {role_name} profile" if role_name else "Optional skill missing",
        })

    return {
        "missing_core_skills":     missing_core,
        "missing_optional_skills": missing_optional,
        "recommendations":         recommendations,
    }
