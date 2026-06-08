-- =============================================================================
-- SEKONDMENT — 0001 CORE SCHEMA
-- Accounts, profiles, verification, trust score, and the Company Resource
-- payee model. Everything downstream inherits from this file.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
create type account_type    as enum ('business', 'expert', 'admin');
-- Note: a "Company Resource" is not a separate account_type. It is an expert
-- profile whose employing_business_id is set. This is deliberate: it lets the
-- same person be deployed by a business while remaining a normal expert record,
-- and it lets payouts route to the employer. See payee model below.

create type verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

create type expert_category as enum (
  'fractional', 'consultant', 'advisor', 'interim',
  'specialist', 'project_based', 'company_resource', 'seconded_resource'
);

create type work_mode as enum ('remote', 'hybrid', 'on_site');

create type availability_type as enum (
  'available_now', 'available_from', 'project_only',
  'fractional_only', 'advisory_only'
);

-- The single most important enum for the payment model:
-- who actually receives money for an engagement.
create type payee_type as enum ('expert', 'business');

-- -----------------------------------------------------------------------------
-- ACCOUNTS  (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table accounts (
  id              uuid primary key references auth.users(id) on delete cascade,
  account_type    account_type not null,
  email           text not null,
  full_name       text,
  email_verified  boolean not null default false,
  mfa_enabled     boolean not null default false,
  -- Stripe Connect: every entity that can RECEIVE money has a connected account.
  -- Populated lazily during Stripe onboarding (Phase 4). Null until then.
  stripe_account_id        text unique,
  stripe_onboarding_done   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- BUSINESS PROFILE
-- -----------------------------------------------------------------------------
create table business_profiles (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null unique references accounts(id) on delete cascade,
  company_name        text not null,
  logo_url            text,
  industry            text,
  website             text,
  description         text,
  location            text,
  company_size        text,
  verification_status verification_status not null default 'unverified',
  -- granular verification flags
  email_verified      boolean not null default false,
  company_verified    boolean not null default false,
  director_verified   boolean not null default false,
  trust_score         smallint not null default 0 check (trust_score between 0 and 100),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- EXPERT PROFILE  (also represents Company Resources)
-- -----------------------------------------------------------------------------
create table expert_profiles (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null unique references accounts(id) on delete cascade,
  name                text not null,
  photo_url           text,
  headline            text,
  bio                 text,
  skills              text[] not null default '{}',
  expertise_areas     text[] not null default '{}',
  industries          text[] not null default '{}',
  experience          text,
  certifications      text[] not null default '{}',
  portfolio_url       text,
  linkedin_url        text,
  website             text,
  hourly_rate         numeric(10,2),
  daily_rate          numeric(10,2),
  categories          expert_category[] not null default '{}',

  -- ===== COMPANY RESOURCE MODEL =====
  -- When set, this expert is deployed by a business and remains its employee.
  -- Payouts for this expert's engagements route to the employing business by
  -- default (the employer is the merchant relationship; the person may have no
  -- Stripe account at all).
  employing_business_id uuid references business_profiles(id) on delete set null,

  verification_status verification_status not null default 'unverified',
  email_verified      boolean not null default false,
  identity_verified   boolean not null default false,
  linkedin_verified   boolean not null default false,
  certification_verified boolean not null default false,
  trust_score         smallint not null default 0 check (trust_score between 0 and 100),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_expert_employing_business on expert_profiles(employing_business_id);
create index idx_expert_skills on expert_profiles using gin (skills);
create index idx_expert_expertise on expert_profiles using gin (expertise_areas);

-- -----------------------------------------------------------------------------
-- AVAILABILITY  (1:1 with expert)
-- -----------------------------------------------------------------------------
create table expert_availability (
  expert_id        uuid primary key references expert_profiles(id) on delete cascade,
  availability_type availability_type not null default 'available_now',
  available_from   date,
  hours_per_week   smallint,
  days_per_month   smallint,
  work_modes       work_mode[] not null default '{}',
  updated_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- TRUST SCORE — stored snapshot of factors (score itself lives on profiles).
-- Recomputed server-side; never trust a client-supplied score.
-- -----------------------------------------------------------------------------
create table trust_score_factors (
  account_id              uuid primary key references accounts(id) on delete cascade,
  verification_level      smallint not null default 0,  -- 0..4
  completion_rate         numeric(5,2) not null default 0, -- %
  avg_review              numeric(3,2) not null default 0, -- 0..5
  repeat_engagements      int not null default 0,
  avg_response_minutes    int,
  payment_reliability     numeric(5,2) not null default 0, -- %
  dispute_count           int not null default 0,
  profile_completeness    numeric(5,2) not null default 0, -- %
  computed_at             timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_accounts_updated   before update on accounts            for each row execute function set_updated_at();
create trigger trg_biz_updated        before update on business_profiles   for each row execute function set_updated_at();
create trigger trg_expert_updated     before update on expert_profiles     for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create account row on signup (account_type carried in user metadata)
-- -----------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.accounts (id, email, account_type, full_name)
  values (
    new.id,
    new.email,
    coalesce((new.raw_user_meta_data->>'account_type')::account_type, 'expert'),
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
