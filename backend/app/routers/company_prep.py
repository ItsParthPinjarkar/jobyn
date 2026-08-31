"""
company_prep.py — company-specific interview preparation endpoints.

Provides a curated list of top tech companies with interview stages,
required skills, prep timelines, and personalized skill-match analysis.
"""

from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_current_user, AuthUser
from app.core.supabase_client import get_supabase
import logging

log = logging.getLogger(__name__)

router = APIRouter(prefix="/company-prep", tags=["Company Prep"])

# ── Seed Data ────────────────────────────────────────────────────────────────

SEED_COMPANIES = [
    {
        "company_name": "Google",
        "company_slug": "google",
        "category": "product",
        "required_skills": ["python", "java", "data structures", "algorithms", "system design", "distributed systems"],
        "preferred_skills": ["go", "kubernetes", "gcp", "machine learning", "cpp"],
        "interview_stages": [
            {"stage": "Online Assessment", "description": "2 coding problems, 90 minutes, medium-hard difficulty."},
            {"stage": "Phone Screen", "description": "45-min coding interview with a Google engineer."},
            {"stage": "Onsite (4-5 rounds)", "description": "2 coding, 1 system design, 1 behavioral, optionally 1 domain-specific."},
        ],
        "prep_timeline": "8-12 weeks of focused preparation recommended.",
        "resources": [
            "https://leetcode.com/company/google/",
            "https://www.educative.io/courses/grokking-the-system-design-interview",
            "https://www.google.com/about/careers/applications/interview-tips/",
        ],
        "tips": [
            "Focus on clean, optimal code — Google values code quality.",
            "Practice system design at scale (billions of users).",
            "Use the STAR method for behavioral questions.",
        ],
        "avg_difficulty": "hard",
    },
    {
        "company_name": "Microsoft",
        "company_slug": "microsoft",
        "category": "product",
        "required_skills": ["csharp", "python", "data structures", "algorithms", "system design", "azure"],
        "preferred_skills": ["typescript", "react", "dotnet", "sql", "cloud architecture"],
        "interview_stages": [
            {"stage": "Online Assessment", "description": "3 coding problems on Codility/HackerRank, 60-90 minutes."},
            {"stage": "Phone Screen", "description": "45-min coding + behavioral with hiring manager."},
            {"stage": "Onsite (4-5 rounds)", "description": "2-3 coding, 1 system design, 1 behavioral (As Appropriate)."},
        ],
        "prep_timeline": "6-10 weeks recommended.",
        "resources": [
            "https://leetcode.com/company/microsoft/",
            "https://learn.microsoft.com/en-us/careers/",
        ],
        "tips": [
            "Microsoft values a growth mindset — emphasize learning from failures.",
            "Know Azure services at a high level for system design.",
            "Prepare 'Why Microsoft?' with specific product references.",
        ],
        "avg_difficulty": "medium-hard",
    },
    {
        "company_name": "Amazon",
        "company_slug": "amazon",
        "category": "product",
        "required_skills": ["python", "java", "data structures", "algorithms", "system design", "aws"],
        "preferred_skills": ["distributed systems", "dynamodb", "microservices", "java", "leadership principles"],
        "interview_stages": [
            {"stage": "Online Assessment", "description": "2 coding problems + work style simulation, 120 minutes."},
            {"stage": "Phone Screen", "description": "60-min coding round with bar raiser."},
            {"stage": "Onsite (4-5 rounds)", "description": "Coding, system design, behavioral (Leadership Principles focused)."},
        ],
        "prep_timeline": "6-10 weeks recommended.",
        "resources": [
            "https://leetcode.com/company/amazon/",
            "https://www.amazon.jobs/en/principles",
        ],
        "tips": [
            "Memorize all 16 Leadership Principles with STAR stories.",
            "Bar Raiser round is critical — they can veto any hire.",
            "Focus on customer obsession in every behavioral answer.",
        ],
        "avg_difficulty": "hard",
    },
    {
        "company_name": "Meta",
        "company_slug": "meta",
        "category": "product",
        "required_skills": ["python", "javascript", "data structures", "algorithms", "system design", "react"],
        "preferred_skills": ["hack", "graphql", "react native", "distributed systems", "machine learning"],
        "interview_stages": [
            {"stage": "Online Assessment", "description": "2 coding problems, 70 minutes."},
            {"stage": "Phone Screen", "description": "45-min coding interview."},
            {"stage": "Onsite (4-5 rounds)", "description": "2 coding, 1 system design, 1 behavioral."},
        ],
        "prep_timeline": "8-12 weeks recommended.",
        "resources": [
            "https://leetcode.com/company/meta/",
            "https://www.metacareers.com/swe-prep",
        ],
        "tips": [
            "Meta values speed — practice solving medium problems in under 20 minutes.",
            "Know React internals for frontend roles.",
            "Prepare for 'Move Fast' and 'Be Bold' cultural questions.",
        ],
        "avg_difficulty": "hard",
    },
    {
        "company_name": "TCS",
        "company_slug": "tcs",
        "category": "service",
        "required_skills": ["java", "sql", "python", "html css", "javascript", "git"],
        "preferred_skills": ["spring boot", "microservices", "angular", "react", "cloud basics"],
        "interview_stages": [
            {"stage": "Online Test (NQT)", "description": "Aptitude, coding, verbal ability — National Qualifier Test."},
            {"stage": "Technical Interview", "description": "30-45 min covering CS fundamentals, projects, and one language in depth."},
            {"stage": "HR Interview", "description": "20-30 min behavioral and cultural fit assessment."},
        ],
        "prep_timeline": "4-6 weeks recommended.",
        "resources": [
            "https://www.tcs.com/careers",
            "https://www.faceprep.in/tcs-nqt",
        ],
        "tips": [
            "NQT score is valid for 2 years — prepare thoroughly.",
            "Focus on CS fundamentals: DBMS, OS, OOP concepts.",
            "Be ready to explain academic/internship projects in detail.",
        ],
        "avg_difficulty": "easy-medium",
    },
    {
        "company_name": "Infosys",
        "company_slug": "infosys",
        "category": "service",
        "required_skills": ["java", "python", "sql", "html css", "javascript"],
        "preferred_skills": ["spring", "react", "angular", "rest apis", "agile"],
        "interview_stages": [
            {"stage": "Online Assessment", "description": "Aptitude, logical reasoning, verbal ability, and one coding question."},
            {"stage": "Technical Interview", "description": "30-45 min covering programming fundamentals and projects."},
            {"stage": "HR Interview", "description": "20-30 min behavioral assessment and location/salary discussion."},
        ],
        "prep_timeline": "3-5 weeks recommended.",
        "resources": [
            "https://www.infosys.com/careers.html",
            "https://www.faceprep.in/infosys",
        ],
        "tips": [
            "Infosys values strong communication skills alongside technical ability.",
            "Prepare DBMS queries — SQL is frequently tested.",
            "Have a clear explanation of your final year project.",
        ],
        "avg_difficulty": "easy",
    },
    {
        "company_name": "Wipro",
        "company_slug": "wipro",
        "category": "service",
        "required_skills": ["java", "python", "sql", "html css", "c"],
        "preferred_skills": ["javascript", "react", "spring boot", "cloud basics", "agile"],
        "interview_stages": [
            {"stage": "Online Test", "description": "Aptitude, coding (1-2 problems), and verbal ability."},
            {"stage": "Technical Interview", "description": "30-40 min covering CS fundamentals, OOP, and one coding problem."},
            {"stage": "HR Interview", "description": "20-30 min behavioral and relocation discussion."},
        ],
        "prep_timeline": "3-5 weeks recommended.",
        "resources": [
            "https://careers.wipro.com/",
            "https://www.faceprep.in/wipro",
        ],
        "tips": [
            "Wipro's Elite NLTH is the main hiring channel for freshers.",
            "Be comfortable with basic C/C++ pointer and memory questions.",
            "Practice explaining projects concisely in 2-3 minutes.",
        ],
        "avg_difficulty": "easy",
    },
    {
        "company_name": "Flipkart",
        "company_slug": "flipkart",
        "category": "startup",
        "required_skills": ["python", "java", "data structures", "algorithms", "system design", "sql"],
        "preferred_skills": ["distributed systems", "kafka", "redis", "microservices", "react"],
        "interview_stages": [
            {"stage": "Online Assessment", "description": "2-3 coding problems, 75-90 minutes, medium-hard."},
            {"stage": "Phone Screen", "description": "45-min coding round with senior engineer."},
            {"stage": "Onsite (3-4 rounds)", "description": "2 coding, 1 system design, 1 cultural fit."},
        ],
        "prep_timeline": "6-8 weeks recommended.",
        "resources": [
            "https://www.flipkart.com/careers",
            "https://leetcode.com/company/flipkart/",
        ],
        "tips": [
            "Flipkart values problem-solving speed and ownership.",
            "System design for e-commerce scale (100M+ users) is common.",
            "Understand supply chain and logistics domain basics.",
        ],
        "avg_difficulty": "medium-hard",
    },
    {
        "company_name": "Razorpay",
        "company_slug": "razorpay",
        "category": "startup",
        "required_skills": ["python", "javascript", "data structures", "algorithms", "sql", "rest apis"],
        "preferred_skills": ["react", "nodejs", "postgresql", "redis", "fintech domain"],
        "interview_stages": [
            {"stage": "Online Assessment", "description": "1-2 coding problems + MCQs on CS fundamentals."},
            {"stage": "Technical Round 1", "description": "60-min coding interview focusing on problem-solving approach."},
            {"stage": "Technical Round 2", "description": "60-min system design or deep-dive into past projects."},
            {"stage": "Culture Fit", "description": "30-min conversation with hiring manager about values and growth."},
        ],
        "prep_timeline": "5-7 weeks recommended.",
        "resources": [
            "https://razorpay.com/careers/",
            "https://leetcode.com/",
        ],
        "tips": [
            "Understand payment processing fundamentals (UPI, cards, wallets).",
            "Razorpay values ownership — show side projects you built end-to-end.",
            "Be prepared to discuss database schema design for financial systems.",
        ],
        "avg_difficulty": "medium",
    },
    {
        "company_name": "CRED",
        "company_slug": "cred",
        "category": "startup",
        "required_skills": ["javascript", "typescript", "python", "data structures", "algorithms", "react"],
        "preferred_skills": ["react native", "nodejs", "postgresql", "redis", "microservices"],
        "interview_stages": [
            {"stage": "Online Assessment", "description": "2 coding problems, 60 minutes."},
            {"stage": "Technical Round 1", "description": "45-min coding + CS fundamentals."},
            {"stage": "Technical Round 2", "description": "45-min system design or frontend deep-dive."},
            {"stage": "Founder Round", "description": "30-min conversation with engineering leadership about craft and taste."},
        ],
        "prep_timeline": "5-8 weeks recommended.",
        "resources": [
            "https://cred.club/careers",
            "https://leetcode.com/",
        ],
        "tips": [
            "CRED is known for design quality — showcase beautiful UI work.",
            "Craft matters: write clean, readable code with good naming.",
            "Be ready to discuss product thinking, not just technical skills.",
        ],
        "avg_difficulty": "medium-hard",
    },
]


def _get_company_by_slug(slug: str) -> dict | None:
    """Find a company by its slug."""
    for company in SEED_COMPANIES:
        if company["company_slug"] == slug:
            return company
    return None


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/companies")
async def list_companies():
    """
    Return the list of available companies with basic metadata.
    No authentication required.
    """
    return [
        {
            "company_name": c["company_name"],
            "company_slug": c["company_slug"],
            "category": c["category"],
            "avg_difficulty": c["avg_difficulty"],
            "required_skills_count": len(c["required_skills"]),
            "preferred_skills_count": len(c["preferred_skills"]),
        }
        for c in SEED_COMPANIES
    ]


@router.get("/{slug}")
async def get_company_detail(
    slug: str,
    user: AuthUser = Depends(get_current_user),
):
    """
    Return full company preparation data with a personalized skill-match
    analysis comparing the user's detected skills against the company's
    required and preferred skills.
    """
    company = _get_company_by_slug(slug)
    if not company:
        raise HTTPException(status_code=404, detail=f"Company '{slug}' not found.")

    try:
        sb = get_supabase()

        # ── Fetch user's latest resume skills ──────────────────────────
        resume_resp = (
            sb.table("resumes")
            .select("detected_skills")
            .eq("user_email", user.email)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        user_skills = set()
        if resume_resp.data:
            user_skills = set(resume_resp.data[0].get("detected_skills") or [])

    except EnvironmentError:
        user_skills = set()
    except Exception as e:
        log.warning("Failed to fetch user skills for company prep: %s", e)
        user_skills = set()

    # ── Skill matching ─────────────────────────────────────────────────
    required = set(company["required_skills"])
    preferred = set(company["preferred_skills"])

    matched_required = sorted(required & user_skills)
    missing_required = sorted(required - user_skills)
    matched_preferred = sorted(preferred & user_skills)
    missing_preferred = sorted(preferred - user_skills)

    required_pct = round((len(matched_required) / len(required)) * 100) if required else 0
    preferred_pct = round((len(matched_preferred) / len(preferred)) * 100) if preferred else 0
    overall_pct = round(
        ((len(matched_required) + len(matched_preferred)) / (len(required) + len(preferred))) * 100
    ) if (required or preferred) else 0

    return {
        **company,
        "skill_match": {
            "required_coverage_percent": required_pct,
            "preferred_coverage_percent": preferred_pct,
            "overall_coverage_percent": overall_pct,
            "matched_required": matched_required,
            "missing_required": missing_required,
            "matched_preferred": matched_preferred,
            "missing_preferred": missing_preferred,
            "total_required": len(required),
            "total_preferred": len(preferred),
        },
    }
