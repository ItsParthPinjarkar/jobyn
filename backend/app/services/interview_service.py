"""
interview_service.py — AI Mock Interview Simulator.

Differentiator feature: An AI interviewer that conducts skill-specific
technical interviews with adaptive follow-up questions, real-time
evaluation, and detailed scoring.

Flow:
  1. /interview/start   → AI generates an opening question based on the skill.
  2. /interview/answer   → Student submits answer; AI evaluates + asks follow-up.
  3. /interview/end      → Returns full scorecard with strengths/weaknesses.
"""

import os
import logging
from typing import Dict, Any, List, Optional

from app.utils.llm_utils import extract_content, parse_json_from_llm
from app.core.settings import settings

log = logging.getLogger("interview_service")


class InterviewService:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.bytez_key = os.getenv("BYTEZ_API_KEY")

    def _get_model(self):
        """Get the best available LLM model."""
        if self.bytez_key:
            try:
                from app.services.bytez_service import bytez_service
                if bytez_service.model:
                    return ("bytez", bytez_service.model)
            except Exception:
                pass
        return ("gemini", None)

    async def _call_llm(self, prompt: str) -> Optional[str]:
        """Call the best available LLM and return raw text."""
        # Try Gemini first (better for structured interviews)
        if self.gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=self.gemini_key)
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                return response.text
            except Exception as e:
                log.warning("Gemini interview call failed: %s", e)

        # Bytez fallback
        if self.bytez_key:
            try:
                from app.services.bytez_service import bytez_service
                if bytez_service.model:
                    res = bytez_service.model.run([{"role": "user", "content": prompt}])
                    return extract_content(res)
            except Exception as e:
                log.warning("Bytez interview call failed: %s", e)

        return None

    async def start_interview(self, skill: str, difficulty: str = "medium", role: str = "") -> Dict[str, Any]:
        """
        Start a mock interview session. Returns the first question.
        """
        difficulty_guide = {
            "easy": "Ask fundamental conceptual questions suitable for a junior developer. Focus on definitions, basic usage, and simple scenarios.",
            "medium": "Ask intermediate questions that test practical understanding. Include scenario-based questions and expect trade-off analysis.",
            "hard": "Ask advanced questions similar to FAANG/top-tier company interviews. Include system design elements, optimization problems, and edge cases.",
        }

        diff_text = difficulty_guide.get(difficulty, difficulty_guide["medium"])

        prompt = f"""You are a senior technical interviewer at a top tech company.
You are conducting a mock interview focused on: {skill}
{f'The candidate is interviewing for: {role}' if role else ''}

Difficulty level: {difficulty}
{diff_text}

Generate the FIRST interview question. Make it specific, practical, and thought-provoking.
Ask ONE clear question that requires a substantive answer.

Return valid JSON only:
{{
  "question_number": 1,
  "question": "Your interview question here...",
  "category": "conceptual|coding|system-design|behavioral|problem-solving",
  "hint": "A subtle hint if the candidate struggles (DO NOT reveal the answer)",
  "expected_depth": "What a strong answer would cover (2-3 key points)",
  "time_estimate_seconds": 120
}}"""

        text = await self._call_llm(prompt)
        if not text:
            return self._fallback_question(skill, 1)

        data = parse_json_from_llm(text)
        if data and data.get("question"):
            data["skill"] = skill
            data["difficulty"] = difficulty
            return data

        return self._fallback_question(skill, 1)

    async def evaluate_answer(
        self,
        skill: str,
        question: str,
        answer: str,
        question_number: int,
        difficulty: str = "medium",
        history: List[Dict[str, str]] = [],
    ) -> Dict[str, Any]:
        """
        Evaluate the student's answer and generate a follow-up question
        that probes deeper or shifts based on their performance.
        """
        history_text = ""
        if history:
            history_text = "\nPrevious Q&A in this interview:\n"
            for h in history[-3:]:
                history_text += f"Q: {h.get('question', '')}\nA: {h.get('answer', '')}\nScore: {h.get('score', 'N/A')}/10\n\n"

        prompt = f"""You are a senior technical interviewer evaluating a candidate's answer.

Skill being tested: {skill}
Difficulty: {difficulty}
{history_text}

CURRENT QUESTION (#{question_number}): {question}

CANDIDATE'S ANSWER: {answer}

Evaluate the answer thoroughly and generate a follow-up question that adapts to their level.
If they answered well, go deeper or harder. If they struggled, try a different angle or simpler aspect.

Return valid JSON only:
{{
  "score": 7,
  "max_score": 10,
  "feedback": "Detailed evaluation of their answer — what was good, what was missing...",
  "key_points_covered": ["point1", "point2"],
  "key_points_missed": ["missed1"],
  "follow_up_question": {{
    "question_number": {question_number + 1},
    "question": "Next interview question based on their response...",
    "category": "conceptual|coding|system-design|behavioral|problem-solving",
    "hint": "A subtle hint",
    "expected_depth": "What a strong answer would cover",
    "time_estimate_seconds": 120
  }},
  "interviewer_note": "Brief encouraging or guiding comment to the candidate"
}}"""

        text = await self._call_llm(prompt)
        if not text:
            return self._fallback_evaluation(skill, question_number, answer)

        data = parse_json_from_llm(text)
        if data and data.get("score") is not None:
            return data

        return self._fallback_evaluation(skill, question_number, answer)

    async def end_interview(
        self,
        skill: str,
        difficulty: str,
        history: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive interview scorecard.
        """
        if not history:
            return {"error": "No interview data to evaluate."}

        qa_summary = ""
        total_score = 0
        max_total = 0
        for h in history:
            qa_summary += f"Q{h.get('question_number', '?')}: {h.get('question', '')}\n"
            qa_summary += f"A: {h.get('answer', '')}\n"
            qa_summary += f"Score: {h.get('score', 0)}/10\n\n"
            total_score += h.get("score", 0)
            max_total += 10

        prompt = f"""You are a senior technical interviewer writing a final assessment report.

Skill tested: {skill}
Difficulty: {difficulty}
Total Score: {total_score}/{max_total}

Full interview transcript:
{qa_summary}

Generate a comprehensive interview scorecard.

Return valid JSON only:
{{
  "overall_score": {total_score},
  "max_score": {max_total},
  "percentage": {round((total_score / max_total * 100) if max_total > 0 else 0)},
  "verdict": "STRONG_HIRE|HIRE|LEAN_HIRE|LEAN_NO_HIRE|NO_HIRE",
  "summary": "2-3 sentence overall assessment...",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["What to study next...", "Practice this..."],
  "skill_breakdown": {{
    "conceptual_understanding": 8,
    "practical_application": 7,
    "communication_clarity": 8,
    "problem_solving": 7,
    "depth_of_knowledge": 6
  }},
  "interview_ready": true,
  "suggested_next_topics": ["topic1", "topic2"]
}}"""

        text = await self._call_llm(prompt)
        if text:
            data = parse_json_from_llm(text)
            if data:
                data["skill"] = skill
                data["difficulty"] = difficulty
                data["questions_answered"] = len(history)
                return data

        # Manual scorecard if LLM fails
        pct = round((total_score / max_total * 100) if max_total > 0 else 0)
        return {
            "skill": skill,
            "difficulty": difficulty,
            "overall_score": total_score,
            "max_score": max_total,
            "percentage": pct,
            "verdict": "HIRE" if pct >= 70 else "LEAN_NO_HIRE" if pct >= 50 else "NO_HIRE",
            "summary": f"You scored {pct}% on {skill} ({difficulty} difficulty).",
            "strengths": ["Completed the full interview"],
            "weaknesses": ["Review areas where you scored below 7/10"],
            "recommendations": [f"Practice more {skill} problems", "Review fundamentals"],
            "skill_breakdown": {
                "conceptual_understanding": round(total_score / len(history)) if history else 5,
                "practical_application": round(total_score / len(history)) if history else 5,
                "communication_clarity": 7,
                "problem_solving": round(total_score / len(history)) if history else 5,
                "depth_of_knowledge": round(total_score / len(history)) if history else 5,
            },
            "interview_ready": pct >= 70,
            "suggested_next_topics": [skill],
            "questions_answered": len(history),
        }

    def _fallback_question(self, skill: str, q_num: int) -> Dict[str, Any]:
        """Fallback question when LLM is unavailable."""
        return {
            "skill": skill,
            "question_number": q_num,
            "question": f"Explain the core concepts of {skill} and how you would apply them in a real-world project.",
            "category": "conceptual",
            "hint": f"Think about the fundamental principles that make {skill} important.",
            "expected_depth": "Cover definition, use cases, and a practical example",
            "time_estimate_seconds": 120,
            "is_fallback": True,
        }

    def _fallback_evaluation(self, skill: str, q_num: int, answer: str) -> Dict[str, Any]:
        """Fallback evaluation when LLM is unavailable."""
        word_count = len(answer.split())
        score = min(7, max(3, word_count // 10))
        return {
            "score": score,
            "max_score": 10,
            "feedback": f"Your answer contained {word_count} words. For a more thorough evaluation, ensure the AI service is connected.",
            "key_points_covered": ["Answer provided"],
            "key_points_missed": ["Detailed evaluation unavailable"],
            "follow_up_question": self._fallback_question(skill, q_num + 1),
            "interviewer_note": "Keep going! Try to be more specific with examples.",
            "is_fallback": True,
        }


interview_service = InterviewService()
