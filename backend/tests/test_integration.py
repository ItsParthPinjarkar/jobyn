"""
test_integration.py — integration tests against live Supabase.

These tests verify that the backend correctly reads/writes to Supabase
and that all major API endpoints return expected response shapes.

Run with: python -m pytest tests/test_integration.py -v
"""

import pytest


class TestRolesEndpoint:
    """GET /roles — list supported career roles."""

    def test_roles_returns_seven_roles(self, client):
        resp = client.get("/roles")
        assert resp.status_code == 200
        roles = resp.json()["valid_roles"]
        assert len(roles) == 7

    def test_roles_contains_software_developer(self, client):
        resp = client.get("/roles")
        assert "Software Developer" in resp.json()["valid_roles"]


class TestHealthEndpoints:
    """GET / and GET /health — service status."""

    def test_root_returns_version(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "version" in data
        assert "model_version" in data

    def test_health_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestMLStatus:
    """GET /ml/status, /ml/versions, /ml/versions/active — ML pipeline health."""

    def test_ml_status_returns_ready(self, client):
        resp = client.get("/ml/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["dataset_size"] > 0
        assert data["ready"] is True

    def test_ml_versions_returns_list(self, client):
        resp = client.get("/ml/versions")
        assert resp.status_code == 200
        data = resp.json()
        assert "versions" in data
        assert isinstance(data["versions"], list)

    def test_ml_versions_active_or_404(self, client):
        resp = client.get("/ml/versions/active")
        # Returns 404 if no version has been promoted yet
        assert resp.status_code in (200, 404)


class TestInterviewEndpoints:
    """GET /interview/question, POST /interview/evaluate, GET /interview/dependencies."""

    def test_get_question_returns_question(self, client):
        resp = client.get("/interview/question", params={"role": "Software Developer"})
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "question" in data
        assert "difficulty" in data
        assert data["role"] == "Software Developer"

    def test_evaluate_answer_returns_score(self, client):
        resp = client.post("/interview/evaluate", json={
            "role": "Software Developer",
            "question_id": "test",
            "answer": "python is a programming language",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "score" in data
        assert "grade" in data
        assert "detected_concepts" in data
        assert isinstance(data["detected_concepts"], list)

    def test_dependencies_returns_graph(self, client):
        resp = client.get("/interview/dependencies")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, dict)
        assert len(data) > 0


class TestDataEndpoints:
    """History, analytics, session, export — require auth."""

    def test_session_latest_returns_data(self, client, auth_headers):
        resp = client.get(
            "/session/latest/testuser@example.com",
            headers=auth_headers,
        )
        assert resp.status_code == 200

    def test_analytics_returns_stats(self, client, admin_headers):
        # Analytics is admin-only (cross-user aggregates).
        resp = client.get("/analytics/role-stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_analyses" in data
        assert "role_averages" in data

    def test_export_dataset_requires_admin(self, client, auth_headers):
        resp = client.get("/export/dataset", headers=auth_headers)
        assert resp.status_code == 403


class TestPredictEndpoint:
    """POST /predict — ML inference."""

    def test_predict_returns_role_and_score(self, client):
        resp = client.post("/predict", json={
            "skills": ["python", "git", "sql"],
            "core_coverage": 0.6,
            "optional_coverage": 0.3,
            "project_score": 0.5,
            "ats_score": 0.4,
            "structure_score": 0.75,
        })
        # 503 if ML models not loaded (need to train first)
        if resp.status_code == 503:
            pytest.skip("ML models not loaded — run: python -m app.ml_pipeline.train_v2 --seed 42")
        assert resp.status_code == 200
        data = resp.json()
        assert "predicted_role" in data
        assert "confidence" in data
        assert "resume_score" in data


class TestCurriculumEndpoints:
    """GET /ai/curriculum/* — skill dependency graph."""

    def test_curriculum_overview_returns_graph(self, client):
        resp = client.get("/ai/curriculum/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert "skills" in data or isinstance(data, dict)
        # Should have at least some skills
        assert len(data) > 0

    def test_curriculum_prerequisites(self, client):
        resp = client.get("/ai/curriculum/prerequisites", params={"skill": "react"})
        assert resp.status_code == 200
        data = resp.json()
        assert "prerequisites" in data
        assert isinstance(data["prerequisites"], list)


class TestFeedbackEndpoints:
    """GET /feedback/summary — feedback aggregation."""

    def test_feedback_summary_requires_admin(self, client, auth_headers):
        # Feedback aggregation leaks cross-user data -> admin-only now.
        resp = client.get("/feedback/summary", params={"page": 1}, headers=auth_headers)
        assert resp.status_code == 403

    def test_feedback_summary_paginated(self, client, admin_headers):
        resp = client.get("/feedback/summary", params={"page": 1, "per_page": 10}, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_feedback" in data or "corrections" in data
        assert "page" in data
