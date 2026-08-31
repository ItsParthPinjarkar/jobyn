-- ============================================================
-- Jobyn — Row Level Security (RLS) Policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── resumes table ──────────────────────────────────────────────

-- Enable RLS
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read their own resumes
CREATE POLICY "Users can read own resumes" ON resumes
    FOR SELECT USING (user_email = auth.jwt()->>'email');

-- Policy: authenticated users can insert their own resumes
CREATE POLICY "Users can insert own resumes" ON resumes
    FOR INSERT WITH CHECK (user_email = auth.jwt()->>'email');

-- Policy: authenticated users can delete their own resumes
CREATE POLICY "Users can delete own resumes" ON resumes
    FOR DELETE USING (user_email = auth.jwt()->>'email');

-- Policy: service_role (backend) has full access
CREATE POLICY "Service role full access on resumes" ON resumes
    FOR ALL USING (auth.role() = 'service_role');


-- ── role_analyses table ────────────────────────────────────────

-- Enable RLS
ALTER TABLE role_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: users can read analyses for their own resumes
CREATE POLICY "Users can read own analyses" ON role_analyses
    FOR SELECT USING (
        resume_id IN (SELECT id FROM resumes WHERE user_email = auth.jwt()->>'email')
    );

-- Policy: service_role (backend) has full access
CREATE POLICY "Service role full access on role_analyses" ON role_analyses
    FOR ALL USING (auth.role() = 'service_role');


-- ── Verify ─────────────────────────────────────────────────────
-- After running, verify the app still works.
-- The backend uses service_role key which bypasses RLS,
-- so all backend operations continue normally.
-- RLS protects against anon key leakage.
