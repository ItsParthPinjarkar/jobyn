-- ============================================================
--  Jobyn — COMPLETE Supabase Schema
--  Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
--
--  This file contains ALL tables, indexes, functions, and grants
--  needed by the application. Safe to run on a fresh database
--  or re-run on existing (uses IF NOT EXISTS everywhere).
--
--  Tables (13 total):
--    1.  resumes                    — uploaded resume metadata
--    2.  role_analyses              — per-resume role analysis
--    3.  resume_analysis_synthetic  — v1 synthetic training data
--    4.  resume_analysis_synthetic_v2 — v2 real training data (57K records)
--    5.  knowledge_chunks           — PGVector RAG embeddings
--    6.  prediction_feedback        — ML prediction outcome tracking
--    7.  knowledge_cache            — L2 Supabase cache for AI content
--    8.  contributions              — community content contributions
--    9.  dynamic_curriculums        — per-skill syllabus structures
--   10.  user_study_progress        — per-user section completion
--   11.  user_quiz_attempts         — per-user quiz scores
--   12.  content_feedback           — user feedback on study content
--
--  Functions (1):
--    match_knowledge()              — PGVector cosine similarity search
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. resumes — uploaded resume metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS resumes (
    id                BIGSERIAL    PRIMARY KEY,
    filename          TEXT         NOT NULL,
    raw_text          TEXT,
    detected_skills   JSONB        NOT NULL DEFAULT '[]',
    sections_detected JSONB        NOT NULL DEFAULT '[]',
    links             JSONB        NOT NULL DEFAULT '[]',
    encrypted         BOOLEAN      DEFAULT FALSE,
    user_email        TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
    ALTER TABLE resumes ADD CONSTRAINT uq_resumes_filename_email UNIQUE (filename, user_email);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_resumes_user_email   ON resumes(user_email);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at   ON resumes(created_at);


-- ============================================================
-- 2. role_analyses — per-resume role analysis results
-- ============================================================
CREATE TABLE IF NOT EXISTS role_analyses (
    id                        BIGSERIAL   PRIMARY KEY,
    resume_id                 BIGINT      NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    role                      TEXT        NOT NULL,
    final_score               INTEGER     NOT NULL,
    readiness_category        TEXT,
    core_coverage_percent     INTEGER,
    optional_coverage_percent INTEGER,
    project_score_percent     INTEGER,
    ats_score_percent         INTEGER,
    structure_score_percent   INTEGER,
    missing_core_skills       JSONB       NOT NULL DEFAULT '[]',
    missing_optional_skills   JSONB       NOT NULL DEFAULT '[]',
    recommendations           JSONB       NOT NULL DEFAULT '[]',
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
    ALTER TABLE role_analyses ADD CONSTRAINT uq_role_analyses_resume UNIQUE (resume_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_role_analyses_resume_id   ON role_analyses(resume_id);
CREATE INDEX IF NOT EXISTS idx_role_analyses_role        ON role_analyses(role);
CREATE INDEX IF NOT EXISTS idx_role_analyses_created_at  ON role_analyses(created_at);


-- ============================================================
-- 3. resume_analysis_synthetic — v1 synthetic training data
-- ============================================================
CREATE TABLE IF NOT EXISTS resume_analysis_synthetic (
    id                        BIGSERIAL   PRIMARY KEY,
    detected_skills           JSONB       NOT NULL DEFAULT '[]',
    role                      TEXT        NOT NULL,
    final_score               INTEGER     NOT NULL,
    readiness_category        TEXT,
    core_coverage_percent     INTEGER,
    optional_coverage_percent INTEGER,
    project_score_percent     INTEGER,
    ats_score_percent         INTEGER,
    structure_score_percent   INTEGER,
    missing_core_skills       JSONB       NOT NULL DEFAULT '[]',
    missing_optional_skills   JSONB       NOT NULL DEFAULT '[]',
    data_type                 TEXT        DEFAULT 'synthetic',
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_synthetic_role        ON resume_analysis_synthetic(role);
CREATE INDEX IF NOT EXISTS idx_synthetic_final_score ON resume_analysis_synthetic(final_score);
CREATE INDEX IF NOT EXISTS idx_synthetic_data_type   ON resume_analysis_synthetic(data_type);


-- ============================================================
-- 4. resume_analysis_synthetic_v2 — v2 real resume training data
--    NOTE: This table was MISSING from the previous schema file.
--    Required by ml_pipeline/data_loader.py for ML training.
--    57,100 records from HuggingFace real resume datasets.
-- ============================================================
CREATE TABLE IF NOT EXISTS resume_analysis_synthetic_v2 (
    id                        BIGSERIAL   PRIMARY KEY,
    detected_skills           JSONB       NOT NULL DEFAULT '[]',
    role                      TEXT        NOT NULL,
    final_score               INTEGER     NOT NULL,
    readiness_category        TEXT,
    core_coverage_percent     INTEGER,
    optional_coverage_percent INTEGER,
    project_score_percent     INTEGER,
    ats_score_percent         INTEGER,
    structure_score_percent   INTEGER,
    missing_core_skills       JSONB       NOT NULL DEFAULT '[]',
    missing_optional_skills   JSONB       NOT NULL DEFAULT '[]',
    data_type                 TEXT        DEFAULT 'synthetic_v2',
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syn_v2_role        ON resume_analysis_synthetic_v2(role);
CREATE INDEX IF NOT EXISTS idx_syn_v2_final_score ON resume_analysis_synthetic_v2(final_score);
CREATE INDEX IF NOT EXISTS idx_syn_v2_data_type   ON resume_analysis_synthetic_v2(data_type);


-- ============================================================
-- 5. knowledge_chunks — PGVector RAG embeddings
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic          TEXT        NOT NULL,
    content        TEXT        NOT NULL,
    embedding      VECTOR(3072),
    source_version TEXT        DEFAULT 'v1.0',
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_topic ON knowledge_chunks(topic);


-- ============================================================
-- 6. prediction_feedback — ML prediction outcome tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS prediction_feedback (
    id              BIGSERIAL    PRIMARY KEY,
    analysis_id     BIGINT       REFERENCES role_analyses(id) ON DELETE SET NULL,
    user_email      TEXT,
    predicted_role  TEXT         NOT NULL,
    correct_role    TEXT,
    score_feedback  TEXT         CHECK (score_feedback IN ('too_high', 'too_low', 'accurate')),
    comment         TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user    ON prediction_feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON prediction_feedback(created_at);


-- ============================================================
-- 7. knowledge_cache — L2 Supabase cache for AI-generated content
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_cache (
    id              BIGSERIAL    PRIMARY KEY,
    topic           TEXT         NOT NULL,
    type            TEXT         NOT NULL,
    content         JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(topic, type)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_topic ON knowledge_cache(topic);
CREATE INDEX IF NOT EXISTS idx_knowledge_type  ON knowledge_cache(type);


-- ============================================================
-- 8. contributions — community content contributions
-- ============================================================
CREATE TABLE IF NOT EXISTS contributions (
    id              BIGSERIAL    PRIMARY KEY,
    topic           TEXT         NOT NULL,
    submitted_by    TEXT,
    content         JSONB        NOT NULL DEFAULT '{}',
    status          TEXT         DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_topic  ON contributions(topic);


-- ============================================================
-- 9. dynamic_curriculums — per-skill syllabus structures
-- ============================================================
CREATE TABLE IF NOT EXISTS dynamic_curriculums (
    id              BIGSERIAL    PRIMARY KEY,
    skill           TEXT         NOT NULL UNIQUE,
    sections        JSONB        NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dyn_curriculums_skill ON dynamic_curriculums(skill);


-- ============================================================
-- 10. user_study_progress — per-user section completion tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS user_study_progress (
    id                 BIGSERIAL    PRIMARY KEY,
    user_email         TEXT         NOT NULL,
    skill              TEXT         NOT NULL,
    completed_sections JSONB        NOT NULL DEFAULT '[]',
    mastered           BOOLEAN      DEFAULT FALSE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(user_email, skill)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_email ON user_study_progress(user_email);
CREATE INDEX IF NOT EXISTS idx_user_progress_skill ON user_study_progress(skill);


-- ============================================================
-- 11. user_quiz_attempts — per-user quiz scores
-- ============================================================
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id              BIGSERIAL    PRIMARY KEY,
    user_email      TEXT         NOT NULL,
    skill           TEXT         NOT NULL,
    section_idx     INTEGER      NOT NULL,
    score           INTEGER      NOT NULL,
    passed          BOOLEAN      NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_email     ON user_quiz_attempts(user_email);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_skill_sec ON user_quiz_attempts(skill, section_idx);


-- ============================================================
-- 12. content_feedback — user feedback on study content quality
-- ============================================================
CREATE TABLE IF NOT EXISTS content_feedback (
    id              BIGSERIAL    PRIMARY KEY,
    skill           TEXT         NOT NULL,
    section_idx     INTEGER,
    feedback_type   TEXT         NOT NULL CHECK (feedback_type IN ('rating', 'error_report', 'suggestion', 'quality_issue')),
    rating          INTEGER      CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT,
    content_type    TEXT         DEFAULT 'section' CHECK (content_type IN ('section', 'overview', 'quiz')),
    user_email      TEXT,
    resolved        BOOLEAN      DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_feedback_skill  ON content_feedback(skill);
CREATE INDEX IF NOT EXISTS idx_content_feedback_type   ON content_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_content_feedback_rating ON content_feedback(rating);


-- ============================================================
-- RLS POLICIES
-- ============================================================
-- The backend uses the service_role key, which bypasses RLS.
-- For direct client access (if ever needed), enable RLS per table.
-- Currently DISABLED for all tables since all access goes through
-- the FastAPI backend with service_role.
-- ============================================================

ALTER TABLE resumes                        DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_analyses                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analysis_synthetic      DISABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analysis_synthetic_v2   DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks               DISABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_feedback            DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_cache                DISABLE ROW LEVEL SECURITY;
ALTER TABLE contributions                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_curriculums            DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_study_progress            DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts             DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_feedback               DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- GRANTS — allow service_role, authenticated, anon full access
-- ============================================================
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- match_knowledge() — PGVector cosine similarity search
-- Used by rag_service.py for RAG retrieval
CREATE OR REPLACE FUNCTION match_knowledge (
    query_embedding VECTOR(3072),
    match_count     INT DEFAULT 5
)
RETURNS TABLE (id UUID, topic TEXT, content TEXT, similarity FLOAT)
LANGUAGE sql STABLE
AS $$
    SELECT id, topic, content,
           1 - (embedding <=> query_embedding) AS similarity
    FROM knowledge_chunks
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;


-- ============================================================
-- VERIFICATION QUERY — run this after applying the schema
-- to confirm all tables exist:
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
--
-- Expected output (12 tables):
--   content_feedback
--   contributions
--   dynamic_curriculums
--   knowledge_cache
--   knowledge_chunks
--   prediction_feedback
--   resumes
--   resume_analysis_synthetic
--   resume_analysis_synthetic_v2
--   role_analyses
--   user_quiz_attempts
--   user_study_progress
-- ============================================================
