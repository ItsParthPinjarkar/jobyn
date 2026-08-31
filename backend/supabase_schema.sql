-- ============================================================
--  Jobyn — Supabase Schema
--  Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. resumes
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

-- 2. role_analyses
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

-- Unique constraints required for upsert ON CONFLICT
ALTER TABLE resumes       ADD CONSTRAINT uq_resumes_filename_email UNIQUE (filename, user_email);
ALTER TABLE role_analyses  ADD CONSTRAINT uq_role_analyses_resume  UNIQUE (resume_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_role_analyses_resume_id  ON role_analyses(resume_id);
CREATE INDEX IF NOT EXISTS idx_role_analyses_role       ON role_analyses(role);
CREATE INDEX IF NOT EXISTS idx_role_analyses_created_at ON role_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_resumes_user_email      ON resumes(user_email);

-- Row Level Security — disabled (backend uses service_role key)
ALTER TABLE resumes       DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_analyses DISABLE ROW LEVEL SECURITY;

-- 3. Synthetic ML training dataset (Phase 4A)
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

CREATE INDEX IF NOT EXISTS idx_synthetic_role       ON resume_analysis_synthetic(role);
CREATE INDEX IF NOT EXISTS idx_synthetic_final_score ON resume_analysis_synthetic(final_score);
CREATE INDEX IF NOT EXISTS idx_synthetic_data_type  ON resume_analysis_synthetic(data_type);

ALTER TABLE resume_analysis_synthetic DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE resume_analysis_synthetic TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE resume_analysis_synthetic_id_seq TO anon, authenticated, service_role;

-- 4. Synthetic ML training dataset v2 — high-ambiguity, realistic (Phase 4B)
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

ALTER TABLE resume_analysis_synthetic_v2 DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE    resume_analysis_synthetic_v2         TO anon, authenticated, service_role;
-- 5. RAG Knowledge Base (Phase 1 / Phase 8)
-- IMPORTANT: Gemini models/gemini-embedding-001 uses 768 dimensions.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id uuid primary key default uuid_generate_v4(),
    topic text not null,
    content text not null,
    embedding vector(3072), -- Gemini models/gemini-embedding-001 defaults to 3072
    source_version text default 'v1.0',
    created_at timestamp default now()
);

ALTER TABLE knowledge_chunks DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE knowledge_chunks TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION match_knowledge (
    query_embedding vector(3072),
    match_count int default 5
)
RETURNS TABLE (id uuid, topic text, content text, similarity float)
LANGUAGE sql STABLE
AS $$
    SELECT id, topic, content,
           1 - (embedding <=> query_embedding) as similarity
    FROM knowledge_chunks
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;

-- 6. User feedback / corrections on predictions
CREATE TABLE IF NOT EXISTS prediction_feedback (
    id              BIGSERIAL    PRIMARY KEY,
    analysis_id     BIGINT       REFERENCES role_analyses(id) ON DELETE SET NULL,
    user_email      TEXT,
    predicted_role  TEXT         NOT NULL,
    correct_role    TEXT,            -- null = user confirms prediction was right
    score_feedback  TEXT CHECK (score_feedback IN ('too_high', 'too_low', 'accurate')),
    comment         TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user    ON prediction_feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON prediction_feedback(created_at);
ALTER TABLE prediction_feedback DISABLE ROW LEVEL SECURITY;

-- 7. Knowledge cache (replaces local SQLite knowledge_cache)
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
ALTER TABLE knowledge_cache DISABLE ROW LEVEL SECURITY;

-- 8. Community contributions (replaces local SQLite contributions)
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
ALTER TABLE contributions DISABLE ROW LEVEL SECURITY;

-- 9. Dynamic Curriculums (stores N-section syllabus structures for skills)
CREATE TABLE IF NOT EXISTS dynamic_curriculums (
    id              BIGSERIAL    PRIMARY KEY,
    skill           TEXT         NOT NULL UNIQUE,
    sections        JSONB        NOT NULL, -- Array of {idx, title, desc, duration}
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dyn_curriculums_skill ON dynamic_curriculums(skill);
ALTER TABLE dynamic_curriculums DISABLE ROW LEVEL SECURITY;

-- 10. User Study Progress (tracks which sections a user has completed)
CREATE TABLE IF NOT EXISTS user_study_progress (
    id                 BIGSERIAL    PRIMARY KEY,
    user_email         TEXT         NOT NULL,
    skill              TEXT         NOT NULL,
    completed_sections JSONB        NOT NULL DEFAULT '[]', -- List of completed section indexes (e.g. [0, 1, 2])
    mastered           BOOLEAN      DEFAULT FALSE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(user_email, skill)
);
CREATE INDEX IF NOT EXISTS idx_user_progress_email ON user_study_progress(user_email);
CREATE INDEX IF NOT EXISTS idx_user_progress_skill ON user_study_progress(skill);
ALTER TABLE user_study_progress DISABLE ROW LEVEL SECURITY;

-- 11. User Quiz Attempts (logs grades and pass/fail state for section quizzes)
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id              BIGSERIAL    PRIMARY KEY,
    user_email      TEXT         NOT NULL,
    skill           TEXT         NOT NULL,
    section_idx     INTEGER      NOT NULL,
    score           INTEGER      NOT NULL, -- Percentage score (0 - 100)
    passed          BOOLEAN      NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_email ON user_quiz_attempts(user_email);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_skill_sec ON user_quiz_attempts(skill, section_idx);
ALTER TABLE user_quiz_attempts DISABLE ROW LEVEL SECURITY;

-- 12. Content Feedback (user feedback on study content quality for iterative improvement)
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
CREATE INDEX IF NOT EXISTS idx_content_feedback_skill ON content_feedback(skill);
CREATE INDEX IF NOT EXISTS idx_content_feedback_type ON content_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_content_feedback_rating ON content_feedback(rating);
ALTER TABLE content_feedback DISABLE ROW LEVEL SECURITY;

