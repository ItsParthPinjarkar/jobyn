"""
supabase_client.py — Supabase connection singleton.

Loads credentials from .env and exposes get_supabase() for use in routers.
The client is lazily initialised on first call — the scoring engine works
even if Supabase is not yet configured.

When SUPABASE_URL contains 'placeholder' or credentials are missing,
returns a NoSupabase client that gracefully handles all table operations.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend root (works when running from backend/ directory)
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "").strip()

_client = None
_is_configured = False


class NoSupabase:
    """Mock Supabase client that gracefully handles all operations."""
    
    def table(self, name):
        return NoSupabaseTable(name)
    
    def __getattr__(self, name):
        return lambda *args, **kwargs: self


class NoSupabaseTable:
    """Mock table that returns empty results."""
    
    def __init__(self, name):
        self.name = name
        self._data = []
    
    def select(self, *args, **kwargs):
        return self
    
    def insert(self, *args, **kwargs):
        return self
    
    def update(self, *args, **kwargs):
        return self
    
    def delete(self, *args, **kwargs):
        return self
    
    def eq(self, *args, **kwargs):
        return self
    
    def neq(self, *args, **kwargs):
        return self
    
    def in_(self, *args, **kwargs):
        return self
    
    def limit(self, *args, **kwargs):
        return self
    
    def range(self, *args, **kwargs):
        return self
    
    def execute(self):
        return NoSupabaseResponse()


class NoSupabaseResponse:
    """Mock response with empty data."""
    
    def __init__(self):
        self.data = []


def get_supabase():
    """
    Return (or lazily create) the shared Supabase client.
    
    Returns a NoSupabase mock if credentials are missing or placeholder values.
    """
    global _client, _is_configured
    
    if _client is not None:
        return _client
    
    # Check for real credentials
    if (not SUPABASE_URL or 
        "xxxx" in SUPABASE_URL or 
        "placeholder" in SUPABASE_URL or
        not SUPABASE_KEY or 
        "your-" in SUPABASE_KEY or
        "placeholder" in SUPABASE_KEY):
        _client = NoSupabase()
        return _client
    
    try:
        from supabase import create_client
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        _is_configured = True
        return _client
    except Exception as e:
        _client = NoSupabase()
        return _client


def is_configured() -> bool:
    """Check if Supabase is properly configured with real credentials."""
    global _is_configured
    if not _is_configured:
        get_supabase()  # Initialize to check
    return _is_configured


def check_connection() -> dict:
    """Ping Supabase to verify connectivity. Returns status dict."""
    try:
        sb = get_supabase()
        if isinstance(sb, NoSupabase):
            return {"supabase": "not_configured", "detail": "Using local mode (no database)"}
        sb.table("resumes").select("id").limit(1).execute()
        return {"supabase": "connected", "url": SUPABASE_URL}
    except Exception as e:
        return {"supabase": "error", "detail": str(e)}
