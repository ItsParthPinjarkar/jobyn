-- Migration 003: Onboarding progress tracking + email drip sequences
-- Tracks user onboarding milestones and email delivery status.

CREATE TABLE IF NOT EXISTS onboarding_progress (
    user_id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    goal TEXT,
    resume_uploaded_at TIMESTAMPTZ,
    skill_explored_at TIMESTAMPTZ,
    interview_practiced_at TIMESTAMPTZ,
    email_welcome_sent BOOLEAN DEFAULT FALSE,
    email_day1_sent BOOLEAN DEFAULT FALSE,
    email_day3_sent BOOLEAN DEFAULT FALSE,
    email_day5_sent BOOLEAN DEFAULT FALSE,
    email_day7_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email scheduler queries (find users who need emails)
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_email_pending
    ON onboarding_progress (created_at, email_welcome_sent, email_day1_sent, email_day3_sent, email_day7_sent);

-- RLS: service_role full access, authenticated read own
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_onboarding" ON onboarding_progress
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON onboarding_progress TO service_role;
GRANT SELECT ON onboarding_progress TO authenticated;
