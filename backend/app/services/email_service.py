"""
email_service.py — Onboarding email drip sequences using Resend API.

Requires RESEND_API_KEY env var. Falls back gracefully if not set.
"""

import os
import logging

log = logging.getLogger("email")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("EMAIL_FROM", "Jobyn <onboarding@campussync.ai>")
ENABLED = bool(RESEND_API_KEY)

if not ENABLED:
    log.warning("RESEND_API_KEY not set — email sequences disabled.")

# ── Resend client (lazy import) ──────────────────────────────────────────────

def _send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend API. Returns True on success."""
    if not ENABLED:
        log.debug("Email skipped (no API key): %s → %s", subject, to)
        return False
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        log.info("Email sent: %s → %s", subject, to)
        return True
    except Exception as e:
        log.error("Email send failed: %s → %s — %s", subject, to, e)
        return False


# ── Email templates ──────────────────────────────────────────────────────────

def welcome_email(name: str) -> tuple[str, str]:
    subject = "Welcome to Jobyn — Your AI Career Coach"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 16px;">
            Welcome aboard, {name}!
        </h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
            You just joined 57,100+ students using AI to get placement-ready.
            Here's what to do in your first 2 minutes:
        </p>
        <ol style="font-size: 15px; color: #333; line-height: 2; padding-left: 20px;">
            <li><strong>Upload your resume</strong> — get your readiness score in 60 seconds</li>
            <li><strong>See your skill gaps</strong> — know exactly what to learn</li>
            <li><strong>Practice an interview</strong> — AI-powered role-specific questions</li>
        </ol>
        <a href="https://getjobyn.pages.dev/onboarding"
           style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: #6366f1; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Complete Your Setup →
        </a>
        <p style="margin-top: 32px; font-size: 13px; color: #888;">
            — The Jobyn Team
        </p>
    </div>
    """
    return subject, html


def resume_reminder_email(name: str) -> tuple[str, str]:
    subject = "Your resume is waiting — see your score in 60 seconds"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 16px;">
            Hey {name}, still haven't uploaded your resume?
        </h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
            It takes 60 seconds to see where you stand. Our ML model (95% accuracy)
            will score your placement readiness and show your top 3 skill gaps.
        </p>
        <a href="https://getjobyn.pages.dev/resume-analyzer"
           style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: #6366f1; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Upload Resume →
        </a>
        <p style="margin-top: 32px; font-size: 13px; color: #888;">
            Your data never leaves your browser. Processed on-device.
        </p>
    </div>
    """
    return subject, html


def skill_gap_email(name: str, top_skill: str) -> tuple[str, str]:
    subject = f"Your #1 skill gap: {top_skill}"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 16px;">
            {name}, your top skill gap is <span style="color: #6366f1;">{top_skill}</span>
        </h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
            We've identified the skills holding you back. Start with <strong>{top_skill}</strong>
            — it's the most impactful gap to close before placement season.
        </p>
        <a href="https://getjobyn.pages.dev/skill-gap"
           style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: #6366f1; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            View Your Gaps →
        </a>
    </div>
    """
    return subject, html


def interview_reminder_email(name: str) -> tuple[str, str]:
    subject = "Ready for a mock interview?"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 16px;">
            Practice makes placement-ready, {name}
        </h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
            You've seen your score and gaps — now test yourself with role-specific
            interview questions. Our AI adapts to your skill level.
        </p>
        <a href="https://getjobyn.pages.dev/interview-readiness"
           style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: #6366f1; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Start Mock Interview →
        </a>
    </div>
    """
    return subject, html


def weekly_summary_email(name: str, score: int, gaps: int, days_active: int) -> tuple[str, str]:
    subject = f"Your first week: {score}% readiness"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 16px;">
            Week 1 Summary, {name}
        </h1>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 16px 0;">
            <div style="font-size: 36px; font-weight: 700; color: #6366f1;">{score}%</div>
            <div style="font-size: 14px; color: #666; margin-top: 4px;">Readiness Score</div>
        </div>
        <ul style="font-size: 15px; color: #333; line-height: 2; padding-left: 20px;">
            <li><strong>{gaps}</strong> skill gaps identified</li>
            <li><strong>{days_active}</strong> days active</li>
        </ul>
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin-top: 16px;">
            Keep going — students who close 3+ gaps are 4x more likely to get placed.
        </p>
        <a href="https://getjobyn.pages.dev/dashboard"
           style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: #6366f1; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Go to Dashboard →
        </a>
    </div>
    """
    return subject, html


# ── Public API ───────────────────────────────────────────────────────────────

def send_welcome(email: str, name: str) -> bool:
    subject, html = welcome_email(name)
    return _send_email(email, subject, html)


def send_resume_reminder(email: str, name: str) -> bool:
    subject, html = resume_reminder_email(name)
    return _send_email(email, subject, html)


def send_skill_gap(email: str, name: str, top_skill: str) -> bool:
    subject, html = skill_gap_email(name, top_skill)
    return _send_email(email, subject, html)


def send_interview_reminder(email: str, name: str) -> bool:
    subject, html = interview_reminder_email(name)
    return _send_email(email, subject, html)


def send_weekly_summary(email: str, name: str, score: int, gaps: int, days_active: int) -> bool:
    subject, html = weekly_summary_email(name, score, gaps, days_active)
    return _send_email(email, subject, html)
