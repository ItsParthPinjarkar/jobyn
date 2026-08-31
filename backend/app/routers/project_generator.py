from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List

from app.services.project_generator_service import project_generator_service
from app.services.project_verifier_service import project_verifier_service
from app.core.rate_limiter import ai_limit, heavy_limit, user_ai_limit

router = APIRouter(prefix="/projects", tags=["Project Generation"])

class ProjectRequest(BaseModel):
    role: str
    skills: List[str]

class VerifyRequest(BaseModel):
    github_url: str
    project_markdown: str = Field(..., max_length=100000)
    required_skills: List[str]
    role: str

@router.post("/generate")
@ai_limit
@user_ai_limit
async def generate_project(request: Request, req: ProjectRequest):
    """
    Generates a custom capstone project using an LLM to help
    a student acquire the specified missing skills for a given role.
    """
    if not req.role or not req.skills:
        raise HTTPException(status_code=400, detail="Role and a list of skills are required.")

    # Generate project
    result = await project_generator_service.generate_project(req.role, req.skills)
    return result

@router.post("/verify")
@heavy_limit
async def verify_project(request: Request, req: VerifyRequest):
    """
    Verifies a student's GitHub repo against the original project spec.
    Fetches repo data via GitHub API, then uses AI to score completion.
    """
    if not req.github_url:
        raise HTTPException(status_code=400, detail="A GitHub repository URL is required.")
    if not req.project_markdown:
        raise HTTPException(status_code=400, detail="The original project specification is required.")

    result = await project_verifier_service.verify_project(
        github_url=req.github_url,
        project_markdown=req.project_markdown,
        required_skills=req.required_skills,
        role=req.role,
    )

    if not result.get("verified") and result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    return result
