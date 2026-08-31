"""
coding.py — coding practice problem endpoints.

Provides a curated set of coding problems with difficulty filters,
solution submission with test-case evaluation via subprocess, and
submission history per user.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from typing import Optional
import subprocess
import tempfile
import os
import json

from app.core.auth import get_current_user, AuthUser
from app.core.supabase_client import get_supabase
from app.core.rate_limiter import ai_limit
import logging

log = logging.getLogger(__name__)

router = APIRouter(prefix="/coding", tags=["Coding Practice"])

# ── Seed Problems ────────────────────────────────────────────────────────────

SEED_PROBLEMS = [
    {
        "id": 1,
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "easy",
        "skill_tags": ["python", "data structures", "algorithms"],
        "description": (
            "Given an array of integers `nums` and an integer `target`, return "
            "the indices of the two numbers such that they add up to `target`.\n\n"
            "You may assume that each input would have exactly one solution, and "
            "you may not use the same element twice.\n\n"
            "Return the answer in any order."
        ),
        "examples": [
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0, 1]", "explanation": "nums[0] + nums[1] == 9."},
            {"input": "nums = [3,2,4], target = 6", "output": "[1, 2]", "explanation": "nums[1] + nums[2] == 6."},
        ],
        "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
        "public_test_cases": [
            {"input": "[2,7,11,15]\n9", "expected": "[0, 1]"},
            {"input": "[3,2,4]\n6", "expected": "[1, 2]"},
            {"input": "[3,3]\n6", "expected": "[0, 1]"},
        ],
        "hidden_test_cases": [
            {"input": "[1,5,3,7]\n8", "expected": "[0, 3]"},
            {"input": "[-1,-2,-3,-4,-5]\n-8", "expected": "[2, 4]"},
        ],
        "starter_code_python": (
            "def two_sum(nums, target):\n"
            "    # Write your solution here\n"
            "    pass\n\n"
            "# Read input\n"
            "import json\n"
            "nums = json.loads(input())\n"
            "target = int(input())\n"
            "result = two_sum(nums, target)\n"
            "print(json.dumps(result))\n"
        ),
        "starter_code_javascript": (
            "function twoSum(nums, target) {\n"
            "    // Write your solution here\n"
            "}\n\n"
            "// Read input\n"
            "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');\n"
            "const nums = JSON.parse(lines[0]);\n"
            "const target = parseInt(lines[1]);\n"
            "console.log(JSON.stringify(twoSum(nums, target)));\n"
        ),
    },
    {
        "id": 2,
        "slug": "valid-parentheses",
        "title": "Valid Parentheses",
        "difficulty": "easy",
        "skill_tags": ["python", "data structures", "javascript"],
        "description": (
            "Given a string `s` containing just the characters '(', ')', '{', '}', "
            "'[' and ']', determine if the input string is valid.\n\n"
            "An input string is valid if:\n"
            "1. Open brackets must be closed by the same type of brackets.\n"
            "2. Open brackets must be closed in the correct order.\n"
            "3. Every close bracket has a corresponding open bracket of the same type."
        ),
        "examples": [
            {"input": 's = "()"', "output": "true", "explanation": ""},
            {"input": 's = "()[]{}"', "output": "true", "explanation": ""},
            {"input": 's = "(]"', "output": "false", "explanation": ""},
        ],
        "constraints": ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'"],
        "public_test_cases": [
            {"input": "()", "expected": "true"},
            {"input": "()[]{}", "expected": "true"},
            {"input": "(]", "expected": "false"},
        ],
        "hidden_test_cases": [
            {"input": "([)]", "expected": "false"},
            {"input": "{[]}", "expected": "true"},
            {"input": "(((", "expected": "false"},
        ],
        "starter_code_python": (
            "def is_valid(s):\n"
            "    # Write your solution here\n"
            "    pass\n\n"
            "print(str(is_valid(input())).lower())\n"
        ),
        "starter_code_javascript": (
            "function isValid(s) {\n"
            "    // Write your solution here\n"
            "}\n\n"
            "const s = require('fs').readFileSync('/dev/stdin', 'utf8').trim();\n"
            "console.log(isValid(s) ? 'true' : 'false');\n"
        ),
    },
    {
        "id": 3,
        "slug": "longest-substring-without-repeating",
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": "medium",
        "skill_tags": ["python", "algorithms", "javascript"],
        "description": (
            "Given a string `s`, find the length of the longest substring without "
            "repeating characters.\n\n"
            "A substring is a contiguous non-empty sequence of characters within a string."
        ),
        "examples": [
            {"input": 's = "abcabcbb"', "output": "3", "explanation": 'The answer is "abc", with length 3.'},
            {"input": 's = "bbbbb"', "output": "1", "explanation": 'The answer is "b", with length 1.'},
            {"input": 's = "pwwkew"', "output": "3", "explanation": 'The answer is "wke", with length 3.'},
        ],
        "constraints": ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."],
        "public_test_cases": [
            {"input": "abcabcbb", "expected": "3"},
            {"input": "bbbbb", "expected": "1"},
            {"input": "pwwkew", "expected": "3"},
        ],
        "hidden_test_cases": [
            {"input": "", "expected": "0"},
            {"input": "abcdef", "expected": "6"},
            {"input": "dvdf", "expected": "3"},
        ],
        "starter_code_python": (
            "def length_of_longest_substring(s):\n"
            "    # Write your solution here\n"
            "    pass\n\n"
            "print(length_of_longest_substring(input()))\n"
        ),
        "starter_code_javascript": (
            "function lengthOfLongestSubstring(s) {\n"
            "    // Write your solution here\n"
            "}\n\n"
            "const s = require('fs').readFileSync('/dev/stdin', 'utf8').trim();\n"
            "console.log(lengthOfLongestSubstring(s));\n"
        ),
    },
    {
        "id": 4,
        "slug": "merge-intervals",
        "title": "Merge Intervals",
        "difficulty": "medium",
        "skill_tags": ["python", "algorithms", "data structures"],
        "description": (
            "Given an array of intervals where intervals[i] = [start_i, end_i], "
            "merge all overlapping intervals, and return an array of the non-overlapping "
            "intervals that cover all the intervals in the input.\n\n"
            "The output should be sorted by the start time."
        ),
        "examples": [
            {"input": "intervals = [[1,3],[2,6],[8,10],[15,18]]", "output": "[[1,6],[8,10],[15,18]]", "explanation": "Since intervals [1,3] and [2,6] overlap, merge them into [1,6]."},
            {"input": "intervals = [[1,4],[4,5]]", "output": "[[1,5]]", "explanation": "Intervals [1,4] and [4,5] are considered overlapping."},
        ],
        "constraints": ["1 <= intervals.length <= 10^4", "intervals[i].length == 2", "0 <= start_i <= end_i <= 10^4"],
        "public_test_cases": [
            {"input": "[[1,3],[2,6],[8,10],[15,18]]", "expected": "[[1,6],[8,10],[15,18]]"},
            {"input": "[[1,4],[4,5]]", "expected": "[[1,5]]"},
        ],
        "hidden_test_cases": [
            {"input": "[[1,4],[0,4]]", "expected": "[[0,4]]"},
            {"input": "[[1,4],[2,3]]", "expected": "[[1,4]]"},
            {"input": "[[1,1]]", "expected": "[[1,1]]"},
        ],
        "starter_code_python": (
            "import json\n\n"
            "def merge(intervals):\n"
            "    # Write your solution here\n"
            "    pass\n\n"
            "intervals = json.loads(input())\n"
            "result = merge(intervals)\n"
            "print(json.dumps(result))\n"
        ),
        "starter_code_javascript": (
            "function merge(intervals) {\n"
            "    // Write your solution here\n"
            "}\n\n"
            "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim();\n"
            "const intervals = JSON.parse(lines);\n"
            "console.log(JSON.stringify(merge(intervals)));\n"
        ),
    },
    {
        "id": 5,
        "slug": "trapping-rain-water",
        "title": "Trapping Rain Water",
        "difficulty": "hard",
        "skill_tags": ["python", "algorithms", "data structures", "javascript"],
        "description": (
            "Given `n` non-negative integers representing an elevation map where "
            "the width of each bar is 1, compute how much water it can trap after raining.\n\n"
            "You must solve this using O(1) extra space (beyond the input)."
        ),
        "examples": [
            {"input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]", "output": "6", "explanation": "6 units of rain water are trapped."},
            {"input": "height = [4,2,0,3,2,5]", "output": "9", "explanation": "9 units of rain water are trapped."},
        ],
        "constraints": ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"],
        "public_test_cases": [
            {"input": "[0,1,0,2,1,0,1,3,2,1,2,1]", "expected": "6"},
            {"input": "[4,2,0,3,2,5]", "expected": "9"},
        ],
        "hidden_test_cases": [
            {"input": "[1,0,1]", "expected": "1"},
            {"input": "[5,4,1,2]", "expected": "1"},
            {"input": "[2,0,2]", "expected": "2"},
        ],
        "starter_code_python": (
            "import json\n\n"
            "def trap(height):\n"
            "    # Write your solution here\n"
            "    pass\n\n"
            "height = json.loads(input())\n"
            "print(trap(height))\n"
        ),
        "starter_code_javascript": (
            "function trap(height) {\n"
            "    // Write your solution here\n"
            "}\n\n"
            "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim();\n"
            "const height = JSON.parse(lines);\n"
            "console.log(trap(height));\n"
        ),
    },
]

# Build lookup maps
_PROBLEM_BY_ID = {p["id"]: p for p in SEED_PROBLEMS}
_PROBLEM_BY_SLUG = {p["slug"]: p for p in SEED_PROBLEMS}

# ── Execution helpers ────────────────────────────────────────────────────────

EXEC_TIMEOUT = 5  # seconds


def _run_code(language: str, code: str, stdin_data: str) -> dict:
    """
    Execute code in a subprocess with a timeout.
    Returns {"stdout": str, "stderr": str, "returncode": int, "timed_out": bool}.
    """
    result = {"stdout": "", "stderr": "", "returncode": 1, "timed_out": False}

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            if language == "python":
                filepath = os.path.join(tmpdir, "solution.py")
                cmd = ["python", filepath]
            elif language == "javascript":
                filepath = os.path.join(tmpdir, "solution.js")
                cmd = ["node", filepath]
            else:
                result["stderr"] = f"Unsupported language: {language}"
                return result

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(code)

            proc = subprocess.run(
                cmd,
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=EXEC_TIMEOUT,
                cwd=tmpdir,
            )

            result["stdout"] = proc.stdout.strip()
            result["stderr"] = proc.stderr.strip()
            result["returncode"] = proc.returncode

    except subprocess.TimeoutExpired:
        result["timed_out"] = True
        result["stderr"] = f"Execution timed out after {EXEC_TIMEOUT} seconds."
    except Exception as e:
        result["stderr"] = f"Execution error: {str(e)}"

    return result


# ── Request/Response models ──────────────────────────────────────────────────


class SubmitRequest(BaseModel):
    problem_id: int
    language: str
    code: str


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/problems")
async def list_problems(
    difficulty: Optional[str] = Query(None, description="Filter by difficulty: easy, medium, hard"),
    skill: Optional[str] = Query(None, description="Filter by skill tag"),
):
    """
    List available coding problems with optional difficulty and skill filters.
    Hidden test cases are excluded from the response.
    No authentication required.
    """
    problems = SEED_PROBLEMS

    if difficulty:
        diff_lower = difficulty.lower()
        if diff_lower not in ("easy", "medium", "hard"):
            raise HTTPException(status_code=400, detail="Difficulty must be easy, medium, or hard.")
        problems = [p for p in problems if p["difficulty"] == diff_lower]

    if skill:
        skill_lower = skill.lower()
        problems = [p for p in problems if skill_lower in [t.lower() for t in p["skill_tags"]]]

    return [
        {
            "id": p["id"],
            "slug": p["slug"],
            "title": p["title"],
            "difficulty": p["difficulty"],
            "skill_tags": p["skill_tags"],
        }
        for p in problems
    ]


@router.get("/problems/{slug}")
async def get_problem(slug: str):
    """
    Return full problem detail.  Hidden test cases are excluded.
    No authentication required.
    """
    problem = _PROBLEM_BY_SLUG.get(slug)
    if not problem:
        raise HTTPException(status_code=404, detail=f"Problem '{slug}' not found.")

    return {
        "id": problem["id"],
        "slug": problem["slug"],
        "title": problem["title"],
        "difficulty": problem["difficulty"],
        "skill_tags": problem["skill_tags"],
        "description": problem["description"],
        "examples": problem["examples"],
        "constraints": problem["constraints"],
        "public_test_cases": problem["public_test_cases"],
        "starter_code_python": problem["starter_code_python"],
        "starter_code_javascript": problem["starter_code_javascript"],
    }


@router.post("/submit")
@ai_limit
async def submit_solution(
    request: Request,
    body: SubmitRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Submit a coding solution.  Runs all test cases (public + hidden)
    in a subprocess with a 5-second timeout per case.  Persists the
    submission to the coding_submissions table.
    """
    problem = _PROBLEM_BY_ID.get(body.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail=f"Problem {body.problem_id} not found.")

    language = body.language.lower()
    if language not in ("python", "javascript"):
        raise HTTPException(
            status_code=400,
            detail="Supported languages: python, javascript.",
        )

    if not body.code or len(body.code.strip()) < 10:
        raise HTTPException(status_code=400, detail="Solution code is too short.")

    if len(body.code) > 50_000:
        raise HTTPException(status_code=400, detail="Solution code exceeds maximum length (50 KB).")

    # ── Run test cases ─────────────────────────────────────────────────
    all_cases = problem["public_test_cases"] + problem["hidden_test_cases"]
    test_results = []
    passed_count = 0
    overall_status = "accepted"

    for i, case in enumerate(all_cases):
        case_result = _run_code(language, body.code, case["input"])

        if case_result["timed_out"]:
            status = "time_limit"
        elif case_result["returncode"] != 0:
            status = "runtime_error"
        elif case_result["stdout"] == case["expected"]:
            status = "passed"
            passed_count += 1
        else:
            status = "wrong_answer"

        test_results.append({
            "case": i + 1,
            "status": status,
            "is_hidden": i >= len(problem["public_test_cases"]),
            # Only show expected/actual for public cases
            "expected": case["expected"] if i < len(problem["public_test_cases"]) else None,
            "actual": case_result["stdout"] if i < len(problem["public_test_cases"]) else None,
            "error": case_result["stderr"] if status in ("runtime_error", "time_limit") else None,
        })

        # Stop early on timeout or runtime error for efficiency
        if status in ("time_limit", "runtime_error"):
            overall_status = status
            break

    if overall_status == "accepted" and passed_count < len(all_cases):
        overall_status = "wrong_answer"
    elif overall_status == "accepted":
        overall_status = "accepted"

    submission_id = None
    try:
        sb = get_supabase()
        insert_resp = sb.table("coding_submissions").insert({
            "user_email": user.email,
            "problem_id": body.problem_id,
            "language": language,
            "code": body.code[:10000],
            "status": overall_status,
            "passed_count": passed_count,
            "total_count": len(all_cases),
        }).execute()
        if insert_resp.data:
            submission_id = insert_resp.data[0]["id"]
    except EnvironmentError:
        log.warning("Supabase not configured — submission not persisted.")
    except Exception as e:
        log.warning("Failed to persist submission: %s", e)

    return {
        "submission_id": submission_id,
        "status": overall_status,
        "passed": passed_count,
        "total": len(all_cases),
        "test_results": test_results,
    }


@router.get("/submissions")
async def list_submissions(
    user: AuthUser = Depends(get_current_user),
):
    """
    Return the authenticated user's coding submission history,
    most recent first.
    """
    try:
        sb = get_supabase()
        resp = (
            sb.table("coding_submissions")
            .select("id, problem_id, problem_slug, language, status, passed, total, created_at")
            .eq("user_email", user.email)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        return resp.data or []

    except EnvironmentError:
        raise HTTPException(status_code=503, detail="Database not configured.")
    except Exception:
        log.exception("Failed to fetch submissions")
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ── Code Tracer (Sandbox Visualization) ─────────────────────────────────────

TRACE_TIMEOUT = 10  # seconds (tracing is slower than plain execution)
MAX_TRACE_STEPS = 1000
MAX_CODE_LENGTH = 50000


class TraceRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""


class RunRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""


class TraceStep(BaseModel):
    line: int
    locals: dict
    output: str
    error: str | None
    event: str


class TraceResult(BaseModel):
    steps: list[TraceStep]
    total_steps: int
    timed_out: bool
    error: str | None
    language: str


# Python tracer harness — uses bdb for line-by-line execution tracing
_TRACER_HARNESS = r'''
import bdb
import sys
import json
import io
import traceback

MAX_STEPS = {max_steps}

def _safe_repr(val):
    """Truncate repr to prevent huge responses."""
    try:
        r = repr(val)
        return r[:200] + "..." if len(r) > 200 else r
    except Exception:
        return type(val).__name__

class CodeTracer(bdb.Bdb):
    def __init__(self):
        super().__init__()
        self.steps = []
        self.output_capture = io.StringIO()
        self._original_stdout = sys.stdout

    def user_line(self, frame):
        self._capture(frame, "line")

    def user_call(self, frame, argument_list):
        self._capture(frame, "call")

    def user_return(self, frame, return_value):
        self._capture(frame, "return")

    def user_exception(self, frame, exc_info):
        self._capture(frame, "exception", str(exc_info[1]))

    def _capture(self, frame, event, error=None):
        if len(self.steps) >= MAX_STEPS:
            self.set_quit()
            return
        if frame.f_code.co_filename != "<user_code>":
            return
        current_output = self.output_buffer.getvalue() if hasattr(self, "output_buffer") else ""
        loc = {{}}
        for k, v in frame.f_locals.items():
            if not k.startswith("__"):
                loc[k] = _safe_repr(v)
        self.steps.append({{
            "line": frame.f_lineno,
            "locals": loc,
            "output": current_output,
            "error": error,
            "event": event,
        }})

# Redirect stdout to capture print() calls
captured_output = io.StringIO()
sys.stdout = captured_output

tracer = CodeTracer()
user_code = """{escaped_code}"""

try:
    compiled = compile(user_code, "<user_code>", "exec")
    tracer.run(compiled, globals={{}}, locals={{}})
except SyntaxError as e:
    print(json.dumps({{"error": f"SyntaxError: {{e.msg}} at line {{e.lineno}}", "steps": []}}))
    sys.exit(0)
except Exception as e:
    pass  # tracer captures the exception step

# Get final output
final_output = captured_output.getvalue()

# Update all steps with accumulated output
output_so_far = ""
for step in tracer.steps:
    if step["output"]:
        output_so_far = step["output"]
    else:
        step["output"] = output_so_far

# If there was output after the last step, add it to the last step
if final_output and tracer.steps and not tracer.steps[-1]["output"]:
    tracer.steps[-1]["output"] = final_output

result = {{
    "steps": tracer.steps,
    "total_steps": len(tracer.steps),
    "timed_out": len(tracer.steps) >= MAX_STEPS,
    "error": None,
    "language": "python"
}}
print(json.dumps(result))
'''


def _trace_python(code: str, stdin_data: str = "") -> dict:
    """Trace Python code execution step-by-step using bdb."""

    # Escape code for embedding in the harness script
    escaped = code.replace("\\", "\\\\").replace('"""', '\\"\\"\\"').replace("'", "\\'")

    harness = _TRACER_HARNESS.format(
        max_steps=MAX_TRACE_STEPS,
        escaped_code=escaped,
    )

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            harness_path = os.path.join(tmpdir, "tracer_harness.py")
            with open(harness_path, "w", encoding="utf-8") as f:
                f.write(harness)

            proc = subprocess.run(
                ["python", harness_path],
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=TRACE_TIMEOUT,
                cwd=tmpdir,
            )

            if proc.returncode != 0 and not proc.stdout.strip():
                return {
                    "steps": [],
                    "total_steps": 0,
                    "timed_out": False,
                    "error": proc.stderr.strip() or "Tracer failed",
                    "language": "python",
                }

            try:
                result = json.loads(proc.stdout.strip())
                return result
            except json.JSONDecodeError:
                return {
                    "steps": [],
                    "total_steps": 0,
                    "timed_out": False,
                    "error": f"Tracer output parse error: {proc.stdout[:200]}",
                    "language": "python",
                }

    except subprocess.TimeoutExpired:
        return {
            "steps": [],
            "total_steps": 0,
            "timed_out": True,
            "error": f"Trace timed out after {TRACE_TIMEOUT} seconds.",
            "language": "python",
        }
    except Exception as e:
        return {
            "steps": [],
            "total_steps": 0,
            "timed_out": False,
            "error": f"Trace error: {str(e)}",
            "language": "python",
        }


def _trace_javascript(code: str, stdin_data: str = "") -> dict:
    """Trace JavaScript code — instrumentation-based approach."""
    # Simple line-step tracer for JS
    lines = code.strip().split("\n")
    if not lines:
        return {"steps": [], "total_steps": 0, "timed_out": False, "error": "Empty code", "language": "javascript"}

    # Build instrumented code that tracks execution
    instrumented = """
const __steps = [];
const __output = [];
const __origLog = console.log;
console.log = (...args) => { __output.push(args.map(String).join(' ')); __origLog(...args); };

try {
""" + "\n".join(f"  __steps.push({{line: {i+1}, locals: (() => {{ try {{ const __vars = {{}}; for (const __k in this) {{ if (typeof this[__k] !== 'function' && !__k.startsWith('__')) {{ __vars[__k] = String(this[__k]).slice(0, 200); }} }} return __vars; }} catch(e) {{ return {{}}; }} }})(), output: __output.join('\\n'), error: null, event: 'line' }});\n  {line}" for i, line in enumerate(lines)) + """
} catch(e) {
  __steps.push({line: __steps.length ? __steps[__steps.length-1].line : 1, locals: {}, output: __output.join('\\n'), error: e.message, event: 'exception'});
}

console.log = __origLog;
process.stdout.write(JSON.stringify({steps: __steps, total_steps: __steps.length, timed_out: false, error: null, language: 'javascript'}));
"""

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "trace.js")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(instrumented)

            proc = subprocess.run(
                ["node", filepath],
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=TRACE_TIMEOUT,
                cwd=tmpdir,
            )

            if proc.stdout.strip():
                try:
                    return json.loads(proc.stdout.strip())
                except json.JSONDecodeError:
                    pass

            return {
                "steps": [],
                "total_steps": 0,
                "timed_out": False,
                "error": proc.stderr.strip() or "JavaScript trace failed",
                "language": "javascript",
            }

    except subprocess.TimeoutExpired:
        return {
            "steps": [],
            "total_steps": 0,
            "timed_out": True,
            "error": f"Trace timed out after {TRACE_TIMEOUT} seconds.",
            "language": "javascript",
        }
    except Exception as e:
        return {
            "steps": [],
            "total_steps": 0,
            "timed_out": False,
            "error": f"Trace error: {str(e)}",
            "language": "javascript",
        }


@router.post("/trace")
@ai_limit
async def trace_code(request: Request, body: TraceRequest):
    """
    Execute code step-by-step and return line-by-line execution trace.
    Shows variable state at each line (like Python Tutor).
    No authentication required.
    """
    if len(body.code) > MAX_CODE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Code too long (max {MAX_CODE_LENGTH} chars).")

    language = body.language.lower()
    if language not in ("python", "javascript"):
        raise HTTPException(status_code=400, detail="Supported languages: python, javascript.")

    if language == "python":
        result = _trace_python(body.code, body.stdin)
    else:
        result = _trace_javascript(body.code, body.stdin)

    return result


@router.post("/run")
@ai_limit
async def run_code(request: Request, body: RunRequest):
    """
    Execute code and return stdout/stderr (no tracing).
    Lightweight alternative to /trace for quick code runs.
    No authentication required.
    """
    if len(body.code) > MAX_CODE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Code too long (max {MAX_CODE_LENGTH} chars).")

    language = body.language.lower()
    if language not in ("python", "javascript"):
        raise HTTPException(status_code=400, detail="Supported languages: python, javascript.")

    result = _run_code(language, body.code, body.stdin)
    return result
