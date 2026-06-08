-- =============================================================================
-- SEKONDMENT — 0018  GLOBAL READINESS FIELDS
-- Location, timezone and work-mode availability so users worldwide can sign up
-- and be matched. Builds on 0013 (country, preferred_currency, jurisdiction).
-- Nothing Jersey-specific; all fields optional with sensible defaults.
-- =============================================================================

-- ── ACCOUNTS: where the user is and how they like to work ───────────────────
alter table accounts
  add column region            text,
  add column city              text,
  add column timezone          text,            -- IANA, e.g. 'Europe/London'
  add column open_to_international boolean not null default true;

-- ── EXPERT PROFILES: work-mode availability + reach ─────────────────────────
alter table expert_profiles
  add column remote_available  boolean not null default true,
  add column onsite_available  boolean not null default false,
  add column hybrid_available  boolean not null default false,
  add column travel_available  boolean not null default false,
  add column countries_served  text[] not null default '{}',
  add column based_country      text,
  add column based_city         text,
  add column timezone           text;

-- ── OPPORTUNITIES: location/jurisdiction context for matching ───────────────
alter table opportunities
  add column country            text,
  add column jurisdiction       text,
  add column local_knowledge_required boolean not null default false,
  add column timezone_overlap   text,           -- free text e.g. '+/- 3h of GMT'
  add column engagement_kind    text;            -- 'freelancer' | 'consultant' | 'employer_resource'

-- Helpful indexes for global search filters.
create index idx_accounts_timezone        on accounts(timezone);
create index idx_expert_remote             on expert_profiles(remote_available);
create index idx_expert_based_country      on expert_profiles(based_country);
create index idx_opportunities_country     on opportunities(country);
