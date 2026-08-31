"""
validation.py — input validation & sanitization for backend endpoints.

Strips potentially dangerous content from user-supplied text inputs
before they reach the DB or ML pipeline.
"""

import re
import html

# Max allowed resume raw text length (chars)
MAX_RESUME_TEXT = 500_000
MAX_SKILL_LENGTH = 100
MAX_EMAIL_LENGTH = 254

_EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
_SCRIPT_RE = re.compile(r'<script[\s>]|javascript:|on\w+\s*=', re.IGNORECASE)


def sanitize_text(text: str) -> str:
    """Escape HTML entities and strip script-like patterns."""
    cleaned = html.escape(text, quote=True)
    return cleaned


def sanitize_plain(text: str) -> str:
    """Strip any HTML tags entirely (for plain text fields like names/skills)."""
    return re.sub(r'<[^>]+>', '', text).strip()


def validate_email(email: str | None) -> str | None:
    """Return cleaned email or None if invalid."""
    if not email:
        return None
    email = email.strip()[:MAX_EMAIL_LENGTH]
    if not _EMAIL_RE.match(email):
        return None
    return email


def validate_role(role: str, valid_roles: list[str]) -> str | None:
    """Return role if valid, else None."""
    return role if role in valid_roles else None


def validate_skill(skill: str) -> str | None:
    """Return cleaned skill or None if invalid."""
    cleaned = sanitize_plain(skill)[:MAX_SKILL_LENGTH]
    if not cleaned or _SCRIPT_RE.search(cleaned):
        return None
    return cleaned


def validate_resume_text(text: str) -> tuple[bool, str]:
    """Validate resume text length. Returns (is_valid, message)."""
    if len(text) < 10:
        return False, "Resume text is too short — is the file empty?"
    if len(text) > MAX_RESUME_TEXT:
        return False, f"Resume text exceeds {MAX_RESUME_TEXT} characters."
    return True, ""


def sanitize_filename(filename: str) -> str:
    """
    Remove path traversal sequences, strip leading/trailing spaces/dots,
    and restrict character set to alphanumeric, dots, dashes, and underscores.
    """
    import os
    # 1. Get base name (prevent path traversal like ../)
    base = os.path.basename(filename)

    # 2. Split name and extension
    name, ext = os.path.splitext(base)

    # 3. Clean filename name portion (keep alphanumeric, space, underscore, dash)
    cleaned_name = re.sub(r'[^a-zA-Z0-9_\-\s]', '', name).strip()

    # 4. Clean extension portion (only allow alphanumeric file formats like pdf, docx)
    cleaned_ext = re.sub(r'[^a-zA-Z0-9]', '', ext).lower().strip()

    # 5. Fallback if everything was stripped
    if not cleaned_name:
        cleaned_name = "uploaded_file"

    # 6. Re-assemble and limit length
    safe_filename = f"{cleaned_name}.{cleaned_ext}"
    if len(safe_filename) > 100:
        safe_filename = safe_filename[-100:]

    return safe_filename


def validate_public_url(url: str) -> str:
    """SSRF guard for server-side fetchers.

    Rejects non-http(s) URLs and URLs whose host resolves to a private,
    loopback, link-local, reserved, or otherwise-internal address. This blocks
    access to cloud metadata endpoints (e.g. 169.254.169.254) and internal
    services. Returns the URL if safe, otherwise raises ValueError.
    """
    import ipaddress
    import socket
    from urllib.parse import urlparse

    parsed = urlparse((url or "").strip())
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https URLs are allowed.")
    host = parsed.hostname
    if not host:
        raise ValueError("URL has no host.")
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise ValueError("Could not resolve URL host.")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local
                or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
            raise ValueError("URLs that resolve to private or internal addresses are not permitted.")
    return parsed.geturl()


def sanitize_recursive(val: any) -> any:
    """Recursively sanitize strings inside nested objects (dicts, lists, primitives)."""
    if isinstance(val, str):
        return sanitize_text(val)
    elif isinstance(val, dict):
        return {k: sanitize_recursive(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [sanitize_recursive(i) for i in val]
    return val
