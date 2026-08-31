"""
test_auth.py — authentication and authorization tests.

Verifies that:
  - Protected endpoints reject unauthenticated requests (401)
  - Invalid tokens are rejected (401)
  - Valid tokens grant access
  - Admin-only endpoints reject non-admin users (403)
"""


class TestAuthRequired:
    """Endpoints that require authentication."""

    def test_history_requires_auth(self, client):
        resp = client.get("/history/1")
        assert resp.status_code == 401

    def test_compare_requires_auth(self, client):
        resp = client.get("/compare/1")
        assert resp.status_code == 401

    def test_session_requires_auth(self, client):
        resp = client.get("/session/latest/test@example.com")
        assert resp.status_code == 401

    def test_user_data_delete_requires_auth(self, client):
        resp = client.delete("/user/data")
        assert resp.status_code == 401

    def test_delete_analysis_requires_auth(self, client):
        resp = client.delete("/history/analysis/1")
        assert resp.status_code == 401

    def test_delete_resume_requires_auth(self, client):
        resp = client.delete("/history/resume/1")
        assert resp.status_code == 401


class TestInvalidToken:
    """Requests with malformed or invalid tokens."""

    def test_garbage_token_returns_401(self, client):
        resp = client.get(
            "/history/1",
            headers={"Authorization": "Bearer not-a-valid-jwt"},
        )
        assert resp.status_code == 401

    def test_empty_bearer_returns_401(self, client):
        resp = client.get("/history/1", headers={"Authorization": "Bearer "})
        assert resp.status_code == 401


class TestValidToken:
    """Requests with valid-looking tokens (dev mode trusts payload)."""

    def test_history_with_valid_token(self, client, auth_headers):
        """With valid token, /history should not return 401."""
        resp = client.get("/history/999999", headers=auth_headers)
        # 200/404 if DB works, 500 if Supabase .single() throws — but never 401
        assert resp.status_code != 401

    def test_session_with_valid_token(self, client, auth_headers):
        resp = client.get(
            "/session/latest/testuser@example.com",
            headers=auth_headers,
        )
        assert resp.status_code == 200


class TestAdminGuard:
    """Admin-only endpoints should reject non-admin users."""

    def test_ml_recompute_requires_admin(self, client, auth_headers):
        resp = client.post("/ml/recompute-model", headers=auth_headers)
        assert resp.status_code == 403

    def test_admin_contributions_requires_admin(self, client, auth_headers):
        """GET /ai/admin/contributions with non-admin token returns 403."""
        resp = client.get("/ai/admin/contributions", headers=auth_headers)
        assert resp.status_code == 403

    def test_admin_stats_requires_admin(self, client, auth_headers):
        """GET /ai/admin/stats with non-admin token returns 403."""
        resp = client.get("/ai/admin/stats", headers=auth_headers)
        assert resp.status_code == 403

    def test_ml_promote_requires_admin(self, client, auth_headers):
        resp = client.post("/ml/versions/v1/promote", headers=auth_headers)
        assert resp.status_code in (403, 404)

    def test_ml_delete_requires_admin(self, client, auth_headers):
        resp = client.delete("/ml/versions/v1", headers=auth_headers)
        assert resp.status_code in (403, 400)
