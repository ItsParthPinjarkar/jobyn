import os
import asyncio
import logging
from google import genai
from typing import List, Dict, Any

from app.core.cache import cache as _cache
from app.core.settings import settings

log = logging.getLogger("project_generator")

MAX_RETRIES = 3
INITIAL_BACKOFF = 2  # seconds


class ProjectGeneratorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

        # Bytez fallback client
        self._bytez_model = None
        bytez_key = os.getenv("BYTEZ_API_KEY", "")
        if bytez_key:
            try:
                import bytez as _bytez
                sdk = _bytez.Bytez(bytez_key)
                self._bytez_model = sdk.model(settings.BYTEZ_MODEL)
            except Exception as e:
                log.warning(f"Bytez fallback unavailable: {e}")

    def _cache_key(self, role: str, skills: List[str]) -> str:
        skills_tuple = "|".join(sorted([s.lower() for s in skills]))
        return f"project:{role}:{skills_tuple}"

    def _build_prompt(self, role: str, skills_str: str) -> str:
        return f"""
        Act as a Senior Tech Lead and Mentor.
        I am aiming for the role of '{role}' but I am missing the following core skills: {skills_str}.

        Generate a comprehensive, engaging capstone project in Markdown format that will force me to learn and combine these exact skills.
        The project should be realistic, something I can put on my resume, and provide a clear step-by-step implementation guide.

        Format the response in Markdown with the following sections:
        # Project Title
        ## 🎯 Overview (What it is and why it's useful)
        ## 🛠️ Tech Stack
        ## 📋 Requirements (Must-have features)
        ## 🛣️ Implementation Steps (Step-by-step guide)
        ## 🌟 Bonus Challenges (To stand out)
        """

    async def generate_project(self, role: str, skills: List[str]) -> Dict[str, Any]:
        """
        Uses Google Gemini to generate a capstone project markdown outline.
        Falls back to Bytez, then to a static template on failure.
        """
        cache_key = self._cache_key(role, skills)
        cached = _cache.get(cache_key)
        if cached:
            return cached

        skills_str = ", ".join(skills)
        prompt = self._build_prompt(role, skills_str)

        # ── 1. Try Gemini with retry + backoff ──────────────────────
        if self.api_key and self.client:
            result = await self._call_gemini_with_retry(prompt, role, skills, cache_key)
            if result:
                return result
            log.warning("Gemini exhausted after retries, trying Bytez fallback.")
        else:
            log.warning("No GEMINI_API_KEY configured.")

        # ── 2. Bytez fallback ───────────────────────────────────────
        if self._bytez_model:
            result = await self._call_bytez(prompt, role, skills, cache_key)
            if result:
                return result

        # ── 3. Static fallback ──────────────────────────────────────
        return self._fallback_project(role, skills)

    async def _call_gemini_with_retry(
        self, prompt: str, role: str, skills: List[str], cache_key: str
    ):
        backoff = INITIAL_BACKOFF
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = self.client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                result = {
                    "role": role,
                    "skills": skills,
                    "markdown": response.text,
                    "is_fallback": False,
                }
                _cache.set(cache_key, result, ttl=86400)
                return result
            except Exception as e:
                err_str = str(e)
                is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str
                if is_rate_limit and attempt < MAX_RETRIES:
                    log.warning(
                        f"Gemini 429 on attempt {attempt}/{MAX_RETRIES}, "
                        f"retrying in {backoff}s..."
                    )
                    await asyncio.sleep(backoff)
                    backoff *= 2
                else:
                    log.error(f"Gemini failed (attempt {attempt}): {e}")
                    return None
        return None

    async def _call_bytez(
        self, prompt: str, role: str, skills: List[str], cache_key: str
    ):
        try:
            res = self._bytez_model.run(
                [{"role": "user", "content": prompt}]
            )
            content = ""
            if isinstance(res, dict):
                content = (
                    res.get("output", {}).get("content", "")
                    if isinstance(res.get("output"), dict)
                    else str(res.get("output", ""))
                )
            elif hasattr(res, "output"):
                content = (
                    res.output.get("content", "")
                    if isinstance(res.output, dict)
                    else str(res.output)
                )
            else:
                content = str(res)

            if content:
                result = {
                    "role": role,
                    "skills": skills,
                    "markdown": content,
                    "is_fallback": False,
                }
                _cache.set(cache_key, result, ttl=86400)
                return result
        except Exception as e:
            log.error(f"Bytez fallback failed: {e}")
        return None

    def _fallback_project(self, role: str, skills: List[str]) -> Dict[str, Any]:
        skills_str = ", ".join(skills)
        markdown = f"""# {role} Starter Project

## 🎯 Overview
Build a basic web application or script that utilizes the following skills: **{skills_str}**.
This is a fallback project because the AI generation service is currently unavailable.

## 🛠️ Tech Stack
- {skills_str}
- Any framework of your choice

## 📋 Requirements
- Set up a repository.
- Integrate the missing skills into a cohesive workflow.
- Document how you used them.

## 🛣️ Implementation Steps
1. Setup your environment.
2. Read the documentation for {skills_str}.
3. Build a "Hello World" implementation.
4. Expand it into a full feature.
        """
        return {
            "role": role,
            "skills": skills,
            "markdown": markdown,
            "is_fallback": True
        }

project_generator_service = ProjectGeneratorService()
