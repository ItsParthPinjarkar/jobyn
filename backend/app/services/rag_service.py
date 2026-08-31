"""
rag_service.py — Retrieval-Augmented Generation engine.

Pipeline:
  1. On cold start, check if knowledge_chunks table has data.
  2. For study material requests:
     a. Try Redis cache first (Phase 2 cache layer).
     b. If miss → embed the query via Gemini gemini-embedding-001.
     c. Call match_knowledge() Supabase RPC to retrieve top-5 relevant chunks.
     d. Inject retrieved context into structured LLM prompt.
     e. Run judge validation pass.
     f. Store in Redis cache with 24h TTL.
  3. Return structured tutorial with source citations.
"""

import os
import json
import logging
import hashlib
from typing import List, Dict, Any, Optional

from app.utils.llm_utils import extract_content, parse_json_from_llm
from app.core.settings import settings

log = logging.getLogger("rag_service")

# ── Optional Redis ────────────────────────────────────────────────────────────
try:
    import redis as redis_lib
    _redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    _redis: Optional[redis_lib.Redis] = redis_lib.Redis.from_url(_redis_url, decode_responses=True, socket_connect_timeout=2)
    _redis.ping()
    log.info("Redis connected at %s", _redis_url)
except Exception as e:
    log.warning("Redis unavailable — caching disabled: %s", e)
    _redis = None


# ── Supabase client ────────────────────────────────────────────────────────────
def _get_sb():
    from app.core.supabase_client import get_supabase
    return get_supabase()


# ── Gemini Embeddings ─────────────────────────────────────────────────────────
def embed_text(text: str) -> Optional[List[float]]:
    """Embed a string using Gemini gemini-embedding-001 (3072 dims)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        log.warning("GEMINI_API_KEY not set — embedding unavailable.")
        return None
    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        embed_res = client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=text,
        )
        return embed_res.embeddings[0].values
    except Exception as e:
        log.error("Gemini embedding failed: %s", e)
        return None


# ── Vector Retrieval ──────────────────────────────────────────────────────────
def retrieve_context(query: str, match_count: int = 5) -> List[Dict[str, Any]]:
    """
    Embed the query and retrieve top-k similar chunks from PGVector.
    Returns list of {topic, content, similarity} dicts.
    Falls back to [] if Supabase or Gemini are unavailable.
    """
    embedding = embed_text(query)
    if embedding is None:
        return []

    try:
        sb = _get_sb()
        resp = sb.rpc(
            "match_knowledge",
            {"query_embedding": embedding, "match_count": match_count}
        ).execute()
        return resp.data or []
    except Exception as e:
        log.error("Vector retrieval failed: %s", e)
        return []


# ── Redis Cache ────────────────────────────────────────────────────────────────
def _cache_key(skill: str, content_type: str = "tutorial") -> str:
    normalized = hashlib.md5(skill.lower().strip().encode()).hexdigest()[:8]
    return f"jobyn:{content_type}:{normalized}:{skill.lower().strip()}"


def _cache_get(key: str) -> Optional[Dict]:
    if _redis is None:
        return None
    try:
        raw = _redis.get(key)
        return json.loads(raw) if raw else None
    except Exception as e:
        log.warning("Cache read error: %s", e)
        return None


def _cache_set(key: str, value: Dict, ttl_seconds: int = settings.RAG_CACHE_TTL):
    if _redis is None:
        return
    try:
        _redis.setex(key, ttl_seconds, json.dumps(value))
    except Exception as e:
        log.warning("Cache write error: %s", e)


# ── Gemini LLM Adapter ────────────────────────────────────────────────────────
def _gemini_generate(prompt: str) -> Optional[str]:
    """Generate text using Gemini directly (no Bytez required)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        log.warning("GEMINI_API_KEY not set — LLM generation unavailable.")
        return None
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        res = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )
        return res.text
    except Exception as e:
        log.error("Gemini generation failed: %s", e)
        return None


# ── Judge Model ───────────────────────────────────────────────────────────────
async def _judge_content(reference: str, generated: str, model=None) -> str:
    """
    Asks the LLM to verify that generated content doesn't contradict the reference.
    Returns: 'valid', 'minor_inconsistency', or 'major_contradiction'.
    """
    judge_prompt = f"""
You are a technical fact-checker.

REFERENCE MATERIAL:
{reference[:1500]}

GENERATED CONTENT:
{generated[:1500]}

Does the generated content contradict the reference material?
Return ONLY ONE of these exact strings: valid | minor_inconsistency | major_contradiction
"""
    try:
        if model:
            res = model.run([{"role": "user", "content": judge_prompt}])
            content = extract_content(res).strip().lower()
        else:
            text = _gemini_generate(judge_prompt)
            if not text:
                return "valid"
            content = text.strip().lower()
        if "major" in content:
            return "major_contradiction"
        if "minor" in content:
            return "minor_inconsistency"
        return "valid"
    except Exception as e:
        log.error("Judge failed: %s", e)
        return "valid"


# ── RAG Study Material Generator ──────────────────────────────────────────────
async def generate_rag_tutorial(skill: str, existing_skills: str = "", model=None) -> Dict[str, Any]:
    """
    Full RAG pipeline:
    1. Redis cache check.
    2. PGVector retrieval.
    3. Structured prompt generation.
    4. Judge validation (regenerate once if major contradiction).
    5. Cache and return with citations.
    """
    cache_key = _cache_key(skill, "tutorial")

    # Step 1 — Redis cache hit
    cached = _cache_get(cache_key)
    if cached:
        log.info("Cache HIT for [%s]", skill)
        cached["_cache_hit"] = True
        return cached

    log.info("Cache MISS for [%s] — running RAG pipeline.", skill)

    # Step 2 — Retrieve context from knowledge base
    chunks = retrieve_context(skill)
    sources = [
        {"title": c.get("topic", skill), "source_type": "Curated Knowledge Base", "version": "v1.0", "similarity": round(c.get("similarity", 0), 3)}
        for c in chunks
    ]
    retrieved_text = "\n\n---\n\n".join([c.get("content", "") for c in chunks]) if chunks else ""

    # Build prompt — two modes:
    #   A) Reference-grounded when we have PGVector chunks
    #   B) Expert-generation when no chunks (works for ANY skill)
    if retrieved_text:
        reference_block = (
            f"Use the following verified reference material as your primary source:\n\n"
            f"{retrieved_text}\n\n"
            f"You may supplement with your own expert knowledge but stay consistent with the references."
        )
    else:
        reference_block = (
            f"No curated reference material is available for this topic.\n"
            f"Use your expert knowledge as a senior software engineer and educator to generate "
            f"comprehensive, accurate, and interview-ready content for: {skill}.\n"
            f"Include real-world examples, common interview patterns, and industry best practices."
        )

    prompt = f"""
You are a senior interview curriculum architect.

{reference_block}

Generate a structured, interview-focused tutorial JSON for: {skill}
Student already knows: [{existing_skills}]

Return this exact JSON format:
{{
  "skill": "{skill}",
  "quick_summary": "2-3 sentence overview",
  "estimated_study_time": "45 minutes",
  "sub_roadmap": [{{"title": "Topic", "duration": "Time"}}],
  "detailed_content": [
    {{
      "subheading": "Section Title",
      "explanation": "Clear explanation with real-world analogy (2-3 paragraphs)",
      "algorithm": "Step 1: ...\nStep 2: ... (if applicable, else omit)",
      "example": "```python\n# Actual runnable code here\nresult = do_something()\nprint(result)\n```",
      "key_takeaway": "One-sentence key insight to remember",
      "try_it": "Mini challenge: Modify the above code to do X instead of Y",
      "complexity": "Time: O(n), Space: O(1) (if applicable, else omit)"
    }}
  ],
  "pro_tip": "industry tip...",
  "sources": []
}}

RULES:
- Every section MUST have a real, runnable code example in the 'example' field wrapped in markdown code fences (```python or ```javascript).
- Every section MUST have a 'key_takeaway' — a memorable one-liner.
- Every section MUST have a 'try_it' — a small hands-on challenge for the student.
- Keep each explanation under 200 words.
- Produce exactly 5 detailed_content sections:
  1. Concept Foundation (what it is + real-world analogy)
  2. Core Theory & How It Works (internals, diagrams described)
  3. Implementation with Code (full working example)
  4. Interview Patterns & Common Questions
  5. Practice Problems (2-3 problems with hints)
"""

    # Step 3 — LLM generation (Bytez model or Gemini fallback)
    result = None
    try:
        if model:
            res = model.run([{"role": "user", "content": prompt}])
            content = extract_content(res)
        else:
            content = _gemini_generate(prompt)
        if content:
            result = parse_json_from_llm(content)
    except Exception as e:
        log.error("RAG LLM generation failed: %s", e)

    if result is None:
        return {"skill": skill, "is_fallback": True, "sources": sources}

    # Step 4 — Judge validation
    if retrieved_text:
        verdict = await _judge_content(retrieved_text, json.dumps(result.get("detailed_content", [])), model)
        result["_judge_verdict"] = verdict

        # Regenerate once if major contradiction detected
        if verdict == "major_contradiction":
            log.warning("Judge detected major contradiction for [%s] — regenerating...", skill)
            try:
                if model:
                    res2 = model.run([{"role": "user", "content": prompt}])
                    content2 = extract_content(res2)
                else:
                    content2 = _gemini_generate(prompt)
                if content2:
                    parsed2 = parse_json_from_llm(content2)
                    if parsed2:
                        result = parsed2
                result["_judge_verdict"] = "regenerated"
            except Exception as e:
                log.error("Regeneration failed: %s", e)

    # Step 5 — Attach citations
    result["sources"] = sources if sources else [
        {"title": skill, "source_type": "AI Generated", "version": settings.BYTEZ_MODEL}
    ]

    # Step 6 — Cache in Redis
    _cache_set(cache_key, result)

    return result
