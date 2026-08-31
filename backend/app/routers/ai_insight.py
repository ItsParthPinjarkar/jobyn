from datetime import date
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.services.ai_service import ai_service
from app.services.interview_service import interview_service
from app.services.curriculum_graph import (
    get_prerequisites, get_unlocked_skills, get_learning_path,
    get_curriculum_overview, can_unlock, CURRICULUM_GRAPH,
)
from app.core.rate_limiter import ai_limit, heavy_limit, user_ai_limit
from app.services.knowledge_service import knowledge_service
from app.core.auth import get_admin_user, get_current_user, AuthUser

router = APIRouter(prefix="/ai", tags=["AI Insights"])

class ForecastRequest(BaseModel):
    role: str
    missing_skills: List[str]

class ChatRequest(BaseModel):
    skill: str
    query: str = Field(..., max_length=10000)
    history: Optional[List[dict]] = []
    mastered_skills: Optional[List[str]] = []

class ContributionRequest(BaseModel):
    skill: str
    submitted_by: str
    notes_content: Dict[str, Any]

class SmartPlanRequest(BaseModel):
    """Build a dependency-aware learning plan."""
    missing_core_skills: List[str]
    missing_optional_skills: List[str] = []
    mastered_skills: List[str] = []
    daily_hours: float = 2.0
    deadline: Optional[str] = None  # ISO date string e.g. "2026-03-22"


# ── Smart Plan Endpoint ──────────────────────────────────────────────────────


def _resolve_full_path(
    missing_skills: List[str],
    mastered: List[str],
) -> List[Dict[str, Any]]:
    """
    Build a topologically-sorted learning path that respects the
    curriculum dependency graph.  Each skill in the final list includes
    its prerequisites and what it unlocks.
    """
    mastered_set = {s.lower().strip() for s in mastered}
    seen: set = set()
    ordered: List[str] = []

    def dfs(skill: str):
        norm = skill.lower().strip()
        if norm in seen or norm in mastered_set:
            return
        seen.add(norm)
        for prereq in CURRICULUM_GRAPH.get(norm, []):
            dfs(prereq)
        ordered.append(norm)

    for skill in missing_skills:
        dfs(skill)

    # Build rich items with metadata
    items: List[Dict[str, Any]] = []
    # Reverse map: what does each skill unlock?
    unlocks_map: Dict[str, List[str]] = {}
    for s, prereqs in CURRICULUM_GRAPH.items():
        for p in prereqs:
            unlocks_map.setdefault(p, []).append(s)

    for idx, skill in enumerate(ordered):
        prereqs = [p for p in CURRICULUM_GRAPH.get(skill, []) if p not in mastered_set]
        unlocks = [u for u in unlocks_map.get(skill, []) if u in seen]
        is_target = skill in {s.lower().strip() for s in missing_skills}

        # Estimate study time based on prerequisite depth
        depth = len(CURRICULUM_GRAPH.get(skill, []))
        if depth >= 3:
            minutes = 150
            difficulty = "Advanced"
        elif depth >= 1:
            minutes = 90
            difficulty = "Intermediate"
        else:
            minutes = 60
            difficulty = "Foundational"

        items.append({
            "id": f"sp-{idx}",
            "skill": skill,
            "title": f"{'Master' if is_target else 'Learn'} {skill.title()}",
            "prerequisites": prereqs,
            "unlocks": unlocks,
            "is_target_skill": is_target,
            "is_prerequisite": not is_target,
            "difficulty": difficulty,
            "duration_minutes": minutes,
            "order": idx,
        })

    return items


@router.post("/smart-plan")
@heavy_limit
@user_ai_limit
async def build_smart_plan(request: Request, req: SmartPlanRequest):
    """
    Build a dependency-aware learning plan.  Returns an ordered list of
    skills with prerequisites, unlock chains, and day-by-day scheduling.
    Supports optional deadline mode.
    """
    all_missing = req.missing_core_skills + req.missing_optional_skills
    if not all_missing:
        raise HTTPException(status_code=400, detail="No missing skills provided.")

    items = _resolve_full_path(all_missing, req.mastered_skills)

    # ── Day-by-day scheduling ───────────────────────────────────────
    daily_minutes = req.daily_hours * 60

    # If deadline is set, calculate required daily hours
    recommended_daily = req.daily_hours
    days_available = None
    if req.deadline:
        try:
            deadline_date = date.fromisoformat(req.deadline)
            today = date.today()
            delta = (deadline_date - today).days
            if delta > 0:
                days_available = delta
                total_minutes = sum(i["duration_minutes"] for i in items)
                needed_daily = total_minutes / delta
                recommended_daily = round(max(needed_daily / 60, 0.5), 1)
                # Use the recommended daily if it's higher than what user set
                if needed_daily > daily_minutes:
                    daily_minutes = needed_daily
        except ValueError:
            pass

    schedule: List[Dict[str, Any]] = []
    current_day = 1
    day_minutes = 0

    for item in items:
        if day_minutes + item["duration_minutes"] > daily_minutes and schedule:
            last_day = schedule[-1]["day"]
            if last_day == current_day:
                current_day += 1
                day_minutes = 0

        item["scheduled_day"] = current_day
        schedule.append({"day": current_day, **item})
        day_minutes += item["duration_minutes"]

        if day_minutes >= daily_minutes:
            current_day += 1
            day_minutes = 0

    total_days = current_day if day_minutes > 0 else current_day - 1
    total_days = max(total_days, 1)
    total_minutes = sum(i["duration_minutes"] for i in items)
    target_count = sum(1 for i in items if i["is_target_skill"])
    prereq_count = sum(1 for i in items if i["is_prerequisite"])

    return {
        "schedule": schedule,
        "total_skills": len(items),
        "target_skills": target_count,
        "prerequisite_skills": prereq_count,
        "total_days": total_days,
        "total_hours": round(total_minutes / 60, 1),
        "daily_hours": req.daily_hours,
        "recommended_daily_hours": recommended_daily,
        "days_available": days_available,
        "deadline": req.deadline,
    }


@router.post("/market-forecast")
@ai_limit
@user_ai_limit
async def get_forecast(request: Request, req: ForecastRequest):
    """Get a dynamic market forecast."""
    if not req.role or not req.missing_skills:
        raise HTTPException(status_code=400, detail="Role and missing skills required.")
    return await ai_service.get_market_forecast(req.role, req.missing_skills)

@router.get("/study/notes")
@ai_limit
@user_ai_limit
async def get_study_notes(request: Request, skill: str, existing_skills: Optional[str] = None):
    """Generates study notes for a specific skill (intro + first section)."""
    if not skill:
        raise HTTPException(status_code=400, detail="Skill name is required.")
    return await ai_service.get_study_materials(skill, existing_skills or "")

class SubmitProgressRequest(BaseModel):
    skill: str
    section_idx: int

class SubmitQuizGradeRequest(BaseModel):
    skill: str
    section_idx: int
    score: int
    passed: bool

@router.get("/study/section")
@ai_limit
@user_ai_limit
async def get_study_section(request: Request, skill: str, section_idx: int, existing_skills: Optional[str] = None):
    """Generates a single study section on-demand for progressive loading."""
    if not skill:
        raise HTTPException(status_code=400, detail="Skill name is required.")
    if section_idx < 0 or section_idx > 20:
        raise HTTPException(status_code=400, detail="section_idx out of range.")
    return await ai_service.get_study_section(skill, section_idx, existing_skills or "")

@router.get("/study/quiz")
@ai_limit
@user_ai_limit
async def get_study_quiz(request: Request, skill: str, section_idx: Optional[int] = None):
    """Generates a general verification quiz or a targeted section quiz."""
    if not skill:
        raise HTTPException(status_code=400, detail="Skill name is required.")
    if section_idx is not None:
        return await ai_service.generate_section_quiz(skill, section_idx)
    return await ai_service.generate_quiz(skill)

@router.post("/study/progress")
async def save_study_progress(req: SubmitProgressRequest, user: AuthUser = Depends(get_current_user)):
    """Save user progress for completing a study section."""
    from app.core.supabase_client import get_supabase
    sb = get_supabase()

    # 1. Fetch current progress
    resp = sb.table("user_study_progress").select("completed_sections", "mastered").eq("user_email", user.email).eq("skill", req.skill.lower()).execute()

    completed = []
    if resp.data:
        completed = resp.data[0].get("completed_sections") or []

    if req.section_idx not in completed:
        completed.append(req.section_idx)

    # Check if they completed all syllabus sections
    sections = await ai_service.get_or_create_syllabus(req.skill)
    total_secs = len(sections)
    mastered = len(completed) >= total_secs

    # Update in DB
    sb.table("user_study_progress").upsert({
        "user_email": user.email,
        "skill": req.skill.lower(),
        "completed_sections": completed,
        "mastered": mastered,
        "updated_at": "now()"
    }, on_conflict="user_email,skill").execute()

    return {"status": "success", "completed_sections": completed, "mastered": mastered}

@router.get("/study/progress")
async def get_study_progress(skill: Optional[str] = None, user: AuthUser = Depends(get_current_user)):
    """Get active progress for a specific skill or all skills for the logged-in student."""
    from app.core.supabase_client import get_supabase
    sb = get_supabase()

    query = sb.table("user_study_progress").select("*").eq("user_email", user.email)
    if skill:
        query = query.eq("skill", skill.lower())
    resp = query.execute()
    return resp.data

@router.post("/study/quiz/submit")
async def submit_quiz_grade(req: SubmitQuizGradeRequest, user: AuthUser = Depends(get_current_user)):
    """Logs quiz score, attempts, and automatically triggers progress mark if student passed."""
    from app.core.supabase_client import get_supabase
    sb = get_supabase()

    # 1. Insert quiz attempt
    sb.table("user_quiz_attempts").insert({
        "user_email": user.email,
        "skill": req.skill.lower(),
        "section_idx": req.section_idx,
        "score": req.score,
        "passed": req.passed
    }).execute()

    # 2. If they passed, automatically register the progress completion for this section!
    completed = []
    mastered = False
    if req.passed:
        resp = sb.table("user_study_progress").select("completed_sections", "mastered").eq("user_email", user.email).eq("skill", req.skill.lower()).execute()
        if resp.data:
            completed = resp.data[0].get("completed_sections") or []

        if req.section_idx not in completed:
            completed.append(req.section_idx)

        sections = await ai_service.get_or_create_syllabus(req.skill)
        total_secs = len(sections)
        mastered = len(completed) >= total_secs

        sb.table("user_study_progress").upsert({
            "user_email": user.email,
            "skill": req.skill.lower(),
            "completed_sections": completed,
            "mastered": mastered,
            "updated_at": "now()"
        }, on_conflict="user_email,skill").execute()

    return {
        "status": "success",
        "passed": req.passed,
        "completed_sections": completed,
        "mastered": mastered
    }

@router.post("/study/chat")
@ai_limit
@user_ai_limit
async def study_chat(request: Request, req: ChatRequest):
    """Provides a chat interface for a specific skill."""
    if not req.skill or not req.query:
        raise HTTPException(status_code=400, detail="Skill and query are required.")

    context = f"Student already knows: {', '.join(req.mastered_skills or [])}"
    content = await ai_service.get_chat_response(req.skill, req.query, req.history, context)
    return {"response": content}



# ── AI Interview Simulator ────────────────────────────────────────────────────

class InterviewStartRequest(BaseModel):
    skill: str
    difficulty: str = "medium"  # easy | medium | hard
    role: Optional[str] = ""

class InterviewAnswerRequest(BaseModel):
    skill: str
    question: str
    answer: str = Field(..., max_length=10000)
    question_number: int = 1
    difficulty: str = "medium"
    history: Optional[List[Dict[str, Any]]] = []

class InterviewEndRequest(BaseModel):
    skill: str
    difficulty: str = "medium"
    history: List[Dict[str, Any]]


@router.post("/interview/start")
@ai_limit
@user_ai_limit
async def start_interview(request: Request, req: InterviewStartRequest):
    """Start a mock interview session — returns the first question."""
    if not req.skill:
        raise HTTPException(status_code=400, detail="Skill is required.")
    return await interview_service.start_interview(req.skill, req.difficulty, req.role)


@router.post("/interview/answer")
@ai_limit
@user_ai_limit
async def evaluate_interview_answer(request: Request, req: InterviewAnswerRequest):
    """Evaluate the candidate's answer and return a follow-up question."""
    if not req.skill or not req.answer:
        raise HTTPException(status_code=400, detail="Skill and answer are required.")
    return await interview_service.evaluate_answer(
        skill=req.skill,
        question=req.question,
        answer=req.answer,
        question_number=req.question_number,
        difficulty=req.difficulty,
        history=req.history or [],
    )


@router.post("/interview/end")
@ai_limit
@user_ai_limit
async def end_interview(request: Request, req: InterviewEndRequest):
    """End the interview and return a comprehensive scorecard."""
    if not req.history:
        raise HTTPException(status_code=400, detail="Interview history is required.")
    return await interview_service.end_interview(req.skill, req.difficulty, req.history)


# ── Community & Admin Routes ──
def _sb():
    from app.core.supabase_client import get_supabase
    return get_supabase()

@router.post("/study/contribute")
@heavy_limit
async def submit_contribution(
    request: Request,
    req: ContributionRequest,
    user: AuthUser = Depends(get_current_user),
):
    from app.utils.validation import sanitize_plain, sanitize_recursive

    clean_skill = sanitize_plain(req.skill).lower()
    # Attribute to the AUTHENTICATED user, never the client-supplied field — this
    # prevents anonymous/spoofed submissions flooding the admin review queue.
    clean_submitted_by = user.email
    clean_content = sanitize_recursive(req.notes_content)

    if not clean_skill or not clean_submitted_by or not clean_content:
        raise HTTPException(status_code=400, detail="Invalid contribution input data.")

    try:
        sb = _sb()
        sb.table("contributions").insert({
            "topic": clean_skill,
            "submitted_by": clean_submitted_by,
            "content": clean_content,
            "status": "pending",
        }).execute()
        return {"status": "success", "message": "Contribution submitted for review."}
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.get("/admin/contributions")
async def get_pending_contributions(admin=Depends(get_admin_user)):
    try:
        sb = _sb()
        resp = (
            sb.table("contributions")
            .select("*")
            .eq("status", "pending")
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data or []
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/admin/contributions/{id}/approve")
async def approve_contribution(id: int, admin=Depends(get_admin_user)):
    try:
        sb = _sb()
        # Fetch the contribution
        resp = sb.table("contributions").select("*").eq("id", id).limit(1).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Not found")
        contrib = resp.data[0]

        # Move content to knowledge cache
        knowledge_service.cache_knowledge(contrib["topic"], contrib["content"], "study")

        # Mark as approved
        sb.table("contributions").update({"status": "approved"}).eq("id", id).execute()
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/admin/contributions/{id}/reject")
async def reject_contribution(id: int, admin=Depends(get_admin_user)):
    try:
        sb = _sb()
        resp = sb.table("contributions").update({"status": "rejected"}).eq("id", id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Not found")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.get("/admin/stats")
async def get_admin_stats(admin=Depends(get_admin_user)):
    try:
        sb = _sb()

        # Contribution counts
        pending_resp = sb.table("contributions").select("id", count="exact").eq("status", "pending").execute()
        approved_resp = sb.table("contributions").select("id", count="exact").eq("status", "approved").execute()
        pending = pending_resp.count if pending_resp.count is not None else len(pending_resp.data or [])
        approved = approved_resp.count if approved_resp.count is not None else len(approved_resp.data or [])

        # Knowledge cache topic count
        total_skills = knowledge_service.get_all_topics_count()

        # Active students (unique emails from resumes)
        active_students = 0
        resp = sb.table("resumes").select("user_email", count="exact").execute()
        emails = set(r.get("user_email") for r in resp.data if r.get("user_email"))
        active_students = len(emails)

    except Exception:
        pending = 0
        approved = 0
        total_skills = 0
        active_students = 0

    return {
        "pending_reviews": pending,
        "approved_contributions": approved,
        "total_courses_cached": total_skills,
        "active_students": active_students,
    }


# ── Curated Resource Ingestion & Compiler (Pathway A & B) ──────────────────

class IngestCourseRequest(BaseModel):
    skill: str
    url: str
    use_rag: bool = False

@router.post("/admin/ingest-course")
@heavy_limit
async def ingest_course(request: Request, req: IngestCourseRequest, admin=Depends(get_admin_user)):
    """
    Ingests an authority resource URL.
    - Pathway A (use_rag=True): Scrapes, chunks, embeds (using gemini-embedding-001), and logs to PGVector.
    - Pathway B (use_rag=False): Scrapes and progressively compiles a dynamic, multi-section course
      caching it in the knowledge_cache table for 0ms load times.
    """
    from app.services.scraper_service import scraper_service
    from app.services.rag_service import embed_text
    from app.utils.llm_utils import parse_json_from_llm
    from app.core.supabase_client import get_supabase

    skill_norm = req.skill.lower().strip()

    # SSRF guard: block URLs that resolve to private/internal addresses (cloud
    # metadata, internal services) before the server fetches them.
    from app.utils.validation import validate_public_url
    try:
        validate_public_url(req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 1. Scrape content
    try:
        scraped_text = await scraper_service.fetch_clean_markdown(req.url)
    except Exception:
        raise HTTPException(status_code=400, detail="An internal error occurred. Please try again.")

    if not scraped_text or len(scraped_text) < 100:
        raise HTTPException(status_code=400, detail="Scraped resource content is too short or invalid.")

    sb = get_supabase()

    # ──────────────────────────────────────────────────────────────────────────
    # PATHWAY A: Grounded RAG Ingestion (Insert overlapping vector chunks)
    # ──────────────────────────────────────────────────────────────────────────
    if req.use_rag:
        try:
            chunk_size = 1200
            overlap = 200
            chunks = []

            # Simple chunking with overlap
            for i in range(0, len(scraped_text), chunk_size - overlap):
                chunk = scraped_text[i:i + chunk_size].strip()
                if len(chunk) > 50:
                    chunks.append(chunk)

            inserted_count = 0
            for chunk in chunks:
                embedding = embed_text(chunk)
                if embedding:
                    # Insert in database
                    sb.table("knowledge_chunks").insert({
                        "topic": skill_norm,
                        "content": f"[Source: {req.url}]\n\n{chunk}",
                        "embedding": embedding,
                        "source_version": "user_curated"
                    }).execute()
                    inserted_count += 1

            return {
                "status": "success",
                "pathway": "Pathway A: Grounded RAG",
                "message": f"Successfully scraped resource, split into {len(chunks)} chunks, and ingested {inserted_count} vector embeddings.",
                "total_chunks": len(chunks),
                "inserted_chunks": inserted_count
            }
        except Exception:
            raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

    # ──────────────────────────────────────────────────────────────────────────
    # PATHWAY B: Direct Static Course Compiler (Create 0ms cached learning hub)
    # ──────────────────────────────────────────────────────────────────────────
    else:
        try:
            # 1. Compile/Get the dynamic syllabus
            sections = await ai_service.get_or_create_syllabus(skill_norm)
            sub_roadmap = [{"title": s["title"], "duration": s["duration"]} for s in sections]
            total_sections = len(sections)

            # 2. Compile each individual section statically using scraped documentation
            from app.services.gemini_service import gemini_service
            from app.core.settings import settings

            if not ai_service.gemini_key or not gemini_service.client:
                raise Exception("Gemini API client is not configured. Pathway B requires a valid GEMINI_API_KEY.")

            compiled_sections = []

            # Limit the size of scraped reference text passed to the model (fits inside typical token context windows)
            reference_context = scraped_text[:15000]

            for section in sections:
                idx = section["idx"]
                title = section["title"]
                desc = section["desc"]
                is_last = (idx == total_sections - 1)

                # Build custom compilation prompt
                if is_last:
                    prompt = f"""
                    You are a Senior Technical Curriculum Compiler.
                    We have scraped official technical documentation for the skill "{req.skill}":
                    ---
                    {reference_context}
                    ---

                    Task: Compile the final Practice Problems & LeetCode module for "{title}" (described as: {desc}).

                    Return strict JSON only matching:
                    {{
                      "subheading": "{title}",
                      "explanation": "Summarize key problem-solving patterns or heuristics for {req.skill} based on the reference docs (2 paragraphs max).",
                      "example": "```python\\n# A full copy-pasteable, annotated code solution representing a core interview problem\\n```",
                      "key_takeaway": "Key algorithmic pattern to remember...",
                      "try_it": "Mini-challenge...",
                      "complexity": "Varies by problem",
                      "leetcode_problems": [
                        {{
                          "title": "Real LeetCode Problem Name",
                          "number": 1,
                          "difficulty": "Easy",
                          "url": "https://leetcode.com/problems/real-slug/",
                          "pattern": "Pattern name...",
                          "hint": "Useful hint...",
                          "description": "Short problem summary...",
                          "example_input": "...",
                          "example_output": "..."
                        }}
                      ]
                    }}

                    Include exactly 5 real LeetCode problems (2 Easy, 2 Medium, 1 Hard) relevant to {req.skill}.
                    """
                else:
                    prompt = f"""
                    You are a Senior Technical Curriculum Compiler.
                    We have scraped official technical documentation for the skill "{req.skill}":
                    ---
                    {reference_context}
                    ---

                    Task: Compile Module {idx}: "{title}" (described as: {desc}).
                    Generate high-quality explanations and copy-pasteable code examples derived directly from the reference material above. Do not hallucinate syntax.

                    Return strict JSON only matching:
                    {{
                      "subheading": "{title}",
                      "explanation": "Clear, detailed explanation using real-world analogies (under 200 words). Make it thorough.",
                      "example": "```python\\n# Clean, runnable, and copy-pasteable implementation using standards from the reference docs\\n```",
                      "key_takeaway": "Memorable one-line takeaway.",
                      "try_it": "Hands-on coding challenge challenge targeting this module's code.",
                      "complexity": "Time: O(1), Space: O(1) (if applicable)"
                    }}
                    """

                # Call LLM
                response = gemini_service.client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                data = parse_json_from_llm(response.text)
                if not data or not data.get("subheading"):
                    raise Exception(f"Failed to compile section {idx}: LLM returned invalid or malformed structure.")

                # Cache section in database
                cache_key = f"{skill_norm}_section_{idx}"
                knowledge_service.cache_knowledge(cache_key, data, "section")
                compiled_sections.append(title)

            # 3. Compile the main study intro overview notes
            intro_prompt = f"""
            You are a Senior technical curriculum director.
            Based on the scraped documentation:
            ---
            {reference_context[:6000]}
            ---

            Compile a high-level course overview for the skill "{req.skill}".

            Return strict JSON only matching:
            {{
              "skill": "{req.skill}",
              "quick_summary": "2-3 sentence overview of the skill and its industrial significance.",
              "estimated_study_time": "60 minutes",
              "detailed_content": [
                {{
                  "subheading": "{sections[0]['title']}",
                  "explanation": "Comprehensive introductory concepts and real-world analogy."
                }}
              ],
              "pro_tip": "Expert industry optimization pro-tip."
            }}
            """

            intro_resp = gemini_service.client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=intro_prompt,
            )
            intro_data = parse_json_from_llm(intro_resp.text)

            if intro_data and intro_data.get("quick_summary"):
                # Append required metadata
                intro_data["sources"] = [{"title": f"{req.skill} Documentation", "source_type": "Curated Reference", "version": req.url}]
                intro_data["sub_roadmap"] = sub_roadmap
                intro_data["total_sections"] = total_sections

                # Cache intro in DB
                knowledge_service.cache_knowledge(skill_norm, intro_data, "study")

            return {
                "status": "success",
                "pathway": "Pathway B: Direct Static Compiler",
                "message": f"Successfully scraped resource and compiled a custom {total_sections}-section course for '{req.skill}' backed by authority context.",
                "syllabus": sub_roadmap,
                "compiled_sections": compiled_sections
            }

        except Exception:
            raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ── Curriculum Graph Routes ──────────────────────────────────────────────────

class CurriculumRequest(BaseModel):
    mastered_skills: List[str]

class UnlockCheckRequest(BaseModel):
    skill: str
    mastered_skills: List[str]
    quiz_score: Optional[float] = 0.0


@router.get("/curriculum/overview")
def curriculum_overview():
    """Returns the full skill dependency graph and metadata."""
    return get_curriculum_overview()


@router.get("/curriculum/prerequisites")
def skill_prerequisites(skill: str):
    """Returns prerequisite skills for a given topic."""
    prereqs = get_prerequisites(skill)
    return {"skill": skill, "prerequisites": prereqs}


@router.post("/curriculum/unlocked")
def unlocked_skills(req: CurriculumRequest):
    """Returns all skills unlocked based on the student's mastered skill set."""
    return {"mastered": req.mastered_skills, "unlocked": get_unlocked_skills(req.mastered_skills)}


@router.post("/curriculum/learning-path")
def learning_path(skill: str, req: CurriculumRequest):
    """Returns the ordered prerequisite learning path to reach a target skill."""
    path = get_learning_path(skill, req.mastered_skills)
    return {"target": skill, "learning_path": path, "total_steps": len(path)}


@router.post("/curriculum/can-unlock")
def check_unlock(req: UnlockCheckRequest):
    """Checks if a student can unlock a skill based on prerequisites and quiz score."""
    return can_unlock(req.skill, req.mastered_skills, req.quiz_score)
