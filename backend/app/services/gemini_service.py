import os
import asyncio
import logging
from google import genai
from typing import Dict, Any

from app.utils.llm_utils import parse_json_from_llm
from app.core.cache import cache as _cache
from app.core.settings import settings

log = logging.getLogger("ai_service")

MAX_RETRIES = 3
INITIAL_BACKOFF = 2  # seconds


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def _cache_key(self, role: str, missing_skills: list) -> str:
        return f"forecast:{role}|{'|'.join(sorted(s.lower() for s in missing_skills[:3]))}"

    async def get_market_forecast(self, role: str, missing_skills: list) -> Dict[str, Any]:
        """
        Uses Google Gemini to generate a dynamic market forecast.
        Results cached for 1 hour per (role, top_skills) combo.
        """
        cache_key = self._cache_key(role, missing_skills)

        # Check cache (Redis or in-memory)
        cached_data = _cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        if not self.api_key or not self.client:
            log.warning("No GEMINI_API_KEY found, returning fallback.")
            return self._get_fallback(role, missing_skills)

        skills_str = ", ".join(missing_skills[:3])
        prompt = f"""
        Role: {role}
        Top missing skills: {skills_str}

        Act as a senior tech recruitment analyst specializing in the Indian engineering job market.
        Generate a career readiness forecast for 2026.

        Use these REAL data sources to ground your analysis:
        - Bureau of Labor Statistics (BLS) Occupational Outlook Handbook
        - LinkedIn Jobs & Emerging Jobs Report (India)
        - Indeed India Salary & Hiring Trends
        - Glassdoor India Tech Salary Data
        - Stack Overflow Developer Survey 2025
        - NASSCOM India Tech Industry Reports
        - GitHub Octoverse Language & Repository Trends

        For the role "{role}" with missing skills [{skills_str}], provide:
        1. Projected demand growth (%) for this role in India over the next 2 years
        2. Median salary range in INR (lakhs per annum) for entry-level positions
        3. Top hiring companies in India for this role
        4. How acquiring the missing skills impacts employability

        Return valid JSON only in this format:
        {{
          "trend_title": "Market Forecast — {role} 2026",
          "growth_pct": number,
          "median_salary_inr": "X-Y LPA",
          "demand_level": "High | Very High | Moderate",
          "top_companies": ["Company1", "Company2", "Company3"],
          "summary": "2-3 sentence analysis grounded in real market data for India.",
          "sources": [
            {{"name": "Source Name", "url": "URL", "insight": "Specific data point or finding"}}
          ]
        }}
        """

        backoff = INITIAL_BACKOFF
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = await self.client.aio.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                text = response.text

                data = parse_json_from_llm(text)
                if data is None:
                    raise ValueError("Failed to parse JSON from Gemini response")
                # Add a timestamp to prove it's live
                from datetime import datetime
                data["trend_title"] = f"LIVE: {data.get('trend_title')} ({datetime.now().strftime('%H:%M:%S')})"
                data["is_fallback"] = False
                _cache.set(cache_key, data, ttl=settings.FORECAST_CACHE_TTL)
                return data

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
                    log.error(f"Gemini Forecast failed (attempt {attempt}): {e}")
                    break

        fb = self._get_fallback(role, missing_skills)
        fb["is_fallback"] = True
        return fb

    def _get_fallback(self, role: str, missing_skills: list) -> Dict[str, Any]:
        skill = missing_skills[0] if missing_skills else "general skills"

        return {
            "is_fallback": True,
            "trend_title": "Market Forecast Unavailable",
            "growth_pct": None,
            "median_salary_inr": "N/A",
            "demand_level": "N/A",
            "top_companies": [],
            "summary": f"Live market data is currently unavailable. Focus on strengthening your {skill} skills for {role} roles. Connect a Gemini API key for real-time AI-powered forecasts.",
            "sources": []
        }

gemini_service = GeminiService()
