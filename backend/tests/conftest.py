"""
conftest.py — shared fixtures for Jobyn backend tests.
"""

import os
import pytest
from fastapi.testclient import TestClient
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


# ── Skip DB-dependent integration tests when no Supabase is configured ─────────
# These tests hit endpoints that call get_supabase(), which raises when
# SUPABASE_URL is unset. CI has no Supabase secrets, so without this they fail
# with 500 ("SUPABASE_URL is not set"). They still run wherever SUPABASE_URL is
# set (local dev with .env, or a CI with secrets). Auth-guard tests (401/403,
# which short-circuit before any DB call) deliberately stay in the run.
_REQUIRES_SUPABASE = {
    "test_session_with_valid_token",
    "test_export_with_admin",
    "test_export_dataset_fields",
    "test_session_latest_with_auth",
    "test_analytics_with_admin",
    "test_delete_with_auth",
    "test_session_latest_returns_data",
    "test_analytics_returns_stats",
    "test_feedback_summary_paginated",
    "test_ml_status_returns_ready",
    "test_project_score_returns_200",
    "test_project_score_empty_skills",
    "test_skill_impact_returns_200",
}


def pytest_collection_modifyitems(config, items):
    if os.getenv("SUPABASE_URL"):
        return
    skip = pytest.mark.skip(reason="requires SUPABASE_URL (live database)")
    for item in items:
        if item.name.split("[")[0] in _REQUIRES_SUPABASE:
            item.add_marker(skip)


@pytest.fixture
def client():
    """FastAPI test client."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Headers with a valid JWT signed with the real SUPABASE_JWT_SECRET."""
    import jwt
    token = jwt.encode(
        {
            "sub": "test-user-uuid-1234",
            "email": "testuser@example.com",
            "role": "authenticated",
            "aud": "authenticated",
        },
        JWT_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    """Headers for an admin user. Admin is now a verified `app_metadata.role`
    claim (service-key-set in Supabase), not an email allowlist — so the token
    carries app_metadata.role='admin'. Signed with the real secret => verified."""
    import jwt
    token = jwt.encode(
        {
            "sub": "admin-user-uuid-5678",
            "email": "admin@jobyn.dev",
            "role": "authenticated",
            "aud": "authenticated",
            "app_metadata": {"role": "admin"},
        },
        JWT_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}
