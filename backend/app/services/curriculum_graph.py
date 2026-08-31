"""
curriculum_graph.py — Skill dependency graph for structured learning progression.

Defines which prerequisite skills a student must master before unlocking a given topic.
This enables a structured curriculum instead of random topic access.
"""

from typing import List, Dict, Any

# Skill dependency map: skill → [prerequisites]
CURRICULUM_GRAPH: Dict[str, List[str]] = {
    # DSA Fundamentals
    "arrays": [],
    "strings": ["arrays"],
    "recursion": ["arrays"],
    "linked list": ["arrays", "recursion"],
    "stack": ["arrays", "linked list"],
    "queue": ["arrays", "linked list"],
    "hashing": ["arrays"],
    "binary search": ["arrays"],
    "sorting algorithms": ["arrays", "recursion"],

    # Trees
    "binary tree": ["recursion", "stack", "queue"],
    "binary search tree": ["binary tree", "binary search"],
    "avl tree": ["binary search tree"],
    "heap": ["arrays", "binary tree"],
    "trie": ["arrays", "hashing"],

    # Graphs
    "graph algorithms": ["binary tree", "hashing", "queue", "stack"],
    "bfs": ["graph algorithms", "queue"],
    "dfs": ["graph algorithms", "stack", "recursion"],
    "dijkstra": ["graph algorithms", "heap"],
    "topological sort": ["graph algorithms", "dfs"],
    "union find": ["arrays", "graph algorithms"],

    # Advanced DSA
    "dynamic programming": ["recursion", "arrays", "sorting algorithms"],
    "greedy algorithms": ["sorting algorithms", "arrays"],
    "backtracking": ["recursion", "arrays"],
    "segment tree": ["binary tree", "arrays"],
    "fenwick tree": ["arrays", "binary search"],

    # System Design / CS Fundamentals
    "time and space complexity": [],
    "object oriented programming": [],
    "databases": ["arrays", "hashing"],
    "sql": ["databases"],
    "rest api": ["object oriented programming"],
    "operating systems": [],
    "networking basics": [],

    # Languages
    "python": [],
    "java": [],
    "javascript": [],
    "c++": [],

    # Frameworks & Tools
    "react": ["javascript"],
    "nodejs": ["javascript"],
    "fastapi": ["python"],
    "django": ["python", "databases"],
    "spring boot": ["java", "databases"],
    "docker": ["operating systems", "networking basics"],
    "kubernetes": ["docker"],
    "git": [],

    # ML/AI
    "machine learning": ["python", "statistics basics", "linear algebra basics"],
    "deep learning": ["machine learning"],
    "nlp": ["deep learning"],
    "statistics basics": [],
    "linear algebra basics": [],
}


def get_prerequisites(skill: str) -> List[str]:
    """Return list of prerequisite skills for a given topic."""
    normalized = skill.lower().strip()
    return CURRICULUM_GRAPH.get(normalized, [])


def get_unlocked_skills(mastered: List[str]) -> List[str]:
    """
    Returns all skills that are currently unlocked given the mastered skill set.
    A skill is unlocked if ALL its prerequisites are in the mastered set.
    """
    mastered_set = {s.lower().strip() for s in mastered}
    unlocked = []
    for skill, prereqs in CURRICULUM_GRAPH.items():
        if skill not in mastered_set:  # Not already mastered
            if all(p in mastered_set for p in prereqs):  # All prereqs met
                unlocked.append(skill)
    return unlocked


def get_learning_path(target_skill: str, mastered: List[str]) -> List[str]:
    """
    Returns an ordered learning path from current mastery to the target skill.
    Uses topological sort via DFS to resolve all transitive dependencies.
    """
    mastered_set = {s.lower().strip() for s in mastered}
    target_normalized = target_skill.lower().strip()

    visited: set = set()
    path: List[str] = []

    def dfs(skill: str):
        if skill in visited or skill in mastered_set:
            return
        visited.add(skill)
        for prereq in CURRICULUM_GRAPH.get(skill, []):
            dfs(prereq)
        path.append(skill)

    dfs(target_normalized)
    return path


def get_curriculum_overview() -> Dict[str, Any]:
    """Return complete curriculum graph stats."""
    return {
        "total_skills": len(CURRICULUM_GRAPH),
        "entry_points": [s for s, prereqs in CURRICULUM_GRAPH.items() if not prereqs],
        "advanced_skills": [s for s, prereqs in CURRICULUM_GRAPH.items() if len(prereqs) >= 3],
        "graph": CURRICULUM_GRAPH,
    }


def can_unlock(skill: str, mastered: List[str], quiz_score: float = 0.0, min_quiz_score: float | None = None) -> Dict[str, Any]:
    """
    Check if a student can unlock the next skill.
    A skill unlocks when: all prerequisites mastered AND quiz score >= threshold.
    """
    if min_quiz_score is None:
        from app.core.settings import settings
        min_quiz_score = settings.MIN_QUIZ_UNLOCK_SCORE

    prereqs = get_prerequisites(skill)
    mastered_set = {s.lower().strip() for s in mastered}
    missing_prereqs = [p for p in prereqs if p not in mastered_set]

    locked_by_quiz = quiz_score < min_quiz_score and quiz_score > 0  # 0 means no quiz taken yet

    return {
        "skill": skill,
        "can_unlock": len(missing_prereqs) == 0 and not locked_by_quiz,
        "missing_prerequisites": missing_prereqs,
        "quiz_score": quiz_score,
        "quiz_threshold": min_quiz_score,
        "quiz_passed": quiz_score >= min_quiz_score or quiz_score == 0,
    }
