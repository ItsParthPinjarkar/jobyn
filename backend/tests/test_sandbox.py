"""
test_sandbox.py — code-execution sandbox: auth gating and process isolation.

These cover the security fixes:
  - /sandbox/run and /sandbox/trace now require authentication (no anonymous RCE)
  - sandboxed code runs in a subprocess with the API's secrets stripped from env
They are DB-independent, so they run in CI (no Supabase needed).
"""

import os


class TestSandboxAuth:
    def test_run_requires_auth(self, client):
        resp = client.post("/sandbox/run", json={"code": "print(1)", "language": "python"})
        assert resp.status_code == 401

    def test_trace_requires_auth(self, client):
        resp = client.post("/sandbox/trace", json={"code": "print(1)", "language": "python"})
        assert resp.status_code == 401


class TestSandboxExecution:
    def test_run_python_with_auth(self, client, auth_headers):
        resp = client.post(
            "/sandbox/run",
            json={"code": "print(2 + 2)", "language": "python"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["stdout"].strip() == "4"

    def test_trace_python_with_auth(self, client, auth_headers):
        resp = client.post(
            "/sandbox/trace",
            json={"code": "x = 1\ny = x + 1\nprint(y)", "language": "python"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["steps"]) >= 2
        assert data["stdout"].strip() == "2"


class TestSandboxSecretIsolation:
    def test_sandboxed_code_cannot_read_app_secrets(self, client, auth_headers):
        """Code run in the sandbox must NOT see the API process's secrets."""
        os.environ["SUPABASE_KEY"] = "super-secret-test-value-123"
        try:
            resp = client.post(
                "/sandbox/run",
                json={
                    "code": "import os; print(os.environ.get('SUPABASE_KEY', 'ABSENT'))",
                    "language": "python",
                },
                headers=auth_headers,
            )
            assert resp.status_code == 200
            assert "super-secret-test-value-123" not in resp.json()["stdout"]
        finally:
            os.environ.pop("SUPABASE_KEY", None)
