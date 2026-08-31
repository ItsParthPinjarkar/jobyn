"""
test_export.py — export, history, analytics, and GDPR endpoint tests.
"""


class TestExportDataset:
    """Test the /export/dataset endpoint (admin-only)."""

    def test_export_requires_auth(self, client):
        """Export without auth returns 401."""
        resp = client.get("/export/dataset")
        assert resp.status_code == 401

    def test_export_requires_admin(self, client, auth_headers):
        """Non-admin user gets 403 on export."""
        resp = client.get("/export/dataset", headers=auth_headers)
        assert resp.status_code == 403

    def test_export_with_admin(self, client, admin_headers):
        """Admin user can access export."""
        resp = client.get("/export/dataset", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "dataset" in data
        assert isinstance(data["dataset"], list)

    def test_export_dataset_fields(self, client, admin_headers):
        """Each item in the dataset has expected fields."""
        resp = client.get("/export/dataset", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        if data["total"] > 0:
            item = data["dataset"][0]
            for field in ["analysis_id", "resume_id", "role", "final_score", "detected_skills"]:
                assert field in item, f"Missing field: {field}"


class TestHistoryEndpoints:
    """Test history CRUD endpoints."""

    def test_history_requires_auth(self, client):
        resp = client.get("/history/1")
        assert resp.status_code == 401

    def test_history_nonexistent_not_401(self, client, auth_headers):
        """History for a nonexistent resume should not be 401."""
        resp = client.get("/history/999999", headers=auth_headers)
        assert resp.status_code != 401

    def test_compare_requires_auth(self, client):
        resp = client.get("/compare/1")
        assert resp.status_code == 401

    def test_compare_nonexistent_not_401(self, client, auth_headers):
        resp = client.get("/compare/999999", headers=auth_headers)
        assert resp.status_code != 401

    def test_delete_analysis_requires_auth(self, client):
        resp = client.delete("/history/analysis/1")
        assert resp.status_code == 401

    def test_delete_resume_requires_auth(self, client):
        resp = client.delete("/history/resume/1")
        assert resp.status_code == 401


class TestSessionEndpoint:
    def test_session_latest_requires_auth(self, client):
        resp = client.get("/session/latest/test@example.com")
        assert resp.status_code == 401

    def test_session_latest_with_auth(self, client, auth_headers):
        resp = client.get(
            "/session/latest/testuser@example.com",
            headers=auth_headers,
        )
        assert resp.status_code == 200


class TestAnalyticsEndpoint:
    def test_analytics_requires_auth(self, client):
        """Analytics now requires auth."""
        resp = client.get("/analytics/role-stats")
        assert resp.status_code == 401

    def test_analytics_requires_admin(self, client, auth_headers):
        """Analytics is now admin-only — a regular authenticated user is forbidden."""
        resp = client.get("/analytics/role-stats", headers=auth_headers)
        assert resp.status_code == 403

    def test_analytics_with_admin(self, client, admin_headers):
        """Admin can access cross-user analytics."""
        resp = client.get("/analytics/role-stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "role_averages" in data
        assert "top_missing_skills" in data


class TestGDPRDeletion:
    def test_delete_requires_auth(self, client):
        resp = client.delete("/user/data")
        assert resp.status_code == 401

    def test_delete_with_auth(self, client, auth_headers):
        resp = client.delete("/user/data", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "detail" in data
        assert "deleted" in data["detail"].lower()
