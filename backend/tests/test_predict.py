"""
test_predict.py — ML prediction endpoint tests.
"""


class TestPredictEndpoint:
    def test_predict_returns_200(self, client):
        resp = client.post(
            "/ml/predict-role",
            json={
                "skills": ["python", "react", "sql"],
                "project_score_percent": 70,
                "ats_score_percent": 80,
                "structure_score_percent": 75,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "predicted_role" in data
        assert "confidence" in data
        assert "top_matches" in data

    def test_predict_empty_skills_returns_200(self, client):
        resp = client.post("/ml/predict-role", json={"skills": []})
        assert resp.status_code == 200
        assert "predicted_role" in resp.json()

    def test_predict_with_all_fields(self, client):
        resp = client.post(
            "/ml/predict-role",
            json={
                "skills": ["python", "tensorflow", "pytorch"],
                "project_score_percent": 90,
                "ats_score_percent": 85,
                "structure_score_percent": 80,
                "raw_text": "machine learning engineer with 3 years experience",
                "sections_detected": ["education", "experience", "skills"],
                "current_role": "Data Scientist",
            },
        )
        assert resp.status_code == 200

    def test_predict_missing_body_returns_422(self, client):
        resp = client.post("/ml/predict-role")
        assert resp.status_code == 422


class TestProjectScore:
    def test_project_score_returns_200(self, client):
        resp = client.post(
            "/ml/project-score",
            json={"current_skills": ["python", "sql"], "add_skill": "react"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "expected_improvement" in data

    def test_project_score_empty_skills(self, client):
        resp = client.post(
            "/ml/project-score",
            json={"current_skills": [], "add_skill": "python"},
        )
        assert resp.status_code == 200


class TestSkillImpact:
    def test_skill_impact_returns_200(self, client):
        resp = client.get("/ml/skill-impact")
        assert resp.status_code == 200
        data = resp.json()
        assert "skill_impact_ranking" in data


class TestMLStatus:
    def test_ml_status_returns_200(self, client):
        resp = client.get("/ml/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "dataset_size" in data
