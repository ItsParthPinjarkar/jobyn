"""
llm_utils.py — shared helpers for extracting and parsing LLM responses.

Eliminates duplication across rag_service.py, gemini_service.py, etc.
"""

import json
import re
import logging
from typing import Any, Optional

log = logging.getLogger("llm_utils")


def extract_content(response: Any) -> str:
    """
    Extract text content from an LLM response object.
    Handles dict, object-with-output, and raw string formats.
    """
    if isinstance(response, dict):
        output = response.get("output", "")
        if isinstance(output, dict):
            return output.get("content", "")
        return str(output)
    if hasattr(response, "output"):
        output = response.output
        if isinstance(output, dict):
            return output.get("content", "")
        return str(output)
    return str(response)


def _sanitize_string_values(text: str) -> str:
    """
    LLMs often emit raw newlines, tabs, and unescaped control characters
    inside JSON string values.  This pre-processor walks the string and
    escapes those characters only when we're inside a JSON string.
    """
    out = []
    in_string = False
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if in_string:
            if ch == '\\' and i + 1 < n:
                # valid escape — pass through as-is
                out.append(ch)
                out.append(text[i + 1])
                i += 2
                continue
            if ch == '"':
                in_string = False
                out.append(ch)
            elif ch == '\n':
                out.append('\\n')
            elif ch == '\r':
                out.append('\\r')
            elif ch == '\t':
                out.append('\\t')
            elif ord(ch) < 0x20:
                # other control chars
                out.append(f'\\u{ord(ch):04x}')
            else:
                out.append(ch)
        else:
            if ch == '"':
                in_string = True
            out.append(ch)
        i += 1
    return ''.join(out)


def _close_json(s: str) -> str:
    """
    Track open brackets/braces as a STACK and close them
    in correct reverse order (last-opened first-closed).
    """
    stack = []
    in_str = False
    esc = False
    for ch in s:
        if esc:
            esc = False
            continue
        if ch == '\\':
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == '{':
            stack.append('}')
        elif ch == '[':
            stack.append(']')
        elif ch in ('}', ']') and stack and stack[-1] == ch:
            stack.pop()
    # Close in reverse order
    stack.reverse()
    return s + ''.join(stack)


def _fix_string_and_close(s: str) -> str:
    """Close open strings, trim trailing junk, then close brackets in order."""
    # Check if we're inside a string
    in_string = False
    escape = False
    for ch in s:
        if escape:
            escape = False
            continue
        if ch == '\\':
            escape = True
            continue
        if ch == '"':
            in_string = not in_string

    # Handle trailing backslash (incomplete escape)
    if s.endswith('\\') and not s.endswith('\\\\'):
        s = s[:-1]

    if in_string:
        s += '"'

    # Trim trailing junk outside strings
    s = re.sub(r',\s*$', '', s)
    s = re.sub(r',\s*"[^"]*"\s*:\s*$', '', s)

    return _close_json(s)


def _repair_truncated_json(text: str) -> Optional[dict]:
    """
    Attempt to repair JSON that was truncated mid-stream.
    Strategy:
      1. Sanitize raw control characters inside string values.
      2. Close open strings + brackets in correct stack order.
      3. If that fails, progressively trim from the end and retry.
    """
    # Step 0: sanitize control chars inside strings
    s = _sanitize_string_values(text.rstrip())

    # Step 1: try closing as-is
    closed = _fix_string_and_close(s)
    try:
        return json.loads(closed)
    except json.JSONDecodeError:
        pass

    # Step 2: progressive right-trim — find the last parseable state
    for trim in range(20, min(len(s), 2000), 20):
        candidate = s[:-trim].rstrip()
        closed2 = _fix_string_and_close(candidate)
        try:
            result = json.loads(closed2)
            log.info("Repaired truncated JSON by trimming %d chars", trim)
            return result
        except json.JSONDecodeError:
            continue

    return None


def parse_json_from_llm(text: str) -> Optional[dict]:
    """
    Extract JSON from LLM output that may be wrapped in code fences.
    Includes aggressive repair for truncated output (unterminated strings,
    raw newlines inside string values, missing closing brackets/braces).
    """
    if not text or not text.strip():
        return None

    # Strip code fences
    cleaned = text
    if "```json" in cleaned:
        cleaned = cleaned.split("```json", 1)[1]
        if "```" in cleaned:
            cleaned = cleaned.split("```", 1)[0]
        cleaned = cleaned.strip()
    elif "```" in cleaned:
        cleaned = cleaned.split("```", 1)[1]
        if "```" in cleaned:
            cleaned = cleaned.split("```", 1)[0]
        cleaned = cleaned.strip()

    # Attempt 1: direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Attempt 2: sanitize + direct parse (handles raw newlines w/o truncation)
    try:
        sanitized = _sanitize_string_values(cleaned)
        return json.loads(sanitized)
    except json.JSONDecodeError:
        pass

    # Attempt 3: full repair (sanitize + close strings + close brackets + progressive trim)
    repaired = _repair_truncated_json(cleaned)
    if repaired is not None:
        log.info("Successfully repaired truncated JSON (%d chars)", len(cleaned))
        return repaired

    # Attempt 4: find the first { ... } block and repair it
    m = re.search(r'(\{.*)', cleaned, re.DOTALL)
    if m:
        candidate = m.group(1)
        repaired = _repair_truncated_json(candidate)
        if repaired is not None:
            log.info("Repaired JSON from regex extraction")
            return repaired

    log.warning("JSON parse failed after all repair attempts (%d chars)", len(text))
    return None
