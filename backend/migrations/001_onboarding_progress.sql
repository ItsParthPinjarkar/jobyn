-- Migration: onboarding_progress table
-- Run this in Supabase SQL Editor to create the table for email drip sequences.

create table if not exists onboarding_progress (
    user_id uuid primary key,
    email text not null,
    goal text,
    resume_uploaded_at timestamptz,
    skill_explored_at timestamptz,
    interview_practiced_at timestamptz,
    top_missing_skill text,
    email_welcome_sent boolean default false,
    email_day1_sent boolean default false,
    email_day3_sent boolean default false,
    email_day7_sent boolean default false,
    created_at timestamptz default now()
);

-- RLS: users can only read their own progress
alter table onboarding_progress enable row level security;

create policy "Users can read own onboarding progress"
    on onboarding_progress for select
    using (auth.uid() = user_id);

create policy "Service role can manage onboarding progress"
    on onboarding_progress for all
    using (auth.role() = 'service_role');
