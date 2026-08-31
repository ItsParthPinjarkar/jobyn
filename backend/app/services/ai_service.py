import os
import logging
from typing import Optional, Dict, Any, List
from app.services.gemini_service import gemini_service
from app.services.bytez_service import bytez_service
from app.services.knowledge_service import knowledge_service
from app.services import rag_service
from app.utils.llm_utils import extract_content, parse_json_from_llm

log = logging.getLogger("ai_service")

# ── Section definitions for progressive generation ────────────────────────────
SECTION_DEFS = [
    {"idx": 0, "title": "Concept Foundation", "desc": "What it is, real-world analogy, why it matters"},
    {"idx": 1, "title": "Core Theory & How It Works", "desc": "Internals, mechanics, how things connect"},
    {"idx": 2, "title": "Implementation with Code", "desc": "Full working example with explanation"},
    {"idx": 3, "title": "Interview Patterns & Common Questions", "desc": "What interviewers ask, how to answer"},
    {"idx": 4, "title": "Practice Problems & LeetCode", "desc": "Curated problems with hints and difficulty"},
]


def _is_quality_content(data: dict) -> bool:
    """Check if generated content has enough quality (not truncated)."""
    dc = data.get("detailed_content", [])
    if len(dc) < 2:
        return False
    # At least 2 sections need code examples and key_takeaway
    good = sum(1 for s in dc if s.get("example") and s.get("key_takeaway"))
    return good >= 2


class AIService:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.bytez_key = os.getenv("BYTEZ_API_KEY")

    async def get_market_forecast(self, role: str, missing_skills: list) -> Dict[str, Any]:
        """Market forecast — checks Supabase cache first, then Bytez/Gemini, caches result."""
        cache_key = f"forecast_{role.lower().replace(' ', '_')}"
        cached = knowledge_service.get_cached_knowledge(cache_key, "forecast")
        if cached and not cached.get("is_fallback"):
            log.info("Forecast cache HIT for [%s]", role)
            cached["_cache_hit"] = True
            return cached

        result = None
        if self.bytez_key:
            result = await bytez_service.get_market_forecast(role, missing_skills)
        if (result is None or result.get("is_fallback")) and self.gemini_key:
            result = await gemini_service.get_market_forecast(role, missing_skills)
        if result is None or result.get("is_fallback"):
            return gemini_service._get_fallback(role, missing_skills)

        knowledge_service.cache_knowledge(cache_key, result, "forecast")
        return result

    # ── Dynamic Syllabus Generator (Coursera-style N sections) ────────────────

    async def get_or_create_syllabus(self, skill: str) -> List[Dict[str, Any]]:
        """Retrieve cached dynamic syllabus or compile a custom N-section syllabus via Gemini."""
        try:
            from app.core.supabase_client import get_supabase
            sb = get_supabase()
            resp = sb.table("dynamic_curriculums").select("sections").eq("skill", skill.lower()).limit(1).execute()
            if resp.data and resp.data[0].get("sections"):
                log.info("Syllabus cache HIT in dynamic_curriculums table for [%s]", skill)
                return resp.data[0]["sections"]
        except Exception as e:
            log.warning("Failed to fetch syllabus from dynamic_curriculums table: %s", e)

        # Build custom, depth-appropriate learning path dynamically
        prompt = f"""
        You are a Principal Curriculum Director at Coursera.
        Design a comprehensive, highly-structured learning path (syllabus) specifically for: {skill}.

        Divide the topic into an optimal number of sections (modules) based on its complexity:
        - For simple foundational topics, use 4-5 sections.
        - For intermediate/standard framework topics, use 6-8 sections.
        - For advanced/complex systems or data science topics, use 8-12 sections.

        Each section must have a unique title, a clear 2-sentence description of what will be covered, and estimated study duration in minutes.
        Ensure sections flow in a logical educational order (e.g. analogical/concept foundations first, then theory internals, intermediate setups, code implementation, production best-practices, and finally practice/quizzes).

        Return strictly a JSON object matching this structure:
        {{
          "sections": [
            {{
              "idx": 0,
              "title": "Module Title",
              "desc": "Detailed 2-sentence description of the core concepts, patterns, or tools to be learned in this section.",
              "duration": "15 minutes"
            }}
          ]
        }}
        """
        try:
            if self.gemini_key and gemini_service.client:
                from app.core.settings import settings
                response = gemini_service.client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                data = parse_json_from_llm(response.text)
                if data and data.get("sections"):
                    sections = data["sections"]
                    # Force proper integer indexing
                    for i, sec in enumerate(sections):
                        sec["idx"] = i
                    # Cache in DB
                    try:
                        from app.core.supabase_client import get_supabase
                        sb = get_supabase()
                        sb.table("dynamic_curriculums").upsert(
                            {"skill": skill.lower(), "sections": sections},
                            on_conflict="skill"
                        ).execute()
                        log.info("Cached dynamic syllabus in database for [%s] with %d sections", skill, len(sections))
                    except Exception as db_err:
                        log.warning("Failed to cache syllabus in dynamic_curriculums table: %s", db_err)
                    return sections
        except Exception as e:
            log.error("Failed to generate dynamic syllabus for [%s]: %s", skill, e)

        # High-quality fallback syllabus matching old structural template
        fallback_sections = [
            {"idx": 0, "title": "Concept Foundation", "desc": "What it is, real-world analogy, and why it matters.", "duration": "10 minutes"},
            {"idx": 1, "title": "Core Theory & How It Works", "desc": "Internals, mechanics, and how components interact.", "duration": "15 minutes"},
            {"idx": 2, "title": "Implementation with Code", "desc": "Practical working example code and step-by-step setup.", "duration": "15 minutes"},
            {"idx": 3, "title": "Interview Patterns & Questions", "desc": "Common questions asked by tech interviewers and answer strategies.", "duration": "10 minutes"},
            {"idx": 4, "title": "Practice Problems & LeetCode", "desc": "Handpicked LeetCode problems ranging from easy to hard.", "duration": "15 minutes"}
        ]
        return fallback_sections

    # ── Single-section generator (for progressive loading) ────────────────────

    def _section_prompt_dynamic(self, skill: str, section_idx: int, sections: List[Dict[str, Any]], existing_skills: str = "") -> str:
        """Build a dynamic prompt for ONE custom syllabus section."""
        # Find the matching section definition from the generated syllabus
        current_section = next((s for s in sections if s["idx"] == section_idx), None)
        if not current_section:
            current_section = {"title": f"Module {section_idx}", "desc": "Core advanced details and setup", "duration": "15 minutes"}

        title = current_section["title"]
        desc = current_section["desc"]
        is_last = (section_idx == len(sections) - 1)

        # Special prompt for the final Practice/LeetCode problems section
        if is_last:
            return f"""You are a senior coding interview coach.
            Generate a practice problems section for the topic '{skill}', specifically focusing on the final module '{title}' (described as: {desc}).

            Return valid JSON only:
            {{
              "subheading": "{title}",
              "explanation": "Overview of the key problem-solving patterns for {skill} (2 paragraphs max)",
              "example": "```python\\n# Full solution for a classic {skill} problem\\n# with comments explaining each step\\n```",
              "key_takeaway": "One sentence about the most important pattern to remember",
              "try_it": "Try solving the first Easy problem before looking at any hints",
              "complexity": "Varies by problem",
              "leetcode_problems": [
                {{
                  "title": "Exact LeetCode Problem Name",
                  "number": 1,
                  "difficulty": "Easy",
                  "url": "https://leetcode.com/problems/exact-slug/",
                  "pattern": "Which pattern this problem tests (e.g. Two Pointers, Sliding Window)",
                  "hint": "A helpful hint without giving away the solution",
                  "description": "1-2 sentence problem summary: what you receive as input and what you must return",
                  "example_input": "...",
                  "example_output": "..."
                }}
              ]
            }}

            RULES:
            - Include exactly 5 real LeetCode problems relevant to {skill}. Use ACTUAL LeetCode problem names, numbers, and URL slugs.
            - Mix difficulties: 2 Easy, 2 Medium, 1 Hard.
            - The example code MUST solve one of the listed problems completely with comments.
            - Every problem MUST have description, example_input, and example_output filled in.
            - Each URL must be a real leetcode.com/problems/slug/ link.
            - Do NOT invent fake problem numbers or names."""

        return f"""You are a senior interview curriculum architect.
        Generate ONE detailed study section for the topic '{skill}'.
        Section: "{title}" — Description: {desc}
        Student already knows: [{existing_skills}]

        Return valid JSON only (one object, NOT an array):
        {{
          "subheading": "{title}",
          "explanation": "Clear explanation with real-world analogy (2-3 paragraphs, under 200 words)",
          "algorithm": "Step 1: ...\\nStep 2: ... (if applicable, else omit this field)",
          "example": "```python\\n# Actual runnable code here — must be copy-pasteable\\nresult = compute()\\nprint(result)\\n```",
          "key_takeaway": "One memorable sentence summarizing this section",
          "try_it": "Mini challenge: modify the code above to handle edge case X",
          "complexity": "Time: O(n), Space: O(1) (if applicable, else omit)"
        }}

        RULES:
        - The example MUST be real runnable code in markdown fences.
        - key_takeaway and try_it are REQUIRED.
        - Keep explanation under 200 words.
        - Return ONLY the JSON object, no extra text."""

    async def _generate_single_section(self, skill: str, section_idx: int, sections: List[Dict[str, Any]], existing_skills: str = "") -> Optional[Dict[str, Any]]:
        """Generate a single section dynamically via Gemini or Bytez."""
        prompt = self._section_prompt_dynamic(skill, section_idx, sections, existing_skills)
        is_last = (section_idx == len(sections) - 1)

        def _validate_section(data, is_last_idx):
            if not data or not data.get("subheading"):
                return False
            if is_last_idx and not data.get("leetcode_problems"):
                log.warning("Last practice section missing leetcode_problems — rejecting")
                return False
            return True

        if self.gemini_key and gemini_service.client:
            try:
                from app.core.settings import settings
                response = gemini_service.client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                data = parse_json_from_llm(response.text)
                if _validate_section(data, is_last):
                    return data
            except Exception as e:
                log.warning("Gemini dynamic section %d failed for [%s]: %s", section_idx, skill, e)

        if self.bytez_key and bytez_service.model:
            try:
                res = bytez_service.model.run([{"role": "user", "content": prompt}])
                content = extract_content(res)
                data = parse_json_from_llm(content)
                if _validate_section(data, is_last):
                    return data
            except Exception as e:
                log.warning("Bytez dynamic section %d failed for [%s]: %s", section_idx, skill, e)

        return None

    async def get_study_section(self, skill: str, section_idx: int, existing_skills: str = "") -> Dict[str, Any]:
        """Generate or retrieve a single custom syllabus section for progressive loading."""
        cache_key = f"{skill.lower()}_section_{section_idx}"
        cached = knowledge_service.get_cached_knowledge(cache_key, "section")
        if cached:
            return cached

        # Fetch active dynamic syllabus
        sections = await self.get_or_create_syllabus(skill)
        section = await self._generate_single_section(skill, section_idx, sections, existing_skills)
        if section:
            knowledge_service.cache_knowledge(cache_key, section, "section")
            return section

        current_sec = next((s for s in sections if s["idx"] == section_idx), None)
        title = current_sec["title"] if current_sec else f"Section {section_idx}"
        return {
            "subheading": title,
            "explanation": f"Content for '{title}' is being compiled dynamically. Please refresh in a moment.",
            "is_fallback": True,
        }

    # ── Full study materials (intro-first approach) ───────────────────────────

    async def _gemini_study_intro(self, skill: str, sections: List[Dict[str, Any]], existing_skills: str = "") -> Optional[Dict[str, Any]]:
        """Generate the quick summary, roadmap, and the dynamic introductory Section 0."""
        if not self.gemini_key or not gemini_service.client:
            return None

        # Resolve syllabus sections into the roadmap payload
        sub_roadmap = [{"title": s["title"], "duration": s["duration"]} for s in sections]
        total_sections = len(sections)

        # Grab Section 0 specification
        sec_0 = sections[0] if len(sections) > 0 else {"title": "Concept Foundation", "desc": "Analogies and basics"}

        prompt = f"""You are a senior interview curriculum architect.
        Generate a study guide OVERVIEW with the first dynamic section for the topic '{skill}'.
        Student already knows: [{existing_skills}]

        Section to generate: "{sec_0['title']}" — Description: {sec_0['desc']}

        Return this exact JSON format:
        {{
          "skill": "{skill}",
          "quick_summary": "2-3 sentence overview of {skill} and why it matters for interviews",
          "estimated_study_time": "60 minutes",
          "detailed_content": [
            {{
              "subheading": "{sec_0['title']}",
              "explanation": "Clear explanation with real-world analogy (2-3 paragraphs, under 200 words)",
              "algorithm": "Step 1: ...\\nStep 2: ... (if applicable, else omit)",
              "example": "```python\\n# Actual runnable code\\nresult = compute()\\nprint(result)\\n```",
              "key_takeaway": "One memorable key takeaway sentence",
              "try_it": "Mini challenge for the student",
              "complexity": "Time: O(n), Space: O(1) (if applicable)"
            }}
          ],
          "pro_tip": "Industry expert tip about {skill}..."
        }}

        RULES:
        - detailed_content should have ONLY 1 section (the '{sec_0['title']}').
        - The example MUST be real runnable code.
        - Return ONLY the JSON object, no extra text."""

        try:
            from app.core.settings import settings
            response = gemini_service.client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            data = parse_json_from_llm(response.text)
            if data and data.get("detailed_content") and data.get("quick_summary"):
                data["sources"] = [{"title": skill, "source_type": "Gemini AI", "version": settings.GEMINI_MODEL}]
                data["sub_roadmap"] = sub_roadmap
                data["total_sections"] = total_sections
                return data
        except Exception as e:
            log.warning("Gemini dynamic study intro failed for [%s]: %s", skill, e)
        return None

    async def get_study_materials(self, skill: str, existing_skills: str = "") -> Dict[str, Any]:
        """Retrieve syllabus, overview, and starting section dynamically.

        Flow: knowledge_cache → RAG pipeline (PGVector + Gemini) → Gemini direct → fallback
        """
        # 1. Fetch cached syllabus first
        sections = await self.get_or_create_syllabus(skill)
        sub_roadmap = [{"title": s["title"], "duration": s["duration"]} for s in sections]

        # 2. Check full cached intro (L1 Redis + L2 Supabase)
        cached = knowledge_service.get_cached_knowledge(skill, "study")
        if cached and cached.get("quick_summary"):
            cached["sub_roadmap"] = sub_roadmap
            cached["total_sections"] = len(sections)
            return cached

        # 3. Try RAG pipeline (PGVector retrieval → Gemini with context → judge)
        try:
            rag_result = await rag_service.generate_rag_tutorial(skill, existing_skills)
            if rag_result and not rag_result.get("is_fallback"):
                rag_result["sub_roadmap"] = sub_roadmap
                rag_result["total_sections"] = len(sections)
                knowledge_service.cache_knowledge(skill, rag_result, "study")
                log.info("RAG pipeline produced content for [%s] (%d sources)", skill, len(rag_result.get("sources", [])))
                return rag_result
            else:
                log.info("RAG fallback for [%s] — trying direct Gemini.", skill)
        except Exception as e:
            log.warning("RAG pipeline failed for [%s]: %s — falling back to direct Gemini.", skill, e)

        # 4. Compile dynamically via Gemini (no RAG context)
        if self.gemini_key:
            intro = await self._gemini_study_intro(skill, sections, existing_skills)
            if intro:
                knowledge_service.cache_knowledge(skill, intro, "study")
                return intro

        # 5. Fallback study container
        return {
            "skill": skill,
            "quick_summary": f"Fundamentals and study guide for {skill}.",
            "sub_roadmap": sub_roadmap,
            "detailed_content": [{
                "subheading": sections[0]["title"],
                "explanation": f"Foundational concepts of {skill}. Complete the custom dynamic modules to learn more.",
                "key_takeaway": "Progressive loading is active.",
                "try_it": "Review the custom syllabus in the roadmap sidebar."
            }],
            "pro_tip": "Complete section-specific quizzes to master this topic.",
            "estimated_study_time": "45 mins",
            "total_sections": len(sections),
            "is_fallback": True,
        }

    # ── Section-Specific Quizzes (Challenging & Highly Targeted) ──────────────

    async def generate_section_quiz(self, skill: str, section_idx: int) -> Dict[str, Any]:
        """Generates a highly targeted 3-question MCQ quiz for a specific syllabus section."""
        cache_key = f"{skill.lower()}_section_{section_idx}_quiz"
        cached = knowledge_service.get_cached_knowledge(cache_key, "section_quiz")
        if cached:
            return cached

        # Load section syllabus & content for context
        sections = await self.get_or_create_syllabus(skill)
        current_section = next((s for s in sections if s["idx"] == section_idx), None)
        sec_title = current_section["title"] if current_section else f"Module {section_idx}"

        # Fetch actual section text content
        sec_content_cache = knowledge_service.get_cached_knowledge(f"{skill.lower()}_section_{section_idx}", "section")
        explanation = sec_content_cache.get("explanation", "") if sec_content_cache else ""
        example_code = sec_content_cache.get("example", "") if sec_content_cache else ""

        prompt = f"""
        You are an expert technical interviewer.
        Generate a highly-targeted 3-question multiple-choice quiz verifying understanding of the section "{sec_title}" for the topic "{skill}".

        Use the following section material for context to ensure the questions directly test the concepts explained:
        ---
        Section Explanation:
        {explanation}

        Section Code Example:
        {example_code}
        ---

        RULES:
        - Generate exactly 3 multiple-choice questions.
        - Questions must directly test concepts, logic, or code patterns explained in the text above.
        - Each question must have exactly 4 plausible options, a correct_index (0-3), and a comprehensive explanation explaining why the correct choice is right and others are wrong.

        Return strict JSON only matching this format:
        {{
          "skill": "{skill}",
          "section_idx": {section_idx},
          "section_title": "{sec_title}",
          "questions": [
            {{
              "id": 1,
              "question": "Targeted question based on the section content...",
              "options": ["A", "B", "C", "D"],
              "correct_index": 0,
              "explanation": "Detailed explanation...",
              "difficulty": "medium"
            }}
          ]
        }}
        """
        try:
            if self.gemini_key and gemini_service.client:
                from app.core.settings import settings
                response = gemini_service.client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                data = parse_json_from_llm(response.text)
                if data and data.get("questions"):
                    knowledge_service.cache_knowledge(cache_key, data, "section_quiz")
                    return data
        except Exception as e:
            log.error("Failed to generate section quiz for [%s] section %d: %s", skill, section_idx, e)

        # Fallback quiz
        return {
            "skill": skill,
            "section_idx": section_idx,
            "section_title": sec_title,
            "questions": [{
                "id": 1,
                "question": f"Which concept is key to {sec_title}?",
                "options": [f"Understanding the core principles of {skill}", "None of the above", "Both A and B", "All options"],
                "correct_index": 0,
                "explanation": f"Understanding the section material is the first step to mastering {skill}.",
                "difficulty": "medium"
            }],
            "is_fallback": True
        }

    async def generate_quiz(self, skill: str) -> Dict[str, Any]:
        """Generates a general 5-question mock quiz for the topic."""
        cached = knowledge_service.get_cached_knowledge(skill, "quiz")
        if cached:
            return cached

        prompt = f"""Generate 5 challenging multiple-choice interview preparation questions for {skill}.

        RULES:
        - Questions should be scenario-based, not trivial definitions.
        - Include code snippets in questions where applicable.
        - Each option should be plausible. Provide detailed explanations.
        - Mix difficulty: 2 medium, 2 hard, 1 expert.

        Return valid JSON only:
        {{
          "skill": "{skill}",
          "questions": [
            {{
              "id": 1,
              "question": "Scenario-based question...",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct_index": 0,
              "explanation": "Detailed explanation of why this is correct and why others are wrong.",
              "difficulty": "medium"
            }}
          ]
        }}"""
        try:
            if self.gemini_key and gemini_service.client:
                from app.core.settings import settings
                response = gemini_service.client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                data = parse_json_from_llm(response.text)
                if data and data.get("questions"):
                    knowledge_service.cache_knowledge(skill, data, "quiz")
                    return data
        except Exception as e:
            log.warning("Gemini general quiz failed for [%s]: %s", skill, e)

        return {
            "skill": skill,
            "questions": [{
                "id": 1,
                "question": f"Is {skill} important?",
                "options": ["Yes", "No", "Maybe", "I don't know"],
                "correct_index": 0,
                "explanation": "Of course it is.",
            }],
            "is_fallback": True,
        }

    async def get_chat_response(self, skill: str, user_query: str, chat_history: list = [], context: str = "") -> str:
        """Study Hub AI Assistant -- answers doubts about a specific skill."""
        if not self.bytez_key:
            return "AI Chat assistant is currently unavailable. Please try again later."

        material = knowledge_service.get_cached_knowledge(skill, "study")
        material_context = ""
        if material:
            material_context = f"\nStudy Summary: {material.get('quick_summary', '')}"
            for section in material.get("detailed_content", [])[:2]:
                material_context += f"\n- {section.get('subheading', '')}: {section.get('explanation', '')[:200]}"

        system_prompt = (
            f"You are a senior tutor specializing in {skill}.\n"
            f"Student Background: {context}\n"
            f"{material_context}\n"
            "Behavior: Be concise, accurate, and give code examples when relevant."
        )

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(chat_history[-5:])
        messages.append({"role": "user", "content": user_query})

        try:
            result = bytez_service.model.run(messages)
            output = ""
            if hasattr(result, "output") and isinstance(result.output, dict):
                output = result.output.get("content", "")
            elif isinstance(result, dict):
                output = result.get("output", {}).get("content", "") if isinstance(result.get("output"), dict) else str(result.get("output", ""))
            else:
                output = str(result)
            return output
        except Exception as e:
            log.error("Chat failed: %s", e)
            return "Sorry, I couldn't process that. Could you rephrase?"




ai_service = AIService()
