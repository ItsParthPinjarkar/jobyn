"""
Email service using Resend API for onboarding drip sequences.
Requires RESEND_API_KEY env var. Falls back gracefully if not configured.
"""

import os
import logging

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("EMAIL_FROM", "Jobyn <onboarding@campussync.dev>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://getjobyn.pages.dev")

_resend = None


def _get_resend():
    """Lazy-init Resend client."""
    global _resend
    if _resend is None:
        try:
            import resend
            resend.api_key = RESEND_API_KEY
            _resend = resend
        except ImportError:
            logger.warning("resend package not installed — emails disabled")
    return _resend


def is_configured() -> bool:
    """Check if email sending is configured."""
    return bool(RESEND_API_KEY) and _get_resend() is not None


def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend. Returns True on success."""
    r = _get_resend()
    if not r or not RESEND_API_KEY:
        logger.info(f"Email skipped (not configured): {subject} → {to}")
        return False
    try:
        r.Emails.send({
            "from": FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Email sent: {subject} → {to}")
        return True
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False


# ── Email Templates ──────────────────────────────────────────────────

def _button(text: str, url: str) -> str:
    return f'<a href="{url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">{text}</a>'


def _layout(content: str) -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:32px;margin:0">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
  <div style="margin-bottom:24px">
    <span style="font-size:20px;font-weight:700;color:#1e293b">Jobyn</span>
    <span style="font-size:12px;color:#94a3b8;display:block;margin-top:2px">Your AI Career Coach</span>
  </div>
  {content}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
  <p style="font-size:11px;color:#94a3b8;text-align:center">
    You're receiving this because you signed up for Jobyn.
    <a href="{FRONTEND_URL}/settings" style="color:#6366f1">Manage notifications</a>
  </p>
</div></body></html>"""


def email_welcome(name: str) -> str:
    return _layout(f"""
  <h1 style="font-size:18px;color:#1e293b;margin:0 0 12px">Welcome, {name}!</h1>
  <p style="font-size:14px;color:#475569;line-height:1.6">
    Your career readiness journey starts now. Upload your resume and get your
    ML-powered readiness score in under 60 seconds.
  </p>
  <div style="margin:20px 0">{_button("Upload Your Resume", f"{FRONTEND_URL}/resume-analyzer")}</div>
  <p style="font-size:13px;color:#64748b">
    Don't have a resume handy? You can try our demo with sample data.
  </p>
""")


def email_day1_no_upload() -> str:
    return _layout(f"""
  <h1 style="font-size:18px;color:#1e293b;margin:0 0 12px">Your resume is waiting</h1>
  <p style="font-size:14px;color:#475569;line-height:1.6">
    Students who analyze their resume are <strong>3x more likely</strong> to get
    placed. It only takes 60 seconds.
  </p>
  <div style="margin:20px 0">{_button("Analyze Your Resume", f"{FRONTEND_URL}/resume-analyzer")}</div>
  <p style="font-size:13px;color:#64748b">
    No resume? Try our sample analysis to see what Jobyn can do.
  </p>
""")


def email_day3_no_explore(score: int, top_gap: str) -> str:
    return _layout(f"""
  <h1 style="font-size:18px;color:#1e293b;margin:0 0 12px">Your top skill gaps are ready</h1>
  <p style="font-size:14px;color:#475569;line-height:1.6">
    Your resume scored <strong>{score}%</strong>. Your biggest gap is
    <strong>{top_gap}</strong> — closing it will boost your readiness.
  </p>
  <div style="margin:20px 0">{_button("View Your Skill Gaps", f"{FRONTEND_URL}/skill-gap")}</div>
""")


def email_day5_no_interview() -> str:
    return _layout(f"""
  <h1 style="font-size:18px;color:#1e293b;margin:0 0 12px">Ready for a mock interview?</h1>
  <p style="font-size:14px;color:#475569;line-height:1.6">
    Students who practice interviews are <strong>2x more confident</strong> in real
    interviews. Our AI interviewer asks role-specific questions and gives
    instant feedback.
  </p>
  <div style="margin:20px 0">{_button("Start Interview Practice", f"{FRONTEND_URL}/interview-readiness")}</div>
  <p style="font-size:13px;color:#64748b">It's free and private — no one hears your answers.</p>
""")


def email_day7_summary(score: int, skills_detected: int, name: str) -> str:
    return _layout(f"""
  <h1 style="font-size:18px;color:#1e293b;margin:0 0 12px">Your first week on Jobyn</h1>
  <p style="font-size:14px;color:#475569;line-height:1.6">
    Hey {name}, here's your progress this week:
  </p>
  <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
    <div style="font-size:13px;color:#475569;margin-bottom:8px">
      <strong>Readiness Score:</strong> {score}%
    </div>
    <div style="font-size:13px;color:#475569">
      <strong>Skills Detected:</strong> {skills_detected}
    </div>
  </div>
  <p style="font-size:14px;color:#475569;line-height:1.6">
    Keep going — consistent practice is what separates placed students from the rest.
  </p>
  <div style="margin:20px 0">{_button("View Dashboard", f"{FRONTEND_URL}/dashboard")}</div>
""")
