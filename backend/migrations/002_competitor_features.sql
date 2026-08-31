-- ============================================================
--  Jobyn — Competitor Features Migration
--  Run this in Supabase SQL Editor AFTER COMPLETE_SCHEMA.sql
--
--  New tables (6):
--    1. jd_matches         — JD match history
--    2. peer_benchmarks    — Aggregated percentile data per role
--    3. company_prep       — Company-specific prep data
--    4. coding_problems    — Coding challenge bank
--    5. coding_submissions — User code submissions
--    6. daily_tips         — WhatsApp daily tip queue
-- ============================================================


-- ============================================================
-- 1. JD MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS jd_matches (
    id              BIGSERIAL PRIMARY KEY,
    user_email      TEXT NOT NULL,
    resume_id       BIGINT REFERENCES resumes(id) ON DELETE SET NULL,
    jd_text         TEXT NOT NULL,
    jd_title        TEXT,
    jd_company      TEXT,
    match_score     NUMERIC(5,2) NOT NULL,
    matched_skills  JSONB NOT NULL DEFAULT '[]',
    missing_skills  JSONB NOT NULL DEFAULT '[]',
    high_priority   JSONB NOT NULL DEFAULT '[]',
    match_strength  TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jd_matches_user     ON jd_matches(user_email);
CREATE INDEX IF NOT EXISTS idx_jd_matches_resume   ON jd_matches(resume_id);
CREATE INDEX IF NOT EXISTS idx_jd_matches_created  ON jd_matches(created_at DESC);


-- ============================================================
-- 2. PEER BENCHMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS peer_benchmarks (
    id              BIGSERIAL PRIMARY KEY,
    role            TEXT NOT NULL UNIQUE,
    total_analyses  INTEGER NOT NULL DEFAULT 0,
    avg_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
    median_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
    p10_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
    p25_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
    p50_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
    p75_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
    p90_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
    top_skills      JSONB NOT NULL DEFAULT '[]',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_peer_benchmarks_role ON peer_benchmarks(role);


-- ============================================================
-- 3. COMPANY PREP
-- ============================================================
CREATE TABLE IF NOT EXISTS company_prep (
    id                BIGSERIAL PRIMARY KEY,
    company_name      TEXT NOT NULL,
    company_slug      TEXT NOT NULL UNIQUE,
    logo_url          TEXT,
    category          TEXT NOT NULL DEFAULT 'product',
    required_skills   JSONB NOT NULL DEFAULT '[]',
    preferred_skills  JSONB NOT NULL DEFAULT '[]',
    interview_stages  JSONB NOT NULL DEFAULT '[]',
    prep_timeline     JSONB NOT NULL DEFAULT '{}',
    resources         JSONB NOT NULL DEFAULT '[]',
    tips              JSONB NOT NULL DEFAULT '[]',
    avg_difficulty    TEXT NOT NULL DEFAULT 'Medium',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_prep_slug     ON company_prep(company_slug);
CREATE INDEX IF NOT EXISTS idx_company_prep_category ON company_prep(category);


-- ============================================================
-- 4. CODING PROBLEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS coding_problems (
    id              BIGSERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    difficulty      TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    skill_tags      JSONB NOT NULL DEFAULT '[]',
    description     TEXT NOT NULL,
    constraints     TEXT,
    example_input   TEXT NOT NULL,
    example_output  TEXT NOT NULL,
    explanation     TEXT,
    starter_code    JSONB NOT NULL DEFAULT '{}',
    test_cases      JSONB NOT NULL DEFAULT '[]',
    hints           JSONB NOT NULL DEFAULT '[]',
    time_limit_ms   INTEGER NOT NULL DEFAULT 5000,
    memory_limit_mb INTEGER NOT NULL DEFAULT 256,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coding_problems_slug       ON coding_problems(slug);
CREATE INDEX IF NOT EXISTS idx_coding_problems_difficulty ON coding_problems(difficulty);


-- ============================================================
-- 5. CODING SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coding_submissions (
    id              BIGSERIAL PRIMARY KEY,
    user_email      TEXT NOT NULL,
    problem_id      BIGINT NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
    language        TEXT NOT NULL,
    code            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','accepted','wrong_answer',
                                      'runtime_error','time_limit','compile_error')),
    test_results    JSONB NOT NULL DEFAULT '[]',
    runtime_ms      INTEGER,
    memory_mb       NUMERIC(8,2),
    passed_count    INTEGER NOT NULL DEFAULT 0,
    total_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_user    ON coding_submissions(user_email);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_problem ON coding_submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_status  ON coding_submissions(status);


-- ============================================================
-- 6. DAILY TIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_tips (
    id              BIGSERIAL PRIMARY KEY,
    tip_text        TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'general',
    skill_related   TEXT,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_tips_active ON daily_tips(active) WHERE active = TRUE;


-- ============================================================
-- GRANTS (match existing pattern — service_role does everything)
-- ============================================================
GRANT ALL ON jd_matches         TO service_role;
GRANT ALL ON peer_benchmarks    TO service_role;
GRANT ALL ON company_prep       TO service_role;
GRANT ALL ON coding_problems    TO service_role;
GRANT ALL ON coding_submissions TO service_role;
GRANT ALL ON daily_tips         TO service_role;

GRANT SELECT ON jd_matches         TO authenticated;
GRANT SELECT ON peer_benchmarks    TO authenticated;
GRANT SELECT ON company_prep       TO authenticated;
GRANT SELECT ON coding_problems    TO authenticated;
GRANT SELECT ON coding_submissions TO authenticated;
GRANT SELECT ON daily_tips         TO anon;
