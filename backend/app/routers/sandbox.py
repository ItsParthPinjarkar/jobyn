"""
sandbox.py — code execution sandbox with line-by-line tracing.

Provides two endpoints:
  - POST /sandbox/run    — execute code, return stdout/stderr
  - POST /sandbox/trace  — execute code step-by-step, return line-by-line state
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
import subprocess
import tempfile
import os
import sys
import json

import logging

from app.core.auth import get_current_user, AuthUser

log = logging.getLogger(__name__)

router = APIRouter(prefix="/sandbox", tags=["Sandbox"])

# ── Constants ─────────────────────────────────────────────────────────────────

EXEC_TIMEOUT = 5  # seconds
MAX_CODE_LENGTH = 10_000  # characters
MAX_STEPS = 500  # max trace steps to prevent infinite loops

# Env-var name fragments that may hold application secrets. User-submitted code
# runs in a subprocess whose environment is stripped of these, so it cannot read
# the API's credentials (Supabase keys, Gemini key, JWT secret, etc.) via os.environ.
_SENSITIVE_ENV_MARKERS = (
    "SECRET", "KEY", "TOKEN", "PASSWORD", "PASS", "CREDENTIAL", "SUPABASE",
    "GEMINI", "BYTEZ", "REDIS", "SENTRY", "ENCRYPTION", "DSN", "JWT", "API",
)


def _safe_subprocess_env() -> Dict[str, str]:
    """Return an OS environment for sandboxed subprocesses with application
    secrets removed (keeps PATH and other non-sensitive system vars)."""
    return {
        k: v for k, v in os.environ.items()
        if not any(marker in k.upper() for marker in _SENSITIVE_ENV_MARKERS)
    }


# Standalone tracer harness, executed in an isolated subprocess so user code
# never runs inside the API process (no access to its memory or secret env).
# __MAX_STEPS__ is substituted at call time.
_PYTHON_TRACER_HARNESS = r'''
import sys, io, json, bdb

MAX_STEPS = __MAX_STEPS__


def _vars(frame):
    out = {}
    for k, v in frame.f_locals.items():
        if k.startswith("__") and k.endswith("__"):
            continue
        try:
            r = repr(v)
            out[k] = (r[:200] + "...") if len(r) > 200 else r
        except Exception:
            out[k] = "<unrepresentable>"
    return out


def _run():
    with open(sys.argv[1], "r", encoding="utf-8") as fh:
        code = fh.read()
    steps = []
    captured = io.StringIO()
    count = [0]

    class Tracer(bdb.Bdb):
        def user_line(self, frame):
            count[0] += 1
            if count[0] > MAX_STEPS:
                self.set_quit(); return
            if frame.f_code.co_filename != "<sandbox>":
                return
            steps.append({"line": frame.f_lineno, "locals": _vars(frame),
                          "output": captured.getvalue(), "event": "line"})

        def user_call(self, frame, args):
            if frame.f_code.co_filename == "<sandbox>":
                count[0] += 1
                if count[0] > MAX_STEPS:
                    self.set_quit(); return
                steps.append({"line": frame.f_lineno, "locals": {},
                              "output": captured.getvalue(), "event": "call"})

        def user_return(self, frame, rv):
            if frame.f_code.co_filename == "<sandbox>":
                count[0] += 1
                if count[0] > MAX_STEPS:
                    self.set_quit(); return
                rr = repr(rv)
                rr = (rr[:200] + "...") if len(rr) > 200 else rr
                steps.append({"line": frame.f_lineno, "locals": {"return": rr},
                              "output": captured.getvalue(), "event": "return"})

        def user_exception(self, frame, exc_info):
            if frame.f_code.co_filename == "<sandbox>":
                etype, evalue = exc_info[0], exc_info[1]
                steps.append({"line": frame.f_lineno, "locals": {},
                              "output": captured.getvalue(),
                              "error": str(etype.__name__) + ": " + str(evalue),
                              "event": "exception"})

    error_msg = None
    old = sys.stdout
    sys.stdout = captured
    try:
        compiled = compile(code, "<sandbox>", "exec")
        Tracer().run(compiled)
    except bdb.BdbQuit:
        pass
    except SyntaxError as e:
        error_msg = "SyntaxError at line " + str(e.lineno) + ": " + str(e.msg)
        steps.append({"line": e.lineno or 1, "locals": {}, "output": captured.getvalue(),
                      "error": error_msg, "event": "exception"})
    except Exception as e:
        error_msg = type(e).__name__ + ": " + str(e)
        steps.append({"line": 0, "locals": {}, "output": captured.getvalue(),
                      "error": error_msg, "event": "exception"})
    finally:
        sys.stdout = old
    if count[0] > MAX_STEPS:
        error_msg = "Execution stopped after " + str(MAX_STEPS) + " steps (possible infinite loop)"
    sys.stdout.write(json.dumps({"steps": steps, "error": error_msg, "stdout": captured.getvalue()}))


_run()
'''

# ── Request/Response models ──────────────────────────────────────────────────


class RunRequest(BaseModel):
    code: str
    language: str = "python"
    stdin: str = ""


class TraceRequest(BaseModel):
    code: str
    language: str = "python"
    stdin: str = ""


class TraceStep(BaseModel):
    line: int
    locals: Dict[str, str] = {}
    output: str = ""
    error: Optional[str] = None
    event: str = "line"  # line, call, return, exception


class RunResponse(BaseModel):
    stdout: str
    stderr: str
    returncode: int
    timed_out: bool


class TraceResponse(BaseModel):
    steps: List[TraceStep]
    error: Optional[str] = None
    stdout: str = ""


# ── Python Tracer ─────────────────────────────────────────────────────────────


def _trace_python(code: str, stdin_data: str) -> TraceResponse:
    """Trace Python execution step-by-step in an ISOLATED subprocess.

    User code never runs inside the API process: it is executed by a separate
    Python interpreter (the tracer harness) with the application's secrets
    stripped from its environment, a temp working dir, a wall-clock timeout, and
    a step cap. The harness emits the trace as a single JSON line on stdout.
    """
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            code_path = os.path.join(tmpdir, "user_code.py")
            harness_path = os.path.join(tmpdir, "tracer_harness.py")
            with open(code_path, "w", encoding="utf-8") as f:
                f.write(code)
            with open(harness_path, "w", encoding="utf-8") as f:
                f.write(_PYTHON_TRACER_HARNESS.replace("__MAX_STEPS__", str(MAX_STEPS)))

            proc = subprocess.run(
                [sys.executable, harness_path, code_path],
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=EXEC_TIMEOUT,
                cwd=tmpdir,
                env=_safe_subprocess_env(),
            )

            out = proc.stdout.strip()
            if not out:
                return TraceResponse(
                    steps=[],
                    error=(proc.stderr.strip() or "Execution error")[:2000],
                    stdout="",
                )
            # Harness emits one JSON object as the final stdout line.
            try:
                data = json.loads(out.split("\n")[-1])
            except json.JSONDecodeError:
                return TraceResponse(steps=[], error="Failed to parse trace data", stdout="")

            steps = [TraceStep(**s) for s in data.get("steps", [])]
            return TraceResponse(steps=steps, error=data.get("error"), stdout=data.get("stdout", ""))

    except subprocess.TimeoutExpired:
        return TraceResponse(
            steps=[],
            error=f"Execution timed out after {EXEC_TIMEOUT} seconds",
            stdout="",
        )
    except FileNotFoundError:
        return TraceResponse(steps=[], error="Python interpreter not found.", stdout="")
    except Exception as e:
        return TraceResponse(steps=[], error=f"Trace error: {str(e)}", stdout="")


# ── JavaScript Tracer ─────────────────────────────────────────────────────────


def _trace_javascript(code: str, stdin_data: str) -> TraceResponse:
    """Trace JavaScript code by injecting trace calls."""
    import re

    lines = code.split("\n")
    traced_lines = []
    traced_lines.append("const __traceData__ = [];")
    traced_lines.append("const __origConsoleLog__ = console.log;")
    traced_lines.append("let __traceOutput__ = '';")
    traced_lines.append("console.log = function(...args) {")
    traced_lines.append("  __traceOutput__ += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\\n';")
    traced_lines.append("  __origConsoleLog__(...args);")
    traced_lines.append("};")
    traced_lines.append("function __trace__(line, vars) {")
    traced_lines.append("  __traceData__.push({line, locals: vars, output: __traceOutput__});")
    traced_lines.append("}")
    traced_lines.append("")

    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        # Skip empty lines, comments, opening/closing braces
        if not stripped or stripped.startswith("//") or stripped in ("{", "}", "};"):
            traced_lines.append(line)
            continue

        # Skip lines that are part of multi-line statements (rough heuristic)
        if stripped.startswith(".") or stripped.startswith(")") or stripped.startswith("]"):
            traced_lines.append(line)
            continue

        # Extract variable assignments for tracing
        var_match = re.match(r"(?:let|const|var)\s+(\w+)\s*=", stripped)
        assign_match = re.match(r"(\w+)\s*=", stripped)

        indent = len(line) - len(line.lstrip())
        indent_str = " " * indent

        if var_match:
            var_name = var_match.group(1)
            traced_lines.append(line)
            traced_lines.append(f'{indent_str}__trace__({i}, {{"{var_name}": JSON.stringify({var_name})}});')
        elif assign_match and not stripped.startswith(("if", "for", "while", "function", "class", "return", "switch", "try", "catch")):
            var_name = assign_match.group(1)
            traced_lines.append(line)
            traced_lines.append(f'{indent_str}__trace__({i}, {{"{var_name}": JSON.stringify({var_name})}});')
        else:
            traced_lines.append(line)
            traced_lines.append(f'{indent_str}__trace__({i}, {{}});')

    traced_lines.append("")
    traced_lines.append("console.log = __origConsoleLog__;")
    traced_lines.append("JSON.stringify(__traceData__);")

    traced_code = "\n".join(traced_lines)

    # Execute with Node.js
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "trace.js")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(traced_code)

            proc = subprocess.run(
                ["node", filepath],
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=EXEC_TIMEOUT,
                cwd=tmpdir,
                env=_safe_subprocess_env(),
            )

            if proc.returncode != 0:
                return TraceResponse(
                    steps=[],
                    error=proc.stderr.strip() if proc.stderr else "Execution error",
                    stdout=""
                )

            # Parse trace data from stdout (last line is JSON)
            output_lines = proc.stdout.strip().split("\n")
            json_str = output_lines[-1] if output_lines else "[]"

            try:
                trace_data = json.loads(json_str)
            except json.JSONDecodeError:
                return TraceResponse(
                    steps=[],
                    error="Failed to parse trace data",
                    stdout="\n".join(output_lines[:-1])
                )

            steps = []
            for item in trace_data:
                locals_dict = {}
                for k, v in item.get("locals", {}).items():
                    try:
                        parsed = json.loads(v) if isinstance(v, str) else v
                        locals_dict[k] = repr(parsed)
                    except (json.JSONDecodeError, TypeError):
                        locals_dict[k] = str(v)

                steps.append(TraceStep(
                    line=item.get("line", 0),
                    locals=locals_dict,
                    output=item.get("output", ""),
                    event="line"
                ))

            return TraceResponse(steps=steps, stdout=steps[-1].output if steps else "")

    except subprocess.TimeoutExpired:
        return TraceResponse(
            steps=[],
            error=f"Execution timed out after {EXEC_TIMEOUT} seconds",
            stdout=""
        )
    except FileNotFoundError:
        return TraceResponse(
            steps=[],
            error="Node.js not found. JavaScript execution requires Node.js installed.",
            stdout=""
        )
    except Exception as e:
        return TraceResponse(steps=[], error=f"Trace error: {str(e)}", stdout="")


# ── Simple Run (no tracing) ───────────────────────────────────────────────────


def _run_code(language: str, code: str, stdin_data: str) -> RunResponse:
    """Execute code in a subprocess with a timeout."""
    result = RunResponse(stdout="", stderr="", returncode=1, timed_out=False)

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            if language == "python":
                filepath = os.path.join(tmpdir, "solution.py")
                cmd = ["python", filepath]
            elif language == "javascript":
                filepath = os.path.join(tmpdir, "solution.js")
                cmd = ["node", filepath]
            else:
                result.stderr = f"Unsupported language: {language}"
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
                env=_safe_subprocess_env(),
            )

            result.stdout = proc.stdout.strip()
            result.stderr = proc.stderr.strip()
            result.returncode = proc.returncode

    except subprocess.TimeoutExpired:
        result.timed_out = True
        result.stderr = f"Execution timed out after {EXEC_TIMEOUT} seconds."
    except Exception as e:
        result.stderr = f"Execution error: {str(e)}"

    return result


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/run", response_model=RunResponse)
async def run_code(body: RunRequest, user: AuthUser = Depends(get_current_user)):
    """Execute code and return stdout/stderr. Requires authentication."""
    if not body.code or len(body.code) > MAX_CODE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Code must be 1-{MAX_CODE_LENGTH} characters."
        )

    language = body.language.lower()
    if language not in ("python", "javascript"):
        raise HTTPException(
            status_code=400,
            detail="Supported languages: python, javascript."
        )

    return _run_code(language, body.code, body.stdin)


@router.post("/trace", response_model=TraceResponse)
async def trace_code(body: TraceRequest, user: AuthUser = Depends(get_current_user)):
    """Execute code step-by-step, returning line-by-line state. Requires authentication."""
    if not body.code or len(body.code) > MAX_CODE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Code must be 1-{MAX_CODE_LENGTH} characters."
        )

    language = body.language.lower()
    if language not in ("python", "javascript"):
        raise HTTPException(
            status_code=400,
            detail="Supported languages: python, javascript."
        )

    if language == "python":
        return _trace_python(body.code, body.stdin)
    else:
        return _trace_javascript(body.code, body.stdin)
