import os
import logging
from typing import Dict, Any, List

from app.utils.llm_utils import extract_content, parse_json_from_llm

log = logging.getLogger("ai_service")

class BytezService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model = None
        if api_key:
            try:
                # Based on the user's snippet
                import bytez
                self.sdk = bytez.Bytez(api_key)
                from app.core.settings import settings as _settings
                self.model = self.sdk.model(_settings.BYTEZ_MODEL)
            except Exception as e:
                log.error(f"Failed to initialize Bytez SDK: {e}")

    async def _get_scraped_context(self, skill: str) -> str:
        """Dynamically scrapes trusted sources to ground the AI model."""
        context = ""
        try:
            import wikipedia
            results = wikipedia.search(f"{skill} programming algorithm data structure", results=1)
            if results:
                page = wikipedia.page(results[0], auto_suggest=False)
                context = f"Source: Wikipedia\nTitle: {page.title}\n{page.summary}\n{page.content[:2000]}"
                return context
        except Exception as e:
            log.warning(f"Wiki scrape failed for {skill}: {e}")

        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(f"{skill} programming tutorial facts", max_results=3))
                if results:
                    context = "Source: Web Search Snippets\n"
                    for res in results:
                        context += f"Snippet: {res.get('body', '')}\n\n"
                    return context
        except Exception as e:
            log.warning(f"DDG scrape failed for {skill}: {e}")

        return ""

    async def get_study_materials(self, skill: str, existing_skills: str = "") -> Dict[str, Any]:
        """Provides personalized study materials for a skill."""
        if not self.model:
            return {"skill": skill, "is_fallback": True}

        scraped_data = await self._get_scraped_context(skill)
        context_prompt = f"\n\nBase your educational material strictly on this trusted external data to avoid hallucinations:\n{scraped_data}\n" if scraped_data else ""

        prompt = f"""
You are a senior software engineer and coding tutor.
Create a comprehensive study guide for: {skill}.
Student already knows: [{existing_skills}].

Return JSON format:
{{
  "skill": "{skill}",
  "quick_summary": "High-level overview...",
  "estimated_study_time": "45 minutes",
  "sub_roadmap": [
    {{"title": "Topic X", "duration": "Time"}}
  ],
  "detailed_content": [
    {{
      "subheading": "Section Title",
      "explanation": "Clear explanation with a real-world analogy (2-3 paragraphs)",
      "algorithm": "Step 1: ...\\nStep 2: ... (if applicable, else omit)",
      "example": "```python\\n# Actual runnable code\\nresult = compute()\\nprint(result)\\n```",
      "key_takeaway": "One memorable sentence summarizing this section",
      "try_it": "Mini challenge: modify the code above to handle edge case X",
      "complexity": "Time: O(n), Space: O(1) (if applicable, else omit)"
    }}
  ],
  "pro_tip": "Industry Hack..."
}}

RULES:
- Every section MUST have a runnable code example wrapped in markdown code fences (```python or ```javascript).
- Every section MUST have a 'key_takeaway' one-liner and a 'try_it' mini-challenge.
- Keep explanations under 200 words per section.
- Produce exactly 5 detailed_content sections.
{context_prompt}
        """
        try:
            res = self.model.run([{"role": "user", "content": prompt}])
            content = extract_content(res)
            data = parse_json_from_llm(content)
            if data:
                return data
            log.warning("Bytez study guide: JSON parse returned None")
            return {"skill": skill, "is_fallback": True}
        except Exception as e:
            log.error(f"Bytez Study Guide failed: {e}")
            return {"skill": skill, "is_fallback": True}

    async def generate_quiz(self, skill: str) -> Dict[str, Any]:
        """Generates 3 verification questions for a skill."""
        if not self.model:
            return {"is_fallback": True}

        prompt = f"""Generate 5 challenging multiple-choice questions to test mastery of {skill}.

RULES:
- Questions should be scenario-based, not trivial definitions.
- Include code snippets in questions where applicable.
- Each option should be plausible (no obvious wrong answers).
- Provide a clear, educational explanation for the correct answer.
- Mix difficulty: 2 medium, 2 hard, 1 expert.

Return valid JSON:
{{
  "skill": "{skill}",
  "questions": [
    {{
      "id": 1,
      "question": "Scenario-based question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Detailed explanation of why this answer is correct and why others are wrong.",
      "difficulty": "medium"
    }}
  ]
}}"""
        try:
            res = self.model.run([{"role": "user", "content": prompt}])
            content = extract_content(res)
            data = parse_json_from_llm(content)
            if data:
                return data
            return {"is_fallback": True}
        except Exception as e:
            log.error(f"Generate quiz failed: {e}")
            return {"is_fallback": True}

    async def get_market_forecast(self, role: str, missing: List[str]) -> Dict[str, Any]:
        """Generates market snapshot."""
        if not self.model:
            return {"is_fallback": True}
        skills_str = ', '.join(missing[:5])
        prompt = f"""You are a tech recruitment analyst. Generate a 2026 career market forecast.

Role: {role}
Key skills to analyze: {skills_str}

Return valid JSON:
{{
  "trend_title": "Market Insight for {role} — 2026",
  "growth_pct": 15,
  "summary": "2-3 sentence analysis of demand trends for this role and these skills.",
  "sources": [
    {{"name": "Industry Report or Platform Name", "url": "", "insight": "1-sentence key finding from this source"}},
    {{"name": "Another Source", "url": "", "insight": "1-sentence key finding"}}
  ]
}}

RULES:
- growth_pct should be a realistic number (5-30).
- Provide 2-4 sources with real platform/report names (e.g. Stack Overflow Survey, LinkedIn Jobs Report, Gartner, etc.).
- Each source must have a meaningful 'insight' string.
- Keep summary under 50 words."""
        try:
            res = self.model.run([{"role": "user", "content": prompt}])
            content = extract_content(res)
            data = parse_json_from_llm(content)
            if data:
                return data
            return {"is_fallback": True}
        except Exception as e:
            log.error(f"Generate forecast failed: {e}")
            return {"is_fallback": True}

bytez_service = BytezService(os.getenv("BYTEZ_API_KEY", ""))
