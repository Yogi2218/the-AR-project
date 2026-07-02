-- ══════════════════════════════════════════════════════════════
-- EduAR — Supabase Database Schema
-- Run this entire file in: Supabase → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. PROFILES
--    Auto-populated on first login via trigger (see bottom)
-- ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id                  uuid references auth.users on delete cascade primary key,
  email               text unique not null,
  full_name           text,
  avatar_url          text,
  school_name         text,
  school_id           text,
  class_level         text,
  subjects            text[],
  role                text default 'teacher'
                      check (role in ('teacher', 'school_admin', 'super_admin')),
  onboarding_complete boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 2. SESSIONS
--    Each AR character session a teacher runs
-- ──────────────────────────────────────────────────────────────
create table if not exists sessions (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references profiles(id) on delete cascade not null,
  character_id  text not null,
  language      text default 'english',
  started_at    timestamptz default now(),
  ended_at      timestamptz,
  message_count int default 0,
  school_id     text
);

-- ──────────────────────────────────────────────────────────────
-- 3. GENERATED ASSETS
--    3D characters created by teachers via AI Builder
-- ──────────────────────────────────────────────────────────────
create table if not exists generated_assets (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references profiles(id) on delete cascade not null,
  character_name text,
  glb_path       text,
  voice_id       text,
  thumbnail_url  text,
  is_public      boolean default false,
  created_at     timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 4. SESSION TEMPLATES
--    Saved Q&A scripts per teacher (replaces localStorage)
-- ──────────────────────────────────────────────────────────────
create table if not exists teacher_templates (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references profiles(id) on delete cascade not null,
  character_id  text,
  title         text,
  script        jsonb,
  is_shared     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 5. USAGE LOGS
--    Per-user API consumption for billing / cost control
-- ──────────────────────────────────────────────────────────────
create table if not exists usage_logs (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references profiles(id) on delete cascade not null,
  api_type         text not null
                   check (api_type in ('gemini', 'elevenlabs', 'tripo', 'google_tts')),
  tokens_used      int,
  characters_used  int,
  model_generated  boolean default false,
  created_at       timestamptz default now()
);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════════

alter table profiles          enable row level security;
alter table sessions          enable row level security;
alter table generated_assets  enable row level security;
alter table teacher_templates enable row level security;
alter table usage_logs        enable row level security;

-- PROFILES
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- SESSIONS
create policy "Users can manage own sessions"
  on sessions for all using (auth.uid() = user_id);

-- GENERATED ASSETS
create policy "Users can manage own assets"
  on generated_assets for all using (auth.uid() = user_id);

create policy "Anyone can read public assets"
  on generated_assets for select using (is_public = true);

-- TEMPLATES
create policy "Users can manage own templates"
  on teacher_templates for all using (auth.uid() = user_id);

create policy "Anyone can read shared templates"
  on teacher_templates for select using (is_shared = true);

-- USAGE LOGS
create policy "Users can read own usage"
  on usage_logs for select using (auth.uid() = user_id);

create policy "Service role can insert usage"
  on usage_logs for insert with check (true);

-- ══════════════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE TRIGGER
-- Fires when a new user signs up via Google OAuth
-- ══════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop if exists, then recreate (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
