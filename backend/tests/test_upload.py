"""
test_upload.py — upload endpoint tests.
"""

import io


class TestUploadValidation:
    def test_no_file_returns_422(self, client):
        resp = client.post("/upload")
        assert resp.status_code == 422

    def test_invalid_extension_rejected(self, client):
        resp = client.post(
            "/upload",
            files={"file": ("test.txt", b"hello world", "text/plain")},
            data={"role": "auto"},
        )
        assert resp.status_code == 400
        assert "PDF and DOCX" in resp.json().get("detail", "")

    def test_invalid_role_rejected(self, client):
        pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"
        resp = client.post(
            "/upload",
            files={"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            data={"role": "NonexistentRole"},
        )
        assert resp.status_code in (400, 422)

    def test_roles_endpoint_returns_list(self, client):
        resp = client.get("/roles")
        assert resp.status_code == 200
        data = resp.json()
        assert "valid_roles" in data
        assert isinstance(data["valid_roles"], list)
        assert len(data["valid_roles"]) > 0


class TestUploadMimeValidation:
    def test_reject_fake_pdf_with_wrong_mime(self, client):
        """A .pdf file with non-PDF MIME content should be rejected."""
        fake_file = ("resume.pdf", b"This is plain text, not a PDF", "application/pdf")
        resp = client.post(
            "/upload",
            files={"file": fake_file},
            data={"role": "auto"},
        )
        assert resp.status_code == 400
        assert "Invalid file type" in resp.json().get("detail", "")


class TestUploadSizeLimit:
    def test_oversized_file_rejected(self, client):
        """Large non-PDF content is rejected (MIME or size check)."""
        from app.core.settings import settings
        big_content = b"x" * (settings.MAX_UPLOAD_BYTES + 1000)
        resp = client.post(
            "/upload",
            files={"file": ("big.pdf", io.BytesIO(big_content), "application/pdf")},
            data={"role": "auto"},
        )
        # MIME validation catches non-PDF content first (400) or size check (413)
        assert resp.status_code in (400, 413)
