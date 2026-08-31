-- Phase 2: skill verification persistence.
-- Stores skills a user confirmed via the opt-in verification quiz so their
-- unlocked score survives across sessions and future re-analyses.
--
-- This project has no migration tool — apply manually in the Supabase SQL editor.
-- The app degrades gracefully until this exists (verification still works in-session,
-- it just won't persist).

create table if not exists public.skill_proficiency (
    id          bigserial primary key,
    user_email  text        not null,
    skill       text        not null,
    level       text        not null default 'proficient',
    confidence  real        not null default 1.0,
    source      text        not null default 'quiz',   -- 'quiz' | 'resume'
    verified    boolean     not null default true,
    assessed_at timestamptz not null default now(),
    unique (user_email, skill)
);

create index if not exists idx_skill_proficiency_user
    on public.skill_proficiency (user_email);

-- RLS: a user may only see/modify their own proficiency rows.
alter table public.skill_proficiency enable row level security;

drop policy if exists "own_skill_proficiency" on public.skill_proficiency;
create policy "own_skill_proficiency" on public.skill_proficiency
    for all
    using (user_email = auth.jwt() ->> 'email')
    with check (user_email = auth.jwt() ->> 'email');
