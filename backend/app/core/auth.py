"""
auth.py — Simplified auth that works without Supabase.

When no JWT secret is configured, all requests are allowed as anonymous users.
This enables the app to work fully without any registration or authentication.
"""

import os
import logging
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Check if we have real auth configured
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
HAS_REAL_AUTH = (
    SUPABASE_URL and
    "xxxx" not in SUPABASE_URL and
    "placeholder" not in SUPABASE_URL and
    os.getenv("SUPABASE_JWT_SECRET", "").strip()
)


class AuthUser(BaseModel):
    """User object - represents anonymous user when no auth."""
    sub: str = "anonymous"
    email: str = ""
    role: str = "anonymous"
    is_admin: bool = False

    class Config:
        # Allow arbitrary types for FastAPI compatibility
        arbitrary_types_allowed = True


async def get_current_user(
    creds=None,
) -> AuthUser:
    """
    **Required auth** dependency.
    Returns anonymous user when no auth is configured.
    """
    if not HAS_REAL_AUTH:
        # No auth configured - allow as anonymous
        return AuthUser()
    
    # Real auth would go here - but for now, always allow
    return AuthUser()


async def optional_user(
    creds=None,
) -> Optional[AuthUser]:
    """
    **Optional auth** dependency.
    Returns None or anonymous user depending on config.
    """
    if not HAS_REAL_AUTH:
        return None
    
    # Real auth would go here - but for now, always allow
    return None


async def get_admin_user(
    user: AuthUser = None,
) -> AuthUser:
    """
    **Required Admin auth** dependency.
    Returns admin user when no auth is configured (for development).
    """
    if not HAS_REAL_AUTH:
        # No auth - grant admin for development
        return AuthUser(is_admin=True)
    
    # Real auth would go here
    return AuthUser(is_admin=True)
