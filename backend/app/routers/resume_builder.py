"""
resume_builder.py — JD-tailored resume builder endpoint.

Takes a job description + user's profile data and generates a tailored
resume using Gemini AI. Falls back to a template-based approach if
Gemini is unavailable.
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from app.core.auth import get_current_user, AuthUser
from app.core.rate_limiter import ai_limit
from app.services.skill_dictionary import extract_skills_from_text
import logging
import os

log = logging.getLogger("resume_builder")

router = APIRouter()


class ResumeBuilderRequest(BaseModel):
    """Input for resume generation."""
    jd_text: str = Field(..., min_length=20, description="Job description text")
    jd_title: Optional[str] = Field(None, description="Job title")
    jd_company: Optional[str] = Field(None, description="Company name")
    # User profile data — pre-filled from their analysis or manual entry
    skills: List[str] = Field(default_factory=list, description="User's skills")
    education: str = Field("", description="Education details")
    projects: str = Field("", description="Project descriptions")
    links: List[str] = Field(default_factory=list, description="Profile links")


def _extract_jd_skills(jd_text: str) -> dict:
    """Extract skills mentioned in the JD for prioritization."""
    result = extract_skills_from_text(jd_text)
    return result


def _build_template_resume(req: ResumeBuilderRequest, jd_skills: dict) -> str:
    """
    Template-based resume generator — works without AI.
    Prioritizes skills that match the JD.
    """
    jd_skill_set = {s.lower() for s in jd_skills.get("skills", [])}

    # Prioritize JD-matching skills first
    matched = [s for s in req.skills if s.lower() in jd_skill_set]
    other = [s for s in req.skills if s.lower() not in jd_skill_set]

    title = req.jd_title or "Software Engineer"
    company = req.jd_company or "the target company"

    lines = []
    lines.append("# RESUME")
    lines.append("")

    # Contact / Links
    if req.links:
        lines.append("## Contact")
        for link in req.links:
            lines.append(f"- {link}")
        lines.append("")

    # Professional Summary — tailored to JD
    lines.append("## Professional Summary")
    lines.append(
        f"Motivated engineer with skills in {', '.join(matched[:5] or req.skills[:5])}, "
        f"seeking the {title} role at {company}. "
        f"Experienced in building projects with {', '.join(req.skills[:3])}."
    )
    lines.append("")

    # Skills — JD-matched first
    lines.append("## Technical Skills")
    if matched:
        lines.append(f"**Primary (JD-matched):** {', '.join(matched)}")
    if other:
        lines.append(f"**Additional:** {', '.join(other)}")
    lines.append("")

    # Education
    if req.education.strip():
        lines.append("## Education")
        lines.append(req.education.strip())
        lines.append("")

    # Projects
    if req.projects.strip():
        lines.append("## Projects")
        lines.append(req.projects.strip())
        lines.append("")

    # JD Keywords section — helps ATS
    jd_cats = jd_skills.get("categories", {})
    if jd_cats:
        lines.append("## Areas of Expertise")
        for cat, skills in jd_cats.items():
            label = cat.replace("_", " ").title()
            lines.append(f"- **{label}:** {', '.join(skills)}")
        lines.append("")

    return "\n".join(lines)


async def _build_ai_resume(req: ResumeBuilderRequest, jd_skills: dict) -> Optional[str]:
    """Use Gemini to generate a tailored resume. Returns None if unavailable."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        matched = [s for s in req.skills if s.lower() in {sk.lower() for sk in jd_skills.get("skills", [])}]

        prompt = f"""You are an expert resume writer. Generate a professional, ATS-optimized resume
tailored to the following job description.

JOB DESCRIPTION:
{req.jd_text[:3000]}

CANDIDATE PROFILE:
- Skills: {', '.join(req.skills)}
- Education: {req.education or 'Not provided'}
- Projects: {req.projects or 'Not provided'}
- Links: {', '.join(req.links) if req.links else 'Not provided'}
- Skills matching JD: {', '.join(matched) if matched else 'None identified'}

RULES:
1. Generate a clean, professional resume in Markdown format
2. Prioritize skills and experiences that match the JD
3. Use action verbs and quantifiable achievements where possible
4. Include a tailored Professional Summary that mirrors JD language
5. Organize skills by relevance to the JD
6. Keep it concise — ideally 1 page equivalent
7. Use standard resume sections: Summary, Skills, Education, Projects
8. Do NOT include fake experience, fake companies, or fabricated credentials
9. If projects are provided, rewrite them with stronger action verbs and impact framing

Return ONLY the resume markdown, no preamble or explanation."""

        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        return response.text

    except Exception as e:
        log.warning("Gemini resume generation failed: %s", e)
        return None


@router.post("/resume-builder")
@ai_limit
async def build_resume(
    request: Request,
    body: ResumeBuilderRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Generate a JD-tailored resume from the user's profile data.

    Tries Gemini AI first for high-quality output. Falls back to a
    deterministic template if AI is unavailable.
    """
    # Extract skills from JD for prioritization
    jd_skills = _extract_jd_skills(body.jd_text)

    # Try AI-powered generation first
    ai_result = await _build_ai_resume(body, jd_skills)

    if ai_result:
        return {
            "resume": ai_result,
            "method": "ai",
            "jd_skills": jd_skills.get("skills", []),
            "matched_skills": [s for s in body.skills if s.lower() in {sk.lower() for sk in jd_skills.get("skills", [])}],
        }

    # Fallback: template-based
    template_result = _build_template_resume(body, jd_skills)
    return {
        "resume": template_result,
        "method": "template",
        "jd_skills": jd_skills.get("skills", []),
        "matched_skills": [s for s in body.skills if s.lower() in {sk.lower() for sk in jd_skills.get("skills", [])}],
    }
