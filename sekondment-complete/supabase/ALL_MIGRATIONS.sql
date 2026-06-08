-- Sekondment — combined migrations (auto-generated, in order)
-- ⚠ Enum 'add value'/'create type' files (0005,0015,0023,0026) need own transaction.
-- If combined errors on enum usage, run individual files in order instead.

-- ===== 0001_core_schema.sql =====
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

-- ===== 0002_marketplace.sql =====
-- =============================================================================
-- SEKONDMENT — 0002 MARKETPLACE & ENGAGEMENT SCHEMA
-- Opportunities, discovery/favourites, messaging, and the engagement workspace.
-- =============================================================================

create type opportunity_status as enum ('draft', 'open', 'in_engagement', 'closed', 'cancelled');

create type outcome_type as enum (
  'launch_product', 'deliver_project', 'improve_marketing', 'improve_operations',
  'fill_leadership_gap', 'reduce_costs', 'improve_compliance',
  'digital_transformation', 'growth_initiative'
);

create type interest_status as enum ('expressed', 'shortlisted', 'declined', 'agreed', 'withdrawn');

create type engagement_status as enum ('active', 'completed', 'cancelled', 'disputed');

-- -----------------------------------------------------------------------------
-- OPPORTUNITIES
-- -----------------------------------------------------------------------------
create table opportunities (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references business_profiles(id) on delete cascade,
  title             text not null,
  description       text,
  desired_outcome   outcome_type,
  required_expertise text[] not null default '{}',
  industry          text,
  budget_min        numeric(10,2),
  budget_max        numeric(10,2),
  duration          text,
  start_date        date,
  location          text,
  work_mode         work_mode,
  status            opportunity_status not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_opportunities_business on opportunities(business_id);
create index idx_opportunities_status   on opportunities(status);
create index idx_opportunities_outcome  on opportunities(desired_outcome);

-- -----------------------------------------------------------------------------
-- INTEREST  (expert -> opportunity).  The bridge to an engagement.
-- -----------------------------------------------------------------------------
create table opportunity_interest (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  expert_id      uuid not null references expert_profiles(id) on delete cascade,
  status         interest_status not null default 'expressed',
  message        text,
  created_at     timestamptz not null default now(),
  unique (opportunity_id, expert_id)
);

-- -----------------------------------------------------------------------------
-- FAVOURITES / SHORTLISTS
-- -----------------------------------------------------------------------------
create table saved_experts (
  business_id uuid not null references business_profiles(id) on delete cascade,
  expert_id   uuid not null references expert_profiles(id) on delete cascade,
  shortlist   text,            -- optional named shortlist
  created_at  timestamptz not null default now(),
  primary key (business_id, expert_id, shortlist)
);

create table saved_opportunities (
  expert_id      uuid not null references expert_profiles(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (expert_id, opportunity_id)
);

-- -----------------------------------------------------------------------------
-- ENGAGEMENTS  (the workspace spine)
-- -----------------------------------------------------------------------------
create table engagements (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid references opportunities(id) on delete set null,
  business_id     uuid not null references business_profiles(id) on delete restrict,
  expert_id       uuid not null references expert_profiles(id) on delete restrict,

  -- ===== PAYEE MODEL =====
  -- Who receives the money. For a normal expert: 'expert'.
  -- For a Company Resource: 'business' (the employing business).
  payee_type        payee_type not null,
  payee_account_id  uuid not null references accounts(id) on delete restrict,
  -- Optional split: when an employing business passes a cut to the deployed
  -- individual. Fraction (0..1) of the post-fee amount going to the individual.
  resource_split_to_expert numeric(4,3) check (resource_split_to_expert between 0 and 1),

  title           text not null,
  total_amount    numeric(12,2) not null,
  platform_fee_pct numeric(5,2) not null default 15.00,
  currency        char(3) not null default 'GBP',
  status          engagement_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_engagements_business on engagements(business_id);
create index idx_engagements_expert   on engagements(expert_id);
create index idx_engagements_status   on engagements(status);

create trigger trg_eng_updated before update on engagements for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- MESSAGING  (internal only; anti-circumvention enforced in app layer)
-- -----------------------------------------------------------------------------
create table conversations (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references business_profiles(id) on delete cascade,
  expert_id     uuid not null references expert_profiles(id) on delete cascade,
  engagement_id uuid references engagements(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (business_id, expert_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references accounts(id) on delete cascade,
  body            text not null,
  file_url        text,
  -- anti-circumvention: flag messages the filter caught (contact details,
  -- off-platform payment requests). Reviewed by admin, not auto-deleted.
  flagged         boolean not null default false,
  flag_reason     text,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_messages_conversation on messages(conversation_id, created_at);

-- ===== 0003_payments.sql =====
-- =============================================================================
-- SEKONDMENT — 0003 PAYMENTS, ESCROW, DISPUTES, REVIEWS
-- Stripe Connect "separate charges & transfers" model. The platform balance
-- IS the escrow (Stripe does not offer legal escrow accounts — funds are held
-- on the platform and released via delayed transfers).
-- =============================================================================

create type milestone_status as enum ('pending', 'funded', 'submitted', 'approved', 'released', 'disputed', 'refunded');

create type dispute_status as enum ('open', 'under_review', 'resolved_release', 'resolved_refund', 'resolved_split');

-- -----------------------------------------------------------------------------
-- MILESTONES
-- -----------------------------------------------------------------------------
create table milestones (
  id              uuid primary key default gen_random_uuid(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  sort_order      smallint not null,
  title           text not null,
  description     text,
  amount          numeric(12,2) not null check (amount > 0),
  status          milestone_status not null default 'pending',
  -- Stripe references
  payment_intent_id text,    -- charge that funded this milestone into escrow
  funded_at       timestamptz,
  submitted_at    timestamptz,
  approved_at     timestamptz,
  released_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (engagement_id, sort_order)
);

create index idx_milestones_engagement on milestones(engagement_id);
create index idx_milestones_status      on milestones(status);

-- -----------------------------------------------------------------------------
-- DELIVERABLES (attached to milestones)
-- -----------------------------------------------------------------------------
create table deliverables (
  id           uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones(id) on delete cascade,
  title        text not null,
  file_url     text,
  note         text,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- ESCROW LEDGER — append-only record of every money movement.
-- This is the source of truth that reconciles against Stripe, supporting
-- multi-payee splits (Company Resource model).
-- -----------------------------------------------------------------------------
create table ledger_entries (
  id              uuid primary key default gen_random_uuid(),
  engagement_id   uuid not null references engagements(id) on delete restrict,
  milestone_id    uuid references milestones(id) on delete set null,
  entry_type      text not null,  -- 'fund', 'fee', 'transfer_expert', 'transfer_business', 'refund'
  amount          numeric(12,2) not null,
  currency        char(3) not null default 'GBP',
  -- destination connected account for transfers (null for fund/fee)
  destination_account_id uuid references accounts(id) on delete set null,
  stripe_object_id text,          -- pi_..., tr_..., re_...
  created_at      timestamptz not null default now()
);

create index idx_ledger_engagement on ledger_entries(engagement_id);
create index idx_ledger_milestone  on ledger_entries(milestone_id);

-- -----------------------------------------------------------------------------
-- DISPUTES
-- -----------------------------------------------------------------------------
create table disputes (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  milestone_id  uuid references milestones(id) on delete set null,
  raised_by     uuid not null references accounts(id) on delete restrict,
  reason        text not null,
  expert_response text,
  status        dispute_status not null default 'open',
  -- admin resolution
  resolved_by   uuid references accounts(id) on delete set null,
  resolution_note text,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_disputes_engagement on disputes(engagement_id);
create index idx_disputes_status      on disputes(status);

-- -----------------------------------------------------------------------------
-- REVIEWS  (two-sided)
-- -----------------------------------------------------------------------------
create table reviews (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  reviewer_id   uuid not null references accounts(id) on delete cascade,
  reviewee_id   uuid not null references accounts(id) on delete cascade,
  -- shared 1..5 ratings; columns are nullable so each direction uses its own set
  -- business -> expert
  r_expertise            smallint check (r_expertise between 1 and 5),
  r_communication        smallint check (r_communication between 1 and 5),
  r_reliability          smallint check (r_reliability between 1 and 5),
  r_outcome_achievement  smallint check (r_outcome_achievement between 1 and 5),
  r_value_delivered      smallint check (r_value_delivered between 1 and 5),
  -- expert -> business
  r_payment_reliability  smallint check (r_payment_reliability between 1 and 5),
  r_professionalism      smallint check (r_professionalism between 1 and 5),
  r_scope_clarity        smallint check (r_scope_clarity between 1 and 5),
  r_responsiveness       smallint check (r_responsiveness between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  unique (engagement_id, reviewer_id)
);

create index idx_reviews_reviewee on reviews(reviewee_id);

-- -----------------------------------------------------------------------------
-- ACTIVITY FEED  (engagement workspace timeline)
-- -----------------------------------------------------------------------------
create table activity_events (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  actor_id      uuid references accounts(id) on delete set null,
  event_type    text not null,   -- 'milestone_funded', 'deliverable_added', etc.
  detail        jsonb,
  created_at    timestamptz not null default now()
);

create index idx_activity_engagement on activity_events(engagement_id, created_at);

-- ===== 0004_rls.sql =====
-- =============================================================================
-- SEKONDMENT — 0004 ROW LEVEL SECURITY
-- Multi-tenant isolation. Helpers resolve the caller's profile ids; policies
-- restrict reads/writes to data the caller participates in.
-- =============================================================================

-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts where id = auth.uid() and account_type = 'admin');
$$;

-- Helper: business_profile id for current user (null if not a business)
create or replace function my_business_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from business_profiles where account_id = auth.uid();
$$;

-- Helper: expert_profile id for current user (null if not an expert)
create or replace function my_expert_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from expert_profiles where account_id = auth.uid();
$$;

-- =============================================================================
-- ENABLE RLS
-- =============================================================================
alter table accounts            enable row level security;
alter table business_profiles   enable row level security;
alter table expert_profiles     enable row level security;
alter table expert_availability enable row level security;
alter table trust_score_factors enable row level security;
alter table opportunities       enable row level security;
alter table opportunity_interest enable row level security;
alter table saved_experts       enable row level security;
alter table saved_opportunities enable row level security;
alter table engagements         enable row level security;
alter table conversations       enable row level security;
alter table messages            enable row level security;
alter table milestones          enable row level security;
alter table deliverables        enable row level security;
alter table ledger_entries      enable row level security;
alter table disputes            enable row level security;
alter table reviews             enable row level security;
alter table activity_events     enable row level security;

-- =============================================================================
-- ACCOUNTS — own row only (admins see all)
-- =============================================================================
create policy accounts_self on accounts
  for select using (id = auth.uid() or is_admin());
create policy accounts_update_self on accounts
  for update using (id = auth.uid());

-- =============================================================================
-- PROFILES — public read (discovery), owner write
-- Profiles are intentionally readable: the whole marketplace depends on
-- browsing experts and businesses. Sensitive money data lives elsewhere.
-- =============================================================================
create policy biz_read   on business_profiles for select using (true);
create policy biz_write  on business_profiles for all
  using (account_id = auth.uid()) with check (account_id = auth.uid());

create policy expert_read  on expert_profiles for select using (true);
create policy expert_write on expert_profiles for all
  using (account_id = auth.uid()
         -- a business may manage expert profiles it employs (Company Resource)
         or employing_business_id = my_business_id())
  with check (account_id = auth.uid()
         or employing_business_id = my_business_id());

create policy avail_read  on expert_availability for select using (true);
create policy avail_write on expert_availability for all
  using (expert_id = my_expert_id()) with check (expert_id = my_expert_id());

create policy trust_read on trust_score_factors for select using (true);
-- trust factors are written only by service role (server), never by clients.

-- =============================================================================
-- OPPORTUNITIES — open ones public; drafts owner-only
-- =============================================================================
create policy opp_read on opportunities for select
  using (status <> 'draft' or business_id = my_business_id() or is_admin());
create policy opp_write on opportunities for all
  using (business_id = my_business_id()) with check (business_id = my_business_id());

-- =============================================================================
-- INTEREST — expert who expressed it + business who owns the opportunity
-- =============================================================================
create policy interest_read on opportunity_interest for select using (
  expert_id = my_expert_id()
  or exists (select 1 from opportunities o where o.id = opportunity_id and o.business_id = my_business_id())
  or is_admin()
);
create policy interest_expert_write on opportunity_interest for all
  using (expert_id = my_expert_id()) with check (expert_id = my_expert_id());

-- =============================================================================
-- FAVOURITES — owner only
-- =============================================================================
create policy saved_experts_owner on saved_experts for all
  using (business_id = my_business_id()) with check (business_id = my_business_id());
create policy saved_opps_owner on saved_opportunities for all
  using (expert_id = my_expert_id()) with check (expert_id = my_expert_id());

-- =============================================================================
-- ENGAGEMENTS — the two parties + admin
-- =============================================================================
create policy eng_read on engagements for select using (
  business_id = my_business_id() or expert_id = my_expert_id() or is_admin()
);
-- writes happen via server (service role) to keep money state authoritative.

-- =============================================================================
-- MESSAGING — conversation participants only
-- =============================================================================
create policy conv_read on conversations for select using (
  business_id = my_business_id() or expert_id = my_expert_id() or is_admin()
);
create policy conv_write on conversations for insert with check (
  business_id = my_business_id() or expert_id = my_expert_id()
);

create policy msg_read on messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id
          and (c.business_id = my_business_id() or c.expert_id = my_expert_id()))
  or is_admin()
);
create policy msg_write on messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from conversations c where c.id = conversation_id
              and (c.business_id = my_business_id() or c.expert_id = my_expert_id()))
);

-- =============================================================================
-- MILESTONES / DELIVERABLES / LEDGER / ACTIVITY — engagement participants read
-- =============================================================================
create policy ms_read on milestones for select using (
  exists (select 1 from engagements e where e.id = engagement_id
          and (e.business_id = my_business_id() or e.expert_id = my_expert_id())) or is_admin()
);
create policy deliv_read on deliverables for select using (
  exists (select 1 from milestones m join engagements e on e.id = m.engagement_id
          where m.id = milestone_id
          and (e.business_id = my_business_id() or e.expert_id = my_expert_id())) or is_admin()
);
create policy ledger_read on ledger_entries for select using (
  exists (select 1 from engagements e where e.id = engagement_id
          and (e.business_id = my_business_id() or e.expert_id = my_expert_id())) or is_admin()
);
create policy activity_read on activity_events for select using (
  exists (select 1 from engagements e where e.id = engagement_id
          and (e.business_id = my_business_id() or e.expert_id = my_expert_id())) or is_admin()
);

-- =============================================================================
-- DISPUTES — participants + admin (admin resolves)
-- =============================================================================
create policy dispute_read on disputes for select using (
  exists (select 1 from engagements e where e.id = engagement_id
          and (e.business_id = my_business_id() or e.expert_id = my_expert_id())) or is_admin()
);
create policy dispute_raise on disputes for insert with check (
  raised_by = auth.uid()
  and exists (select 1 from engagements e where e.id = engagement_id
              and (e.business_id = my_business_id() or e.expert_id = my_expert_id()))
);

-- =============================================================================
-- REVIEWS — public read (they drive trust), reviewer writes once
-- =============================================================================
create policy reviews_read on reviews for select using (true);
create policy reviews_write on reviews for insert with check (reviewer_id = auth.uid());

-- ===== 0005_enum_additions.sql =====
-- =============================================================================
-- SEKONDMENT — 0005a  ENUM ADDITIONS (must run & commit BEFORE 0005)
-- Postgres forbids using a newly added enum value in the same transaction that
-- adds it, so these live in their own migration file. Supabase runs each
-- migration file in order, each committing before the next begins.
-- =============================================================================

-- Employer Partner becomes a first-class account type.
alter type account_type add value if not exists 'employer_partner';

-- An engagement can now pay an expert, a business, or an employer partner.
alter type payee_type add value if not exists 'employer_partner';

-- ===== 0006_partners_rates_proposals.sql =====
-- =============================================================================
-- SEKONDMENT — 0005  EMPLOYER PARTNERS · RATE TYPES · PROPOSALS
-- Additive migration. Reflects the agreed decisions:
--   1. Employer Partner becomes a first-class account type with per-employee
--      approval before deployment.
--   2. Engagements/opportunities gain a rate_type (fixed/hourly/daily/retainer).
--   3. A real proposals table (price + timeline + cover message) supersedes the
--      lightweight opportunity_interest record for the negotiation flow.
-- Existing migrations 0001–0004 are untouched.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EMPLOYER PARTNER
-- -----------------------------------------------------------------------------
-- NOTE: the enum-value additions ('employer_partner' on account_type and
-- payee_type) live in migration 0005a, which MUST run and commit before this
-- file. Postgres forbids using a newly added enum value in the same
-- transaction that adds it.

-- Approval state for an employee an employer partner wants to deploy.
create type employee_approval_status as enum ('pending', 'approved', 'suspended', 'revoked');

-- New rate model + proposal enums (brand-new types — safe to create and use here).
create type rate_type as enum ('fixed', 'hourly', 'daily', 'retainer');
create type proposal_status as enum ('submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn');


-- -----------------------------------------------------------------------------
-- EMPLOYER PARTNER PROFILE
-- A company that registers employees and earns commission on their deployments.
-- -----------------------------------------------------------------------------
create table employer_partners (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null unique references accounts(id) on delete cascade,
  company_name        text not null,
  logo_url            text,
  industry            text,
  website             text,
  description         text,
  location            text,
  company_size        text,
  -- commission the partner takes from their employee's net earnings (0..1).
  -- Independent of the 15% platform fee; applied to the employee's share.
  default_commission_pct numeric(4,3) not null default 0.000 check (default_commission_pct between 0 and 1),
  verification_status verification_status not null default 'unverified',
  email_verified      boolean not null default false,
  company_verified    boolean not null default false,
  director_verified   boolean not null default false,
  trust_score         smallint not null default 0 check (trust_score between 0 and 100),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_employer_updated before update on employer_partners
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- EMPLOYER ↔ EMPLOYEE LINK  (the approval workflow)
-- An expert profile is "deployable via" an employer partner only once approved.
-- This is the workflow the old attribute-only model could not express.
-- -----------------------------------------------------------------------------
create table employer_employees (
  id               uuid primary key default gen_random_uuid(),
  employer_id      uuid not null references employer_partners(id) on delete cascade,
  expert_id        uuid not null references expert_profiles(id) on delete cascade,
  approval_status  employee_approval_status not null default 'pending',
  -- per-employee commission override; falls back to employer default when null
  commission_pct   numeric(4,3) check (commission_pct between 0 and 1),
  invited_at       timestamptz not null default now(),
  approved_at      timestamptz,
  approved_by      uuid references accounts(id) on delete set null,
  unique (employer_id, expert_id)
);

create index idx_emp_employees_employer on employer_employees(employer_id);
create index idx_emp_employees_expert   on employer_employees(expert_id);

-- Convenience: link an expert profile to its (approved) employer partner.
-- Distinct from employing_business_id (a plain Business that deploys staff);
-- this points at a registered Employer Partner with the approval workflow.
alter table expert_profiles
  add column employer_partner_id uuid references employer_partners(id) on delete set null;

create index idx_expert_employer_partner on expert_profiles(employer_partner_id);


-- -----------------------------------------------------------------------------
-- 2. RATE TYPES
-- -----------------------------------------------------------------------------
alter table opportunities add column rate_type rate_type not null default 'fixed';
-- For hourly/daily/retainer, capacity & rate context:
alter table opportunities add column rate_amount  numeric(10,2);   -- per hour/day, or retainer/mo
alter table opportunities add column est_units    numeric(8,2);    -- est. hours/days (for projection)

alter table engagements  add column rate_type rate_type not null default 'fixed';
alter table engagements  add column rate_amount numeric(10,2);


-- -----------------------------------------------------------------------------
-- 3. PROPOSALS  (supersedes opportunity_interest for the negotiation flow)
-- opportunity_interest is retained for lightweight saves/expressions; proposals
-- carry the commercial offer that can become an engagement.
-- -----------------------------------------------------------------------------
create table proposals (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references opportunities(id) on delete cascade,
  expert_id       uuid not null references expert_profiles(id) on delete cascade,
  -- the offer
  cover_message   text,
  rate_type       rate_type not null default 'fixed',
  price           numeric(12,2),          -- total for fixed; per-unit otherwise
  est_units       numeric(8,2),           -- hours/days estimate for non-fixed
  timeline        text,                   -- e.g. "3 weeks", "start Monday"
  proposed_start  date,
  -- if the proposer is a company resource, who would be paid
  payee_type      payee_type,
  status          proposal_status not null default 'submitted',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (opportunity_id, expert_id)
);

create index idx_proposals_opportunity on proposals(opportunity_id);
create index idx_proposals_expert      on proposals(expert_id);
create index idx_proposals_status      on proposals(status);

create trigger trg_proposals_updated before update on proposals
  for each row execute function set_updated_at();

-- link an accepted proposal to the engagement it produced
alter table engagements add column proposal_id uuid references proposals(id) on delete set null;

-- ===== 0007_rls_partners_proposals.sql =====
-- =============================================================================
-- SEKONDMENT — 0007  RLS FOR NEW TABLES
-- employer_partners · employer_employees · proposals
-- =============================================================================

-- Helper: employer_partner id for the current user (null if not a partner)
create or replace function my_employer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from employer_partners where account_id = auth.uid();
$$;

alter table employer_partners   enable row level security;
alter table employer_employees  enable row level security;
alter table proposals           enable row level security;

-- -----------------------------------------------------------------------------
-- EMPLOYER PARTNERS — public read (discovery of deploying companies), owner write
-- -----------------------------------------------------------------------------
create policy employer_read on employer_partners for select using (true);
create policy employer_write on employer_partners for all
  using (account_id = auth.uid()) with check (account_id = auth.uid());

-- -----------------------------------------------------------------------------
-- EMPLOYER ↔ EMPLOYEE — the employer manages the link; the employee can see
-- their own membership and accept/withdraw.
-- -----------------------------------------------------------------------------
create policy emp_emp_read on employer_employees for select using (
  employer_id = my_employer_id()
  or expert_id = my_expert_id()
  or is_admin()
);
-- employer controls approvals
create policy emp_emp_employer_write on employer_employees for all
  using (employer_id = my_employer_id())
  with check (employer_id = my_employer_id());
-- employee may update only their own row (e.g. withdraw consent)
create policy emp_emp_employee_update on employer_employees for update
  using (expert_id = my_expert_id())
  with check (expert_id = my_expert_id());

-- -----------------------------------------------------------------------------
-- PROPOSALS — the expert who made it + the business that owns the opportunity
-- -----------------------------------------------------------------------------
create policy proposals_read on proposals for select using (
  expert_id = my_expert_id()
  or exists (select 1 from opportunities o where o.id = opportunity_id and o.business_id = my_business_id())
  or is_admin()
);
-- expert creates/edits their own proposal
create policy proposals_expert_write on proposals for all
  using (expert_id = my_expert_id())
  with check (expert_id = my_expert_id());
-- business can update status (shortlist/accept/reject) on proposals to its opportunities
create policy proposals_business_update on proposals for update
  using (exists (select 1 from opportunities o where o.id = opportunity_id and o.business_id = my_business_id()))
  with check (exists (select 1 from opportunities o where o.id = opportunity_id and o.business_id = my_business_id()));

-- ===== 0008_realtime_messages.sql =====
-- =============================================================================
-- SEKONDMENT — 0008  ENABLE REALTIME ON MESSAGES
-- Adds the messages table to the supabase_realtime publication so clients can
-- subscribe to INSERTs. RLS still governs which rows a client may receive.
-- =============================================================================

-- Create the publication if it does not already exist (Supabase ships with it,
-- but this keeps the migration self-contained for fresh local stacks).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table messages;

-- Ensure full row data is available to realtime payloads.
alter table messages replica identity full;

-- ===== 0009_opportunity_visibility.sql =====
-- =============================================================================
-- SEKONDMENT — 0009  OPPORTUNITY VISIBILITY (public / private)
-- Businesses (and employer partners posting work) can mark an opportunity as
-- public (discoverable by anyone, incl. logged-out browse) or private
-- (hidden from discovery; visible only to the owner, admins, and experts the
-- business has directly invited via opportunity_interest).
-- =============================================================================

create type opportunity_visibility as enum ('public', 'private');

alter table opportunities
  add column visibility opportunity_visibility not null default 'public';

create index idx_opportunities_visibility on opportunities(visibility);

-- ── Replace the read policy to honour visibility ────────────────────────────
-- Old policy: any non-draft opportunity was readable by everyone.
-- New policy: a non-draft opportunity is readable when EITHER
--   • it is public, OR
--   • the caller owns it, OR
--   • the caller is an admin, OR
--   • the caller is an expert the business invited (row in opportunity_interest
--     created/updated by the business -> status 'invited' or beyond).
drop policy if exists opp_read on opportunities;

create policy opp_read on opportunities for select using (
  business_id = my_business_id()
  or is_admin()
  or (
    status <> 'draft' and (
      visibility = 'public'
      or exists (
        select 1 from opportunity_interest oi
        where oi.opportunity_id = opportunities.id
          and oi.expert_id = my_expert_id()
      )
    )
  )
);

-- Note: anonymous (logged-out) browse runs through the public Supabase client,
-- which is subject to RLS as the 'anon' role. Public read for anon is handled
-- by the existing anon select grant on public, scoped here to visibility=public
-- and status<>'draft'. The app-layer browse queries also filter explicitly.

-- ===== 0010_expert_visibility.sql =====
-- =============================================================================
-- SEKONDMENT — 0010  EXPERT PROFILE VISIBILITY
-- Experts (incl. company resources and freelancers) can choose whether their
-- profile is publicly listed/discoverable or unlisted (private). Unlisted
-- profiles don't appear in browse/search, but remain reachable by direct link
-- and by businesses they're already engaged with — useful for resources a
-- company doesn't want publicly poached, or freelancers who want invite-only.
-- =============================================================================

create type profile_visibility as enum ('listed', 'unlisted');

alter table expert_profiles
  add column visibility profile_visibility not null default 'listed';

create index idx_expert_profiles_visibility on expert_profiles(visibility);

-- ── Read policy honouring visibility ────────────────────────────────────────
-- Owner, admins, and engaged businesses always see the profile. Everyone else
-- (incl. anonymous browse) only sees listed profiles.
drop policy if exists expert_read on expert_profiles;

create policy expert_read on expert_profiles for select using (
  account_id = auth.uid()
  or is_admin()
  or visibility = 'listed'
  or exists (
    select 1 from engagements e
    join business_profiles b on b.id = e.business_id
    where e.expert_id = expert_profiles.id
      and b.account_id = auth.uid()
  )
);

-- ===== 0011_notifications.sql =====
-- =============================================================================
-- SEKONDMENT — 0011  IN-APP NOTIFICATIONS
-- Lightweight notification feed shown in the nav bell, complementing emails.
-- Each row targets one account; read state tracked per row.
-- =============================================================================

create type notification_type as enum (
  'proposal_received', 'proposal_accepted', 'milestone_funded',
  'work_submitted', 'funds_released', 'dispute_raised', 'message', 'system'
);

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  type        notification_type not null,
  title       text not null,
  body        text,
  link        text,                          -- in-app path to open
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_notifications_account on notifications(account_id, read_at);
create index idx_notifications_created on notifications(created_at desc);

alter table notifications enable row level security;

-- Recipients read and update (mark read) their own; inserts happen via the
-- service client in server actions, which bypasses RLS.
create policy notif_read on notifications for select
  using (account_id = auth.uid());
create policy notif_update on notifications for update
  using (account_id = auth.uid()) with check (account_id = auth.uid());

-- Realtime for live badge updates.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table notifications;
alter table notifications replica identity full;

-- ===== 0012_files_and_boards.sql =====
-- =============================================================================
-- SEKONDMENT — 0012  SECURE FILES + ENGAGEMENT BOARDS
-- (a) Storage bucket policies so files live inside the same RLS perimeter as
--     the data — encrypted at rest, access-controlled, never in email.
-- (b) A lightweight Trello-style board per engagement (columns + cards) so work
--     can be organised and tracked in-app.
-- =============================================================================

-- ── (a) STORAGE ─────────────────────────────────────────────────────────────
-- Create a private bucket for engagement files (deliverables + message attachments).
-- Files are keyed by engagement: <engagement_id>/<filename>. Access is granted
-- only to the two parties on the engagement (and admins).
insert into storage.buckets (id, name, public)
values ('engagement-files', 'engagement-files', false)
on conflict (id) do nothing;

-- Helper: is the current user a party to the engagement whose id prefixes the path?
create or replace function public.can_access_engagement_file(object_name text)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1
    from engagements e
    left join business_profiles b on b.id = e.business_id
    left join expert_profiles  x on x.id = e.expert_id
    where e.id::text = split_part(object_name, '/', 1)
      and (b.account_id = auth.uid() or x.account_id = auth.uid())
  ) or public.is_admin();
$$;

create policy "engagement files: read parties" on storage.objects for select
  using (bucket_id = 'engagement-files' and public.can_access_engagement_file(name));
create policy "engagement files: insert parties" on storage.objects for insert
  with check (bucket_id = 'engagement-files' and public.can_access_engagement_file(name));
create policy "engagement files: delete parties" on storage.objects for delete
  using (bucket_id = 'engagement-files' and public.can_access_engagement_file(name));

-- Add metadata columns to deliverables for richer file info.
alter table deliverables
  add column file_name text,
  add column file_size bigint,
  add column uploaded_by uuid references accounts(id) on delete set null;

-- ── (b) BOARDS ──────────────────────────────────────────────────────────────
create table boards (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (engagement_id)
);

create table board_columns (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references boards(id) on delete cascade,
  title      text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create table board_cards (
  id          uuid primary key default gen_random_uuid(),
  column_id   uuid not null references board_columns(id) on delete cascade,
  title       text not null,
  description text,
  position    int  not null default 0,
  created_by  uuid references accounts(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_board_columns_board on board_columns(board_id, position);
create index idx_board_cards_column  on board_cards(column_id, position);

-- ── RLS: only the engagement's parties (and admins) touch its board ─────────
alter table boards         enable row level security;
alter table board_columns  enable row level security;
alter table board_cards    enable row level security;

create or replace function public.is_engagement_party(eid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from engagements e
    left join business_profiles b on b.id = e.business_id
    left join expert_profiles  x on x.id = e.expert_id
    where e.id = eid and (b.account_id = auth.uid() or x.account_id = auth.uid())
  ) or public.is_admin();
$$;

create policy board_party on boards for all
  using (public.is_engagement_party(engagement_id))
  with check (public.is_engagement_party(engagement_id));

create policy bcol_party on board_columns for all
  using (exists (select 1 from boards b where b.id = board_id and public.is_engagement_party(b.engagement_id)))
  with check (exists (select 1 from boards b where b.id = board_id and public.is_engagement_party(b.engagement_id)));

create policy bcard_party on board_cards for all
  using (exists (
    select 1 from board_columns c join boards b on b.id = c.board_id
    where c.id = column_id and public.is_engagement_party(b.engagement_id)))
  with check (exists (
    select 1 from board_columns c join boards b on b.id = c.board_id
    where c.id = column_id and public.is_engagement_party(b.engagement_id)));

-- Realtime for live board collaboration.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table board_cards;
alter publication supabase_realtime add table board_columns;
alter table board_cards replica identity full;
alter table board_columns replica identity full;

-- ===== 0013_global_currency_country.sql =====
-- =============================================================================
-- SEKONDMENT — 0013  GLOBAL READINESS: CURRENCY + COUNTRY
-- Sekondment is GBP-first (Jersey test market) but global from day one. Carry
-- currency on opportunities and a preferred currency + country on accounts so
-- the UI never assumes GBP and future per-jurisdiction logic has a hook.
-- =============================================================================

-- Opportunities carry the currency their budget is expressed in.
alter table opportunities
  add column currency char(3) not null default 'GBP';

-- Accounts: country (ISO-ish free text for now) + preferred display currency.
alter table accounts
  add column country text,
  add column preferred_currency char(3) not null default 'GBP';

-- Expert rates are quoted in a currency too.
alter table expert_profiles
  add column rate_currency char(3) not null default 'GBP';

-- Helpful indexes for future jurisdiction filtering.
create index idx_accounts_country on accounts(country);
create index idx_opportunities_currency on opportunities(currency);

-- ===== 0014_terms_agreements.sql =====
-- =============================================================================
-- SEKONDMENT — 0014  TERMS, AGREEMENTS & ACCEPTANCE
-- Sekondment facilitates engagements; it does not legally "own the jobs".
-- This adds (a) versioned platform/legal documents, (b) per-user acceptance
-- records, and (c) per-engagement agreement terms both parties accept before
-- work/funding proceeds. Jurisdiction-aware hooks for future per-region terms.
-- =============================================================================

create type legal_doc_kind as enum (
  'platform_terms', 'privacy_policy', 'engagement_terms', 'expert_terms', 'business_terms'
);

-- (a) Versioned legal documents. New version = new row; old rows kept for audit.
create table legal_documents (
  id           uuid primary key default gen_random_uuid(),
  kind         legal_doc_kind not null,
  version      text not null,                 -- e.g. '2026-06-01'
  jurisdiction text not null default 'global', -- 'global' | 'GB' | 'IE' | 'AE' ...
  title        text not null,
  body         text not null,                  -- markdown
  effective_at timestamptz not null default now(),
  is_current   boolean not null default true,
  created_at   timestamptz not null default now()
);
create index idx_legal_docs_kind on legal_documents(kind, jurisdiction, is_current);

-- (b) Acceptance records — who accepted which document version, when.
create table document_acceptances (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  document_id uuid not null references legal_documents(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  ip_hint     text,
  unique (account_id, document_id)
);
create index idx_doc_accept_account on document_acceptances(account_id);

-- (c) Per-engagement agreement: the terms snapshot both parties accept.
alter table engagements
  add column terms_accepted_by_business_at timestamptz,
  add column terms_accepted_by_expert_at   timestamptz,
  add column agreement_snapshot            text;  -- frozen terms text at acceptance

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table legal_documents      enable row level security;
alter table document_acceptances enable row level security;

-- Legal docs are world-readable (needed before login to show terms at sign-up).
create policy legal_docs_read on legal_documents for select using (true);

-- Acceptances: a user sees and creates only their own. No updates/deletes.
create policy doc_accept_read on document_acceptances for select
  using (account_id = auth.uid());
create policy doc_accept_insert on document_acceptances for insert
  with check (account_id = auth.uid());

-- ── Seed current global documents (plain, sensible defaults; replace later) ──
insert into legal_documents (kind, version, jurisdiction, title, body) values
('platform_terms', '2026-06-01', 'global', 'Sekondment Platform Terms',
 'These Platform Terms govern use of Sekondment. Sekondment is a marketplace that '
 || 'facilitates engagements between businesses and experts/partners. Sekondment is '
 || 'not the employer of experts and does not own the work. All payments and '
 || 'communication must remain on-platform. Funds are held and released via our '
 || 'payments partner against agreed milestones. Users must provide accurate '
 || 'information and must not attempt to circumvent the platform. Full terms are '
 || 'subject to update; continued use constitutes acceptance of the current version.'),
('privacy_policy', '2026-06-01', 'global', 'Sekondment Privacy Policy',
 'We process personal data to operate the marketplace: account, profile, '
 || 'engagement, payment and communication data. Data is stored securely and shared '
 || 'only as needed to deliver the service (e.g. payments partner). You may request '
 || 'access or deletion subject to legal retention requirements.'),
('engagement_terms', '2026-06-01', 'global', 'Engagement Agreement',
 'This Engagement Agreement applies to the specific engagement between the business '
 || 'and the expert/partner. Work is delivered against milestones. The business funds '
 || 'each milestone before work proceeds; funds release on approval. Sekondment '
 || 'charges a platform fee. Where the expert is deployed via an Employer Partner, '
 || 'payment routes to the employer with any agreed split. Disputes are handled via '
 || 'the in-platform resolution process. Intellectual property transfers on full '
 || 'payment unless otherwise agreed in writing within the engagement.');

-- ===== 0015_milestone_releasing_enum.sql =====
-- =============================================================================
-- SEKONDMENT — 0015  MILESTONE 'releasing' STATUS
-- Transient claim status used by the release route to atomically move
-- submitted -> releasing, preventing double-release race conditions.
-- Enum value additions must be committed before use (own migration).
-- =============================================================================
alter type milestone_status add value if not exists 'releasing';

-- ===== 0016_security_hardening.sql =====
-- =============================================================================
-- SEKONDMENT — 0015  SECURITY HARDENING (column-level write guards)
-- RLS policies grant row access but cannot restrict *which columns* a user
-- changes. The profile write policies let owners edit their whole row — which
-- would allow self-setting trust_score or verification. These triggers block
-- changes to protected columns unless performed by the service role (server).
--
-- Detection: the service_role JWT has role = 'service_role'. Client requests
-- (anon/authenticated) cannot spoof this. auth.role() returns the current role.
-- =============================================================================

create or replace function public.is_service_role()
returns boolean language sql stable as $$
  select coalesce(auth.role() = 'service_role', false)
$$;

-- ── EXPERT PROFILES: protect trust_score + verification flags ───────────────
create or replace function public.guard_expert_protected()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return new; end if;
  -- Preserve protected columns at their OLD values for non-service writers.
  new.trust_score            := old.trust_score;
  new.verification_status    := old.verification_status;
  new.email_verified         := old.email_verified;
  new.identity_verified      := old.identity_verified;
  new.linkedin_verified      := old.linkedin_verified;
  new.certification_verified := old.certification_verified;
  new.employer_partner_id    := old.employer_partner_id;  -- set only via partner approval
  return new;
end $$;

drop trigger if exists trg_guard_expert on expert_profiles;
create trigger trg_guard_expert before update on expert_profiles
  for each row execute function public.guard_expert_protected();

-- ── BUSINESS PROFILES: protect trust_score + verification flags ─────────────
create or replace function public.guard_business_protected()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return new; end if;
  new.trust_score         := old.trust_score;
  new.verification_status := old.verification_status;
  new.email_verified      := old.email_verified;
  new.company_verified    := old.company_verified;
  new.director_verified   := old.director_verified;
  return new;
end $$;

drop trigger if exists trg_guard_business on business_profiles;
create trigger trg_guard_business before update on business_profiles
  for each row execute function public.guard_business_protected();

-- ── ACCOUNTS: protect account_type + stripe fields from self-edit ───────────
create or replace function public.guard_account_protected()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return new; end if;
  new.account_type         := old.account_type;          -- role can't be self-changed
  new.stripe_account_id    := old.stripe_account_id;     -- payout identity locked
  new.stripe_onboarding_done := old.stripe_onboarding_done;
  return new;
end $$;

drop trigger if exists trg_guard_account on accounts;
create trigger trg_guard_account before update on accounts
  for each row execute function public.guard_account_protected();

-- ── PROPOSALS: lock price once submitted ────────────────────────────────────
-- Proposals are created as 'submitted'. A business must never edit a proposal;
-- an expert cannot change price/terms after submission (only withdraw). Service
-- role (the accept flow) may still update status.
create or replace function public.guard_proposal_price()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return new; end if;
  -- Any non-service writer is blocked from changing commercial terms.
  new.price       := old.price;
  new.rate_type   := old.rate_type;
  new.est_units   := old.est_units;
  return new;
end $$;

drop trigger if exists trg_guard_proposal on proposals;
create trigger trg_guard_proposal before update on proposals
  for each row execute function public.guard_proposal_price();

-- ── LEDGER ENTRIES: append-only. No updates or deletes by anyone but service ─
create or replace function public.guard_ledger_append_only()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return coalesce(new, old); end if;
  raise exception 'ledger_entries is append-only';
end $$;

drop trigger if exists trg_guard_ledger_update on ledger_entries;
create trigger trg_guard_ledger_update before update on ledger_entries
  for each row execute function public.guard_ledger_append_only();

drop trigger if exists trg_guard_ledger_delete on ledger_entries;
create trigger trg_guard_ledger_delete before delete on ledger_entries
  for each row execute function public.guard_ledger_append_only();

-- ===== 0017_account_moderation.sql =====
-- =============================================================================
-- SEKONDMENT — 0017  ACCOUNT MODERATION
-- Admin user management: status (active/warned/suspended), admin notes, and a
-- count of anti-circumvention flags for repeat-offender handling.
-- Status is service-role-write-only (guarded) so users can't un-suspend.
-- =============================================================================

create type account_status as enum ('active', 'warned', 'suspended');

alter table accounts
  add column status account_status not null default 'active',
  add column admin_notes text,
  add column warned_at timestamptz,
  add column suspended_at timestamptz;

create index idx_accounts_status on accounts(status);

-- Extend the account guard so users can't change their own moderation status.
create or replace function public.guard_account_protected()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return new; end if;
  new.account_type           := old.account_type;
  new.stripe_account_id      := old.stripe_account_id;
  new.stripe_onboarding_done := old.stripe_onboarding_done;
  new.status                 := old.status;        -- moderation locked
  new.admin_notes            := old.admin_notes;
  new.warned_at              := old.warned_at;
  new.suspended_at           := old.suspended_at;
  return new;
end $$;

-- ===== 0018_global_fields.sql =====
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

-- ===== 0019_contracts_compliance.sql =====
-- =============================================================================
-- SEKONDMENT — 0019  CONTRACTS, VERIFICATION & COMPLIANCE FOUNDATIONS
-- Versioned engagement terms, reusable contract templates, formal verification
-- evidence, and permanent audit trails. Careful legal language: Sekondment
-- FACILITATES engagements with milestone funding and payment protection; it is
-- NOT a regulated escrow, NOT the employer, and does NOT own the work.
-- =============================================================================

-- ── ENGAGEMENT TERMS (versioned, never overwritten) ─────────────────────────
create table engagement_terms (
  id                   uuid primary key default gen_random_uuid(),
  engagement_id        uuid not null references engagements(id) on delete cascade,
  version              int  not null default 1,
  engagement_type      text not null,           -- freelancer | consultant | employer_resource
  scope                text,
  deliverables         text,
  payment_terms        text,
  milestone_terms      text,
  cancellation_terms   text,
  revision_terms       text,
  ip_terms             text,
  confidentiality_terms text,
  secondment_terms     text,
  bonus_terms          text,
  jurisdiction         text,
  governing_law_note   text,
  business_accepted_at timestamptz,
  expert_accepted_at   timestamptz,
  employer_accepted_at timestamptz,
  created_at           timestamptz not null default now(),
  unique (engagement_id, version)
);
create index idx_eng_terms_engagement on engagement_terms(engagement_id, version desc);

-- ── CONTRACT TEMPLATES (reusable standard documents) ────────────────────────
create table contract_templates (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  body        text not null,
  version     text not null default '2026-06-01',
  is_current  boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── VERIFICATION DOCUMENTS (formal evidence) ────────────────────────────────
create type verification_doc_type as enum (
  'identity', 'business_registration', 'insurance', 'certification',
  'qualification', 'licence', 'reference', 'right_to_work',
  'director_confirmation', 'nda', 'contract', 'portfolio', 'employer_confirmation'
);
create type verification_doc_status as enum ('submitted', 'approved', 'rejected');

create table verification_documents (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  doc_type    verification_doc_type not null,
  file_path   text,                              -- Supabase Storage path
  status      verification_doc_status not null default 'submitted',
  note        text,
  reviewed_by uuid references accounts(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_verif_docs_account on verification_documents(account_id, status);

-- ── COMPLIANCE EVENTS (permanent audit trail) ───────────────────────────────
create type compliance_event_type as enum (
  'identity_submitted', 'business_verified', 'expert_verified', 'right_to_work_noted',
  'contract_accepted', 'nda_accepted', 'secondment_approved', 'milestone_funded',
  'payment_released', 'dispute_raised', 'dispute_resolved', 'off_platform_flag',
  'account_warned', 'account_suspended', 'employer_resource_approved',
  'verification_document_uploaded', 'verification_document_rejected'
);

create table compliance_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    compliance_event_type not null,
  account_id    uuid references accounts(id) on delete set null,
  engagement_id uuid references engagements(id) on delete set null,
  actor_id      uuid references accounts(id) on delete set null,
  detail        jsonb,
  created_at    timestamptz not null default now()
);
create index idx_compliance_created on compliance_events(created_at desc);
create index idx_compliance_account on compliance_events(account_id);

-- ── EMPLOYER ↔ EMPLOYEE EVENTS (consent/approval audit) ─────────────────────
create type employer_employee_event_type as enum (
  'invited', 'accepted', 'rejected', 'approved',
  'suspended', 'reinstated', 'revoked', 'withdrawn'
);

create table employer_employee_events (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid references employer_partners(id) on delete set null,
  employee_id uuid references employer_employees(id) on delete set null,
  event_type  employer_employee_event_type not null,
  actor_id    uuid references accounts(id) on delete set null,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index idx_emp_events_employer on employer_employee_events(employer_id, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table engagement_terms          enable row level security;
alter table contract_templates        enable row level security;
alter table verification_documents    enable row level security;
alter table compliance_events         enable row level security;
alter table employer_employee_events  enable row level security;

-- Engagement terms: parties to the engagement + admins read; writes via service.
create policy eng_terms_read on engagement_terms for select using (
  exists (
    select 1 from engagements e
    left join business_profiles b on b.id = e.business_id
    left join expert_profiles  x on x.id = e.expert_id
    where e.id = engagement_id and (b.account_id = auth.uid() or x.account_id = auth.uid())
  ) or public.is_admin()
);

-- Templates: world-readable (shown at sign-up / engagement creation).
create policy templates_read on contract_templates for select using (true);

-- Verification docs: owner reads own; admin reads all; owner inserts own.
create policy verif_read on verification_documents for select
  using (account_id = auth.uid() or public.is_admin());
create policy verif_insert on verification_documents for insert
  with check (account_id = auth.uid());

-- Compliance + employer events: admin-only read (audit trail). Writes via service.
create policy compliance_admin_read on compliance_events for select using (public.is_admin());
create policy emp_events_admin_read on employer_employee_events for select using (public.is_admin());

-- ── STORAGE: private bucket for verification evidence ───────────────────────
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

-- Path is <account_id>/<file>. Owner reads/writes own; admins read all.
create policy "verif docs: owner read" on storage.objects for select
  using (bucket_id = 'verification-docs'
         and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin()));
create policy "verif docs: owner insert" on storage.objects for insert
  with check (bucket_id = 'verification-docs' and split_part(name, '/', 1) = auth.uid()::text);

-- ── SEED CONTRACT TEMPLATES (careful, defensible language) ──────────────────
insert into contract_templates (slug, title, body) values
('freelancer_services', 'Freelancer Services Agreement',
 'This Services Agreement is between the business and the independent expert. The '
 || 'expert provides services as an independent contractor, not an employee of the '
 || 'business or of Sekondment. Work is delivered against agreed milestones. The '
 || 'business funds each milestone before work proceeds; funds are held and released '
 || 'on approval (an escrow-style payment flow facilitated by the platform and its '
 || 'payments partner). Sekondment facilitates the engagement and does not own the work.'),
('employer_resource', 'Employer-Backed Resource Agreement',
 'This Agreement covers an expert deployed via their Employer Partner (a Company '
 || 'Resource). The individual remains employed by the Employer Partner; payment for '
 || 'the engagement routes to the Employer Partner, with any agreed split to the '
 || 'individual. Sekondment is not the employer of the individual and does not own the '
 || 'work. Milestone funding and payment protection apply as in standard engagements.'),
('secondment', 'Secondment-Style Engagement Agreement',
 'This Agreement covers a secondment-style engagement where an Employer Partner '
 || 'temporarily provides an employee to a business through the platform. The employee '
 || 'remains on the Employer Partner''s payroll. Scope, duration and any bonus terms are '
 || 'set per engagement. Sekondment facilitates the arrangement only.'),
('nda', 'Mutual Non-Disclosure Agreement',
 'Each party agrees to keep confidential information shared during the engagement '
 || 'confidential and to use it only for the purpose of the engagement. This obligation '
 || 'survives completion of the engagement.'),
('statement_of_work', 'Statement of Work',
 'The Statement of Work sets out the scope, deliverables, milestones, timeline and '
 || 'acceptance criteria for the engagement. It forms part of the engagement terms.'),
('milestone_payment', 'Milestone & Payment Terms',
 'Work is divided into milestones. The business funds a milestone before work on it '
 || 'proceeds. Funds are held and released to the payee on approval of the milestone. '
 || 'A platform fee applies. This is an escrow-style flow facilitated by the platform; '
 || 'it is not a regulated escrow service.'),
('cancellation', 'Cancellation Terms',
 'Either party may cancel an engagement subject to the terms agreed. Funded but '
 || 'unreleased milestones are handled via the platform''s resolution process. Work '
 || 'completed and approved before cancellation remains payable.'),
('dispute_policy', 'Dispute Policy',
 'If the parties cannot resolve an issue directly, either may raise a dispute in the '
 || 'platform. The accepted engagement terms version applies. Sekondment provides a '
 || 'resolution process but does not guarantee any particular legal outcome.'),
('no_off_platform', 'No Off-Platform Policy',
 'All payments and communication relating to engagements must remain on the platform. '
 || 'Attempting to move payment or communication off-platform to avoid fees or '
 || 'protections is a breach of the Platform Terms and may result in account action.');

-- ===== 0020_expertise_engine.sql =====
-- =============================================================================
-- SEKONDMENT — 0020  EXPERTISE INTELLIGENCE ENGINE (schema)
-- The moat: structured expertise so the marketplace is searchable by capability,
-- not just job titles. Taxonomy + aliases + relationships + per-profile expertise
-- + evidence + per-opportunity requirements + match recommendations.
-- Seed data lives in 0021 (kept separate so the schema commits cleanly first).
-- =============================================================================

create type expertise_type as enum (
  'role', 'skill', 'tool', 'expertise', 'industry',
  'certification', 'project_type', 'deliverable', 'outcome', 'proof_type'
);
create type expertise_relationship_type as enum (
  'requires', 'related_to', 'commonly_used_with', 'belongs_to', 'evidence_for',
  'industry_relevant', 'certification_for', 'alternative_to', 'prerequisite_for'
);
create type expertise_verification_level as enum ('declared', 'verified', 'proven');
create type expertise_evidence_type as enum (
  'certification', 'portfolio', 'employer_confirmation', 'completed_engagement',
  'review', 'case_study', 'reference', 'work_sample', 'licence',
  'cv_extraction', 'linkedin_extraction'
);
create type expertise_importance as enum ('required', 'preferred', 'optional');

-- ── TAXONOMY (the controlled vocabulary) ────────────────────────────────────
create table expertise_taxonomy (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text not null unique,
  type                   expertise_type not null,
  parent_id              uuid references expertise_taxonomy(id) on delete set null,
  description            text,
  commercial_value_score int not null default 50,   -- 0-100, how valuable/billable
  ai_resistance_score    int not null default 50,   -- 0-100, how hard for AI to replace
  difficulty_level       int not null default 3,     -- 1-5
  demand_weight          int not null default 50,   -- 0-100, market demand
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_taxonomy_type on expertise_taxonomy(type, is_active);
create index idx_taxonomy_parent on expertise_taxonomy(parent_id);

-- ── ALIASES (smarter search: "M365" -> Microsoft 365 Migration) ─────────────
create table expertise_aliases (
  id           uuid primary key default gen_random_uuid(),
  expertise_id uuid not null references expertise_taxonomy(id) on delete cascade,
  alias        text not null,
  created_at   timestamptz not null default now()
);
create index idx_aliases_expertise on expertise_aliases(expertise_id);
create index idx_aliases_alias on expertise_aliases(lower(alias));

-- ── RELATIONSHIPS (connect related concepts) ────────────────────────────────
create table expertise_relationships (
  id                uuid primary key default gen_random_uuid(),
  from_expertise_id uuid not null references expertise_taxonomy(id) on delete cascade,
  to_expertise_id   uuid not null references expertise_taxonomy(id) on delete cascade,
  relationship_type expertise_relationship_type not null,
  weight            int not null default 50,
  created_at        timestamptz not null default now(),
  unique (from_expertise_id, to_expertise_id, relationship_type)
);
create index idx_rel_from on expertise_relationships(from_expertise_id);

-- ── PROFILE EXPERTISE (experts/resources <-> expertise) ─────────────────────
create table profile_expertise (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null,                 -- expert_profiles.id or capacity resource
  profile_type       text not null default 'expert',-- 'expert' | 'resource'
  expertise_id       uuid not null references expertise_taxonomy(id) on delete cascade,
  declared_level     int not null default 3,         -- 1-5 self-declared
  verification_level expertise_verification_level not null default 'declared',
  years_experience   numeric(4,1),
  project_count      int not null default 0,
  last_used_at       date,
  confidence_score   int not null default 50,
  evidence_summary   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (profile_id, profile_type, expertise_id)
);
create index idx_profexp_profile on profile_expertise(profile_id, profile_type);
create index idx_profexp_expertise on profile_expertise(expertise_id);
create index idx_profexp_verif on profile_expertise(verification_level);

-- ── EVIDENCE (proof attached to a profile's expertise) ──────────────────────
create table expertise_evidence (
  id                  uuid primary key default gen_random_uuid(),
  profile_expertise_id uuid not null references profile_expertise(id) on delete cascade,
  evidence_type       expertise_evidence_type not null,
  reference_id        uuid,                          -- e.g. engagement_id / review_id / doc_id
  description         text,
  url                 text,
  verified            boolean not null default false,
  created_at          timestamptz not null default now()
);
create index idx_evidence_profexp on expertise_evidence(profile_expertise_id);

-- ── PROJECT REQUIREMENTS (opportunity <-> required expertise) ───────────────
create table project_expertise_requirements (
  id                       uuid primary key default gen_random_uuid(),
  opportunity_id           uuid not null references opportunities(id) on delete cascade,
  expertise_id             uuid not null references expertise_taxonomy(id) on delete cascade,
  importance               expertise_importance not null default 'required',
  required_level           int not null default 3,
  required_verification_level expertise_verification_level not null default 'declared',
  created_at               timestamptz not null default now(),
  unique (opportunity_id, expertise_id)
);
create index idx_projreq_opp on project_expertise_requirements(opportunity_id);
create index idx_projreq_expertise on project_expertise_requirements(expertise_id);

-- ── MATCH RECOMMENDATIONS (cached rule-based scores) ────────────────────────
create table match_recommendations (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  profile_id     uuid not null,
  profile_type   text not null default 'expert',
  score          int not null default 0,            -- 0-100 match %
  reasons        jsonb,                              -- [{factor, detail, weight}]
  missing        jsonb,                              -- unmet requirements
  created_at     timestamptz not null default now(),
  unique (opportunity_id, profile_id, profile_type)
);
create index idx_match_opp on match_recommendations(opportunity_id, score desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table expertise_taxonomy      enable row level security;
alter table expertise_aliases       enable row level security;
alter table expertise_relationships enable row level security;
alter table profile_expertise       enable row level security;
alter table expertise_evidence      enable row level security;
alter table project_expertise_requirements enable row level security;
alter table match_recommendations   enable row level security;

-- Taxonomy/aliases/relationships are reference data: world-readable, service-write.
create policy taxonomy_read on expertise_taxonomy for select using (true);
create policy aliases_read  on expertise_aliases for select using (true);
create policy rel_read      on expertise_relationships for select using (true);

-- Profile expertise: world-readable (discovery depends on it); owner writes own.
create policy profexp_read on profile_expertise for select using (true);
create policy profexp_write on profile_expertise for all using (
  exists (select 1 from expert_profiles e where e.id = profile_id and e.account_id = auth.uid())
) with check (
  exists (select 1 from expert_profiles e where e.id = profile_id and e.account_id = auth.uid())
);

-- Evidence: readable with the profile expertise; owner writes via their profile.
create policy evidence_read on expertise_evidence for select using (true);
create policy evidence_write on expertise_evidence for all using (
  exists (
    select 1 from profile_expertise pe
    join expert_profiles e on e.id = pe.profile_id
    where pe.id = profile_expertise_id and e.account_id = auth.uid()
  )
) with check (
  exists (
    select 1 from profile_expertise pe
    join expert_profiles e on e.id = pe.profile_id
    where pe.id = profile_expertise_id and e.account_id = auth.uid()
  )
);

-- Project requirements: readable by all; the owning business writes them.
create policy projreq_read on project_expertise_requirements for select using (true);
create policy projreq_write on project_expertise_requirements for all using (
  exists (
    select 1 from opportunities o join business_profiles b on b.id = o.business_id
    where o.id = opportunity_id and b.account_id = auth.uid()
  )
) with check (
  exists (
    select 1 from opportunities o join business_profiles b on b.id = o.business_id
    where o.id = opportunity_id and b.account_id = auth.uid()
  )
);

-- Match recommendations: the business that owns the opportunity reads; service writes.
create policy match_read on match_recommendations for select using (
  exists (
    select 1 from opportunities o join business_profiles b on b.id = o.business_id
    where o.id = opportunity_id and b.account_id = auth.uid()
  ) or public.is_admin()
);

-- ===== 0021_expertise_seed.sql =====
-- =============================================================================
-- SEKONDMENT — 0021  EXPERTISE TAXONOMY SEED
-- ~110 commercially valuable, AI-resistant expertise entries + key aliases.
-- Idempotent: on conflict (slug) do nothing.
-- =============================================================================

insert into expertise_taxonomy (name, slug, type, commercial_value_score, ai_resistance_score) values
  ('Trust Administration','trust-administration','expertise',75,80),
  ('Fund Administration','fund-administration','expertise',75,80),
  ('AML Review','aml-review','expertise',75,80),
  ('KYC Review','kyc-review','expertise',75,80),
  ('Client Due Diligence','client-due-diligence','expertise',75,80),
  ('Regulatory Reporting','regulatory-reporting','expertise',75,80),
  ('Risk Management','risk-management','expertise',75,80),
  ('Financial Reporting','financial-reporting','expertise',75,80),
  ('Audit Preparation','audit-preparation','expertise',75,80),
  ('Payroll','payroll','expertise',75,80),
  ('Bookkeeping','bookkeeping','expertise',75,80),
  ('Tax Advisory','tax-advisory','expertise',75,80),
  ('Corporate Services','corporate-services','expertise',75,80),
  ('Company Secretarial','company-secretarial','expertise',75,80),
  ('Governance','governance','expertise',75,80),
  ('Cloud Architecture','cloud-architecture','expertise',65,60),
  ('AWS Architecture','aws-architecture','expertise',65,60),
  ('Azure Administration','azure-administration','expertise',65,60),
  ('Microsoft 365 Migration','microsoft-365-migration','expertise',65,60),
  ('Cyber Security Audit','cyber-security-audit','expertise',65,60),
  ('ISO27001 Implementation','iso27001-implementation','certification',65,60),
  ('SOC2 Readiness','soc2-readiness','certification',65,60),
  ('Data Engineering','data-engineering','expertise',65,60),
  ('Power BI Dashboarding','power-bi-dashboarding','tool',65,60),
  ('Systems Integration','systems-integration','expertise',65,60),
  ('API Integration','api-integration','expertise',65,60),
  ('Stripe Connect Implementation','stripe-connect-implementation','tool',65,60),
  ('DevOps','devops','expertise',65,60),
  ('Kubernetes Deployment','kubernetes-deployment','tool',65,60),
  ('Database Migration','database-migration','expertise',65,60),
  ('CRM Implementation','crm-implementation','expertise',65,60),
  ('AI Automation','ai-automation','expertise',65,60),
  ('Workflow Automation','workflow-automation','expertise',65,60),
  ('Marketing Strategy','marketing-strategy','expertise',65,60),
  ('Brand Positioning','brand-positioning','expertise',65,60),
  ('Meta Ads Lead Generation','meta-ads-lead-generation','expertise',65,60),
  ('Google Ads','google-ads','expertise',65,60),
  ('LinkedIn Ads','linkedin-ads','expertise',65,60),
  ('SEO','seo','expertise',65,60),
  ('CRO','cro','expertise',65,60),
  ('Funnel Build','funnel-build','expertise',65,60),
  ('Landing Page Strategy','landing-page-strategy','expertise',65,60),
  ('Email Marketing','email-marketing','expertise',65,60),
  ('HubSpot Automation','hubspot-automation','tool',65,60),
  ('Salesforce Marketing Cloud','salesforce-marketing-cloud','tool',65,60),
  ('Campaign Management','campaign-management','expertise',65,60),
  ('Analytics Reporting','analytics-reporting','expertise',65,60),
  ('GA4 Setup','ga4-setup','tool',65,60),
  ('Content Strategy','content-strategy','expertise',65,60),
  ('Local Business Marketing','local-business-marketing','expertise',65,60),
  ('B2B Lead Generation','b2b-lead-generation','expertise',65,60),
  ('Process Improvement','process-improvement','expertise',65,70),
  ('Procurement','procurement','expertise',65,70),
  ('Project Management','project-management','expertise',65,70),
  ('Programme Management','programme-management','expertise',65,70),
  ('Business Analysis','business-analysis','expertise',65,70),
  ('Change Management','change-management','expertise',65,70),
  ('Vendor Management','vendor-management','expertise',65,70),
  ('Operations Management','operations-management','expertise',65,70),
  ('Policy Writing','policy-writing','expertise',65,70),
  ('SOP Creation','sop-creation','expertise',65,70),
  ('Quality Management','quality-management','expertise',65,70),
  ('Supply Chain','supply-chain','expertise',65,70),
  ('Service Delivery','service-delivery','expertise',65,70),
  ('Business Transformation','business-transformation','expertise',65,70),
  ('Legal Support','legal-support','expertise',65,80),
  ('HR Advisory','hr-advisory','expertise',65,80),
  ('Recruitment','recruitment','expertise',65,80),
  ('Executive Search','executive-search','expertise',65,80),
  ('Corporate Governance','corporate-governance','expertise',65,80),
  ('Employment Advisory','employment-advisory','expertise',65,80),
  ('Compliance Advisory','compliance-advisory','expertise',65,80),
  ('Risk Advisory','risk-advisory','expertise',65,80),
  ('Board Support','board-support','expertise',65,80),
  ('Commercial Advisory','commercial-advisory','expertise',65,80),
  ('Fractional CFO','fractional-cfo','role',75,80),
  ('Fractional COO','fractional-coo','role',75,80),
  ('Interim CEO','interim-ceo','role',75,80),
  ('Commercial Strategy','commercial-strategy','role',75,80),
  ('Board Advisory','board-advisory','role',75,80),
  ('Transformation Leadership','transformation-leadership','role',75,80),
  ('Sales Strategy','sales-strategy','role',75,80),
  ('Partnership Strategy','partnership-strategy','role',75,80),
  ('Investor Readiness','investor-readiness','role',75,80),
  ('Business Planning','business-planning','role',75,80)
on conflict (slug) do nothing;

-- Aliases
insert into expertise_aliases (expertise_id, alias) select id, 'M365 migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Office 365 migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'tenant migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Exchange migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'SharePoint migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Entra ID migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Stripe Connect' from expertise_taxonomy where slug='stripe-connect-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'marketplace payments' from expertise_taxonomy where slug='stripe-connect-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Stripe marketplace' from expertise_taxonomy where slug='stripe-connect-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'connected accounts' from expertise_taxonomy where slug='stripe-connect-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'ISO 27001' from expertise_taxonomy where slug='iso27001-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'ISO27001' from expertise_taxonomy where slug='iso27001-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'information security management' from expertise_taxonomy where slug='iso27001-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'ISMS' from expertise_taxonomy where slug='iso27001-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'anti-money laundering' from expertise_taxonomy where slug='aml-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'AML' from expertise_taxonomy where slug='aml-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'AML/CFT' from expertise_taxonomy where slug='aml-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'know your customer' from expertise_taxonomy where slug='kyc-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'KYC' from expertise_taxonomy where slug='kyc-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'client onboarding' from expertise_taxonomy where slug='kyc-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'trustee services' from expertise_taxonomy where slug='trust-administration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'trust admin' from expertise_taxonomy where slug='trust-administration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'fiduciary administration' from expertise_taxonomy where slug='trust-administration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'HubSpot' from expertise_taxonomy where slug='hubspot-automation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'HubSpot workflows' from expertise_taxonomy where slug='hubspot-automation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'HubSpot CRM' from expertise_taxonomy where slug='hubspot-automation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Power BI' from expertise_taxonomy where slug='power-bi-dashboarding' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'PowerBI' from expertise_taxonomy where slug='power-bi-dashboarding' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'BI dashboards' from expertise_taxonomy where slug='power-bi-dashboarding' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'SOC 2' from expertise_taxonomy where slug='soc2-readiness' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'SOC2' from expertise_taxonomy where slug='soc2-readiness' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'SOC 2 Type II' from expertise_taxonomy where slug='soc2-readiness' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'part-time CFO' from expertise_taxonomy where slug='fractional-cfo' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'interim CFO' from expertise_taxonomy where slug='fractional-cfo' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'outsourced CFO' from expertise_taxonomy where slug='fractional-cfo' on conflict do nothing;

-- Relationships (related_to / commonly_used_with) so related-match credit fires.
insert into expertise_relationships (from_expertise_id, to_expertise_id, relationship_type, weight)
select a.id, b.id, 'related_to', 60 from expertise_taxonomy a, expertise_taxonomy b
where (a.slug, b.slug) in (
  ('aws-architecture','cloud-architecture'),
  ('azure-administration','cloud-architecture'),
  ('kubernetes-deployment','devops'),
  ('api-integration','systems-integration'),
  ('stripe-connect-implementation','api-integration'),
  ('soc2-readiness','iso27001-implementation'),
  ('cyber-security-audit','iso27001-implementation'),
  ('kyc-review','aml-review'),
  ('client-due-diligence','kyc-review'),
  ('fund-administration','trust-administration'),
  ('google-ads','meta-ads-lead-generation'),
  ('linkedin-ads','meta-ads-lead-generation'),
  ('hubspot-automation','crm-implementation'),
  ('ga4-setup','analytics-reporting'),
  ('cro','funnel-build'),
  ('programme-management','project-management'),
  ('change-management','business-transformation'),
  ('fractional-coo','operations-management'),
  ('fractional-cfo','financial-reporting'),
  ('board-advisory','corporate-governance')
) on conflict do nothing;

-- ===== 0022_capacity_marketplace.sql =====
-- =============================================================================
-- SEKONDMENT — 0022  WORKFORCE CAPACITY MARKETPLACE
-- Lets Employer Partners list CAPACITY (hours/days of a resource), not just
-- people. Businesses can find expertise + availability. Bookings draw down
-- capacity; utilisation events track usage. The Company Resource model stays
-- the differentiator: payment routes to employer, optional bonus split.
-- =============================================================================

create type capacity_visibility as enum ('public', 'private');
create type capacity_approval as enum ('pending', 'approved', 'suspended');
create type capacity_booking_status as enum ('requested', 'confirmed', 'declined', 'completed', 'cancelled');

-- ── CAPACITY PROFILES (a listable resource + its commercial terms) ──────────
create table capacity_profiles (
  id                      uuid primary key default gen_random_uuid(),
  employer_partner_id     uuid not null references employer_partners(id) on delete cascade,
  employee_id             uuid references employer_employees(id) on delete set null,
  resource_expert_id      uuid references expert_profiles(id) on delete set null,
  title                   text not null,
  available_hours_per_week int not null default 0,
  available_days_per_month int not null default 0,
  availability_start      date,
  availability_end        date,
  timezone                text,
  location                text,
  work_mode               text not null default 'remote',  -- remote | onsite | hybrid
  hourly_rate             numeric(10,2),
  day_rate                numeric(10,2),
  rate_currency           char(3) not null default 'GBP',
  employer_commission_rule numeric(4,3) not null default 0.000,  -- 0-1 fraction to employer
  employee_bonus_rule     numeric(4,3) not null default 0.000,  -- 0-1 fraction bonus to individual
  visibility              capacity_visibility not null default 'private',
  approval_status         capacity_approval not null default 'pending',
  created_at              timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_capacity_employer on capacity_profiles(employer_partner_id);
create index idx_capacity_listed on capacity_profiles(visibility, approval_status);

-- ── CAPACITY TAGS (link a capacity profile to structured expertise) ─────────
create table capacity_tags (
  id           uuid primary key default gen_random_uuid(),
  capacity_id  uuid not null references capacity_profiles(id) on delete cascade,
  expertise_id uuid not null references expertise_taxonomy(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (capacity_id, expertise_id)
);
create index idx_captags_capacity on capacity_tags(capacity_id);
create index idx_captags_expertise on capacity_tags(expertise_id);

-- ── CAPACITY AVAILABILITY (concrete windows, optional finer grain) ──────────
create table capacity_availability (
  id           uuid primary key default gen_random_uuid(),
  capacity_id  uuid not null references capacity_profiles(id) on delete cascade,
  start_date   date not null,
  end_date     date not null,
  hours        int not null default 0,
  note         text,
  created_at   timestamptz not null default now()
);
create index idx_capavail_capacity on capacity_availability(capacity_id, start_date);

-- ── CAPACITY BOOKINGS (a business reserves capacity) ────────────────────────
create table capacity_bookings (
  id            uuid primary key default gen_random_uuid(),
  capacity_id   uuid not null references capacity_profiles(id) on delete cascade,
  business_id   uuid not null references business_profiles(id) on delete cascade,
  engagement_id uuid references engagements(id) on delete set null,
  hours_booked  int not null default 0,
  start_date    date,
  end_date      date,
  status        capacity_booking_status not null default 'requested',
  created_at    timestamptz not null default now()
);
create index idx_capbook_capacity on capacity_bookings(capacity_id);
create index idx_capbook_business on capacity_bookings(business_id);

-- ── CAPACITY UTILISATION EVENTS (audit + analytics) ─────────────────────────
create table capacity_utilisation_events (
  id           uuid primary key default gen_random_uuid(),
  capacity_id  uuid not null references capacity_profiles(id) on delete cascade,
  booking_id   uuid references capacity_bookings(id) on delete set null,
  event_type   text not null,        -- booked | confirmed | completed | cancelled | hours_logged
  hours        int not null default 0,
  detail       jsonb,
  created_at   timestamptz not null default now()
);
create index idx_caputil_capacity on capacity_utilisation_events(capacity_id, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table capacity_profiles           enable row level security;
alter table capacity_tags               enable row level security;
alter table capacity_availability        enable row level security;
alter table capacity_bookings            enable row level security;
alter table capacity_utilisation_events  enable row level security;

-- Helper: does the current user own this employer partner?
create or replace function public.owns_capacity(cap_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from capacity_profiles c
    join employer_partners p on p.id = c.employer_partner_id
    where c.id = cap_id and p.account_id = auth.uid()
  );
$$;

-- Capacity profiles: public+approved are world-readable; owner manages own.
create policy capacity_read on capacity_profiles for select using (
  (visibility = 'public' and approval_status = 'approved')
  or exists (select 1 from employer_partners p where p.id = employer_partner_id and p.account_id = auth.uid())
  or public.is_admin()
);
create policy capacity_write on capacity_profiles for all using (
  exists (select 1 from employer_partners p where p.id = employer_partner_id and p.account_id = auth.uid())
) with check (
  exists (select 1 from employer_partners p where p.id = employer_partner_id and p.account_id = auth.uid())
);

-- Tags + availability: readable by all (discovery); owner writes.
create policy captags_read on capacity_tags for select using (true);
create policy captags_write on capacity_tags for all using (public.owns_capacity(capacity_id)) with check (public.owns_capacity(capacity_id));
create policy capavail_read on capacity_availability for select using (true);
create policy capavail_write on capacity_availability for all using (public.owns_capacity(capacity_id)) with check (public.owns_capacity(capacity_id));

-- Bookings: the booking business + the capacity's employer + admins.
create policy capbook_read on capacity_bookings for select using (
  exists (select 1 from business_profiles b where b.id = business_id and b.account_id = auth.uid())
  or public.owns_capacity(capacity_id)
  or public.is_admin()
);
create policy capbook_insert on capacity_bookings for insert with check (
  exists (select 1 from business_profiles b where b.id = business_id and b.account_id = auth.uid())
);

-- Utilisation events: capacity owner + admin read; writes via service.
create policy caputil_read on capacity_utilisation_events for select using (
  public.owns_capacity(capacity_id) or public.is_admin()
);

-- ===== 0023_expertise_graph_expansion.sql =====
-- =============================================================================
-- SEKONDMENT — 0023  EXPERTISE GRAPH EXPANSION (Prompt 5)
-- Deepens the expertise graph for the long-term moat: adds jurisdiction +
-- service_category as first-class taxonomy types, richer profile_expertise proof
-- dimensions, an expertise demand/analytics table future AI can consume, and a
-- view for marketplace intelligence. No AI here — structured data only.
-- =============================================================================

-- ── New taxonomy types (jurisdiction, service_category, platform) ───────────
-- The expertise_type enum already has role/skill/tool/expertise/industry/
-- certification/project_type/deliverable/outcome/proof_type. Add the rest.
alter type expertise_type add value if not exists 'jurisdiction';
alter type expertise_type add value if not exists 'service_category';
alter type expertise_type add value if not exists 'platform';

-- ===== 0024_proof_and_intelligence.sql =====
-- =============================================================================
-- SEKONDMENT — 0024  PROOF DIMENSIONS + MARKETPLACE INTELLIGENCE (Prompt 5)
-- Runs AFTER 0023 (which adds enum values in its own transaction).
-- =============================================================================

-- ── Richer CV-intelligence dimensions on profile_expertise ──────────────────
alter table profile_expertise
  add column if not exists seniority          text,        -- junior|mid|senior|lead|exec
  add column if not exists team_size_managed  int,
  add column if not exists revenue_responsibility text,
  add column if not exists completed_engagements int not null default 0,
  add column if not exists average_rating      numeric(3,2);

-- ── Account-level CV-derived attributes (languages, jurisdictions worked in) ─
alter table expert_profiles
  add column if not exists languages           text[] not null default '{}',
  add column if not exists jurisdictions_worked text[] not null default '{}',
  add column if not exists seniority           text,
  add column if not exists revenue_responsibility text;

-- ── EXPERTISE DEMAND / ANALYTICS (Phase 6 + Phase 8: AI-consumable) ─────────
-- One row per expertise; updated as the marketplace runs. Future AI reads this
-- directly — no schema change needed to add pricing/forecasting models later.
create table expertise_demand_stats (
  expertise_id        uuid primary key references expertise_taxonomy(id) on delete cascade,
  times_requested     int not null default 0,     -- # opportunities requiring it
  times_matched       int not null default 0,     -- # match recommendations generated
  active_experts      int not null default 0,     -- # profiles declaring it
  proven_experts      int not null default 0,     -- # profiles with proven level
  completed_engagements int not null default 0,
  avg_project_value   numeric(12,2),
  avg_rating          numeric(3,2),
  last_requested_at   timestamptz,
  updated_at          timestamptz not null default now()
);

alter table expertise_demand_stats enable row level security;
-- Admin reads full stats; everyone can read the non-sensitive demand signal.
create policy demand_read on expertise_demand_stats for select using (true);

-- Helper column referenced by the intelligence view (add BEFORE the view).
alter table expertise_taxonomy add column if not exists industry_relevance_note text;

-- ── Marketplace intelligence VIEW (Phase 6) ─────────────────────────────────
-- Joins demand stats with taxonomy weighting so admin analytics + future AI can
-- answer "most requested / fastest growing / highest value" without bespoke queries.
create or replace view expertise_intelligence as
select
  t.id, t.name, t.slug, t.type, t.industry_relevance_note,
  t.commercial_value_score, t.ai_resistance_score, t.demand_weight,
  coalesce(d.times_requested, 0)       as times_requested,
  coalesce(d.times_matched, 0)         as times_matched,
  coalesce(d.active_experts, 0)        as active_experts,
  coalesce(d.proven_experts, 0)        as proven_experts,
  coalesce(d.completed_engagements, 0) as completed_engagements,
  d.avg_project_value,
  d.avg_rating,
  d.last_requested_at
from expertise_taxonomy t
left join expertise_demand_stats d on d.expertise_id = t.id
where t.is_active = true;

-- ── Recompute helper: refresh demand stats for one expertise ────────────────
create or replace function public.refresh_expertise_demand(exp_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into expertise_demand_stats (expertise_id, times_requested, times_matched,
    active_experts, proven_experts, updated_at)
  values (
    exp_id,
    (select count(*) from project_expertise_requirements where expertise_id = exp_id),
    (select count(*) from match_recommendations m
       join project_expertise_requirements r on r.opportunity_id = m.opportunity_id
       where r.expertise_id = exp_id),
    (select count(*) from profile_expertise where expertise_id = exp_id),
    (select count(*) from profile_expertise where expertise_id = exp_id and verification_level = 'proven'),
    now()
  )
  on conflict (expertise_id) do update set
    times_requested = excluded.times_requested,
    times_matched = excluded.times_matched,
    active_experts = excluded.active_experts,
    proven_experts = excluded.proven_experts,
    updated_at = now();
end;
$$;

-- ===== 0025_taxonomy_expansion.sql =====
-- =============================================================================
-- SEKONDMENT — 0025  EXPERTISE TAXONOMY EXPANSION (Prompt 5, Phase 7)
-- Adds 148 expertise/jurisdiction/service records across priority sectors.
-- Idempotent (on conflict slug do nothing). Continues toward the Stage-1 target;
-- the taxonomy is designed to scale to tens of thousands of records.
-- Runs AFTER 0023 (enum values jurisdiction/service_category must be committed).
-- =============================================================================

insert into expertise_taxonomy (name, slug, type, commercial_value_score, ai_resistance_score, industry_relevance_note) values
  ('Penetration Testing','penetration-testing','expertise',72,78,'Cyber Security'),
  ('Security Operations','security-operations','expertise',72,78,'Cyber Security'),
  ('Incident Response','incident-response','expertise',72,78,'Cyber Security'),
  ('Vulnerability Management','vulnerability-management','expertise',72,78,'Cyber Security'),
  ('Security Architecture','security-architecture','expertise',72,78,'Cyber Security'),
  ('Identity & Access Management','identity-and-access-management','expertise',72,78,'Cyber Security'),
  ('Zero Trust Implementation','zero-trust-implementation','expertise',72,78,'Cyber Security'),
  ('Cloud Security Posture','cloud-security-posture','expertise',72,78,'Cyber Security'),
  ('GDPR Compliance','gdpr-compliance','expertise',72,78,'Cyber Security'),
  ('DORA Compliance','dora-compliance','expertise',72,78,'Cyber Security'),
  ('Threat Intelligence','threat-intelligence','expertise',72,78,'Cyber Security'),
  ('SIEM Implementation','siem-implementation','expertise',72,78,'Cyber Security'),
  ('Endpoint Security','endpoint-security','expertise',72,78,'Cyber Security'),
  ('Security Awareness Training','security-awareness-training','expertise',72,78,'Cyber Security'),
  ('GCP Architecture','gcp-architecture','expertise',62,68,'Cloud'),
  ('Multi-Cloud Strategy','multi-cloud-strategy','expertise',62,68,'Cloud'),
  ('Cloud Cost Optimisation','cloud-cost-optimisation','expertise',62,68,'Cloud'),
  ('Cloud Migration','cloud-migration','expertise',62,68,'Cloud'),
  ('Serverless Architecture','serverless-architecture','expertise',62,68,'Cloud'),
  ('Terraform Infrastructure','terraform-infrastructure','expertise',62,68,'Cloud'),
  ('Cloud Networking','cloud-networking','expertise',62,68,'Cloud'),
  ('Disaster Recovery','disaster-recovery','expertise',62,68,'Cloud'),
  ('CI/CD Pipelines','ci-cd-pipelines','expertise',62,68,'DevOps'),
  ('Container Orchestration','container-orchestration','expertise',62,68,'DevOps'),
  ('Site Reliability Engineering','site-reliability-engineering','expertise',62,68,'DevOps'),
  ('Infrastructure as Code','infrastructure-as-code','expertise',62,68,'DevOps'),
  ('Observability & Monitoring','observability-and-monitoring','expertise',62,68,'DevOps'),
  ('Release Engineering','release-engineering','expertise',62,68,'DevOps'),
  ('GitOps','gitops','expertise',62,68,'DevOps'),
  ('Platform Engineering','platform-engineering','expertise',62,68,'DevOps'),
  ('Data Warehousing','data-warehousing','expertise',62,68,'Data'),
  ('ETL Pipeline Development','etl-pipeline-development','expertise',62,68,'Data'),
  ('Data Modelling','data-modelling','expertise',62,68,'Data'),
  ('Analytics Engineering','analytics-engineering','expertise',62,68,'Data'),
  ('Machine Learning Engineering','machine-learning-engineering','expertise',62,68,'Data'),
  ('Data Governance','data-governance','expertise',62,68,'Data'),
  ('Snowflake Implementation','snowflake-implementation','expertise',62,68,'Data'),
  ('Databricks Implementation','databricks-implementation','expertise',62,68,'Data'),
  ('dbt Implementation','dbt-implementation','expertise',62,68,'Data'),
  ('Real-Time Data Streaming','real-time-data-streaming','expertise',62,68,'Data'),
  ('Contract Drafting','contract-drafting','expertise',72,78,'Legal'),
  ('Commercial Contracts','commercial-contracts','expertise',72,78,'Legal'),
  ('Data Protection Law','data-protection-law','expertise',72,78,'Legal'),
  ('Intellectual Property','intellectual-property','expertise',72,78,'Legal'),
  ('Corporate Law','corporate-law','expertise',72,78,'Legal'),
  ('Regulatory Compliance Law','regulatory-compliance-law','expertise',72,78,'Legal'),
  ('Employment Law','employment-law','expertise',72,78,'Legal'),
  ('Dispute Resolution','dispute-resolution','expertise',72,78,'Legal'),
  ('M&A Legal Support','manda-legal-support','expertise',72,78,'Legal'),
  ('Talent Acquisition','talent-acquisition','expertise',62,68,'HR'),
  ('Compensation & Benefits','compensation-and-benefits','expertise',62,68,'HR'),
  ('Organisational Design','organisational-design','expertise',62,68,'HR'),
  ('Employee Relations','employee-relations','expertise',62,68,'HR'),
  ('Performance Management','performance-management','expertise',62,68,'HR'),
  ('HR Systems Implementation','hr-systems-implementation','expertise',62,68,'HR'),
  ('Diversity & Inclusion','diversity-and-inclusion','expertise',62,68,'HR'),
  ('HR Policy Development','hr-policy-development','expertise',62,68,'HR'),
  ('Technical Recruitment','technical-recruitment','expertise',62,68,'Recruitment'),
  ('Executive Recruitment','executive-recruitment','expertise',62,68,'Recruitment'),
  ('RPO Delivery','rpo-delivery','expertise',62,68,'Recruitment'),
  ('Talent Mapping','talent-mapping','expertise',62,68,'Recruitment'),
  ('Employer Branding','employer-branding','expertise',62,68,'Recruitment'),
  ('Contingent Workforce Management','contingent-workforce-management','expertise',62,68,'Recruitment'),
  ('Quantity Surveying','quantity-surveying','expertise',62,68,'Construction'),
  ('Site Management','site-management','expertise',62,68,'Construction'),
  ('Construction Project Management','construction-project-management','expertise',62,68,'Construction'),
  ('Building Information Modelling','building-information-modelling','expertise',62,68,'Construction'),
  ('Health & Safety Management','health-and-safety-management','expertise',62,68,'Construction'),
  ('Contract Administration','contract-administration','expertise',62,68,'Construction'),
  ('Cost Planning','cost-planning','expertise',62,68,'Construction'),
  ('Structural Engineering','structural-engineering','expertise',62,68,'Construction'),
  ('Mechanical Engineering','mechanical-engineering','expertise',62,68,'Engineering'),
  ('Electrical Engineering','electrical-engineering','expertise',62,68,'Engineering'),
  ('Civil Engineering','civil-engineering','expertise',62,68,'Engineering'),
  ('Process Engineering','process-engineering','expertise',62,68,'Engineering'),
  ('Systems Engineering','systems-engineering','expertise',62,68,'Engineering'),
  ('Quality Engineering','quality-engineering','expertise',62,68,'Engineering'),
  ('Maintenance Engineering','maintenance-engineering','expertise',62,68,'Engineering'),
  ('Design Engineering','design-engineering','expertise',62,68,'Engineering'),
  ('Clinical Governance','clinical-governance','expertise',62,78,'Healthcare'),
  ('Healthcare Compliance','healthcare-compliance','expertise',62,78,'Healthcare'),
  ('Medical Device Regulation','medical-device-regulation','expertise',62,78,'Healthcare'),
  ('Care Quality Management','care-quality-management','expertise',62,78,'Healthcare'),
  ('Health Informatics','health-informatics','expertise',62,78,'Healthcare'),
  ('Clinical Trials Management','clinical-trials-management','expertise',62,78,'Healthcare'),
  ('NHS Procurement','nhs-procurement','expertise',62,78,'Healthcare'),
  ('Patient Safety','patient-safety','expertise',62,78,'Healthcare'),
  ('Renewable Energy Project Management','renewable-energy-project-management','expertise',62,68,'Energy'),
  ('Grid Integration','grid-integration','expertise',62,68,'Energy'),
  ('Energy Trading','energy-trading','expertise',62,68,'Energy'),
  ('Carbon Accounting','carbon-accounting','expertise',62,68,'Energy'),
  ('ESG Reporting','esg-reporting','expertise',62,68,'Energy'),
  ('Solar Project Development','solar-project-development','expertise',62,68,'Energy'),
  ('Wind Project Development','wind-project-development','expertise',62,68,'Energy'),
  ('Energy Efficiency Auditing','energy-efficiency-auditing','expertise',62,68,'Energy'),
  ('Lean Manufacturing','lean-manufacturing','expertise',62,68,'Manufacturing'),
  ('Six Sigma','six-sigma','expertise',62,68,'Manufacturing'),
  ('Production Planning','production-planning','expertise',62,68,'Manufacturing'),
  ('Supply Chain Optimisation','supply-chain-optimisation','expertise',62,68,'Manufacturing'),
  ('Quality Assurance','quality-assurance','expertise',62,68,'Manufacturing'),
  ('ISO9001 Implementation','iso9001-implementation','expertise',62,68,'Manufacturing'),
  ('Industrial Automation','industrial-automation','expertise',62,68,'Manufacturing'),
  ('Inventory Management','inventory-management','expertise',62,68,'Manufacturing'),
  ('Property Valuation','property-valuation','expertise',62,68,'Real Estate'),
  ('Asset Management','asset-management','expertise',62,68,'Real Estate'),
  ('Lease Advisory','lease-advisory','expertise',62,68,'Real Estate'),
  ('Development Appraisal','development-appraisal','expertise',62,68,'Real Estate'),
  ('Facilities Management','facilities-management','expertise',62,68,'Real Estate'),
  ('Property Acquisition','property-acquisition','expertise',62,68,'Real Estate'),
  ('Real Estate Finance','real-estate-finance','expertise',62,68,'Real Estate'),
  ('Planning & Development','planning-and-development','expertise',62,68,'Real Estate'),
  ('Management Consulting','management-consulting','expertise',72,68,'Professional Services'),
  ('Strategy Consulting','strategy-consulting','expertise',72,68,'Professional Services'),
  ('Operational Due Diligence','operational-due-diligence','expertise',72,68,'Professional Services'),
  ('Post-Merger Integration','post-merger-integration','expertise',72,68,'Professional Services'),
  ('Cost Reduction','cost-reduction','expertise',72,68,'Professional Services'),
  ('Outsourcing Advisory','outsourcing-advisory','expertise',72,68,'Professional Services'),
  ('Digital Transformation Advisory','digital-transformation-advisory','expertise',72,68,'Professional Services'),
  ('Enterprise Risk Management','enterprise-risk-management','expertise',72,78,'Risk'),
  ('Operational Risk','operational-risk','expertise',72,78,'Risk'),
  ('Credit Risk','credit-risk','expertise',72,78,'Risk'),
  ('Market Risk','market-risk','expertise',72,78,'Risk'),
  ('Risk Modelling','risk-modelling','expertise',72,78,'Risk'),
  ('Business Continuity Planning','business-continuity-planning','expertise',72,78,'Risk'),
  ('Internal Audit','internal-audit','expertise',72,78,'Risk'),
  ('Fraud Risk Management','fraud-risk-management','expertise',72,78,'Risk'),
  ('Jersey (jurisdiction)','jersey-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('Guernsey (jurisdiction)','guernsey-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('Isle of Man (jurisdiction)','isle-of-man-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('United Kingdom (jurisdiction)','united-kingdom-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('Ireland (jurisdiction)','ireland-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('Luxembourg (jurisdiction)','luxembourg-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('Cayman Islands (jurisdiction)','cayman-islands-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('BVI (jurisdiction)','bvi-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('UAE (jurisdiction)','uae-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('Switzerland (jurisdiction)','switzerland-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('Singapore (jurisdiction)','singapore-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('United States (jurisdiction)','united-states-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('Malta (jurisdiction)','malta-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('Gibraltar (jurisdiction)','gibraltar-jurisdiction','jurisdiction',60,85,'Jurisdiction'),
  ('Advisory','advisory-service','service_category',55,60,'Service'),
  ('Implementation','implementation-service','service_category',55,60,'Service'),
  ('Managed Service','managed-service-service','service_category',55,60,'Service'),
  ('Interim Leadership','interim-leadership-service','service_category',55,60,'Service'),
  ('Audit & Assurance','audit-and-assurance-service','service_category',55,60,'Service'),
  ('Project Delivery','project-delivery-service','service_category',55,60,'Service'),
  ('Training & Enablement','training-and-enablement-service','service_category',55,60,'Service'),
  ('Staff Augmentation','staff-augmentation-service','service_category',55,60,'Service')
on conflict (slug) do nothing;

-- ===== 0026_platform_roles_enum.sql =====
-- =============================================================================
-- SEKONDMENT — 0026  PLATFORM OPERATIONS CENTRE — internal role enum (ISOLATED)
-- Internal platform roles are SEPARATE from marketplace account types
-- (business/expert/employer_partner/admin). These govern the Ops Centre.
-- Enum-add only — must be its own transaction (used by 0027).
-- =============================================================================

create type platform_role as enum (
  'platform_owner',     -- founder; can see/do everything; cannot be restricted
  'platform_director',  -- COO/Head of Ops; broad read, no owner controls
  'operations_manager', -- users, verification, disputes, capacity, flagged
  'compliance_manager', -- verification, contracts, compliance, audit, suspensions
  'finance_manager',    -- GMV, revenue, payouts, refunds, ledger, splits
  'marketplace_manager',-- supply/demand, capacity, expertise, liquidity
  'support_team'        -- tickets, basic profiles, notes
);

-- ===== 0027_platform_ops_centre.sql =====
-- =============================================================================
-- SEKONDMENT — 0027  PLATFORM OPERATIONS CENTRE — tables (runs AFTER 0026)
-- Internal team membership, internal notes, audit logs, and CRM pipeline.
-- The Ops Centre is the owner/internal-team command system — separate from and
-- more powerful than the marketplace admin pages.
-- =============================================================================

-- ── INTERNAL TEAM (who can access the Ops Centre, and as what role) ─────────
-- An internal team member links to an account but carries a platform_role that
-- is distinct from their marketplace account_type.
create table platform_team_members (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null unique references accounts(id) on delete cascade,
  role         platform_role not null default 'support_team',
  is_active    boolean not null default true,
  invited_by   uuid references accounts(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_team_role on platform_team_members(role, is_active);

-- Helper: is the current user an active internal team member?
create or replace function public.platform_role_of(uid uuid)
returns platform_role language sql security definer set search_path = public as $$
  select role from platform_team_members where account_id = uid and is_active = true;
$$;

create or replace function public.is_platform_owner()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from platform_team_members
    where account_id = auth.uid() and role = 'platform_owner' and is_active = true
  );
$$;

create or replace function public.is_platform_staff()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from platform_team_members where account_id = auth.uid() and is_active = true
  );
$$;

-- ── INTERNAL NOTES (attach to any key record) ──────────────────────────────
create table internal_notes (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null,    -- account|business|expert|employer_partner|opportunity|engagement|dispute|verification|payment|capacity|crm_lead|team_task
  entity_id       uuid not null,
  note            text not null,
  visibility_role platform_role,    -- null = visible to all staff; else minimum role
  created_by      uuid references accounts(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_notes_entity on internal_notes(entity_type, entity_id);

-- ── AUDIT LOGS (every sensitive internal action) ────────────────────────────
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references accounts(id) on delete set null,
  actor_role  platform_role,
  action      text not null,        -- e.g. viewed_payment, exported_revenue, suspended_user
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);
create index idx_audit_created on audit_logs(created_at desc);
create index idx_audit_actor on audit_logs(actor_id);

-- ── INTERNAL CRM PIPELINE (founder-led sales / partnerships) ────────────────
create type crm_stage as enum (
  'lead','contacted','demo_booked','demo_completed','trial','active_customer',
  'employer_partner_prospect','enterprise_opportunity','partnership_opportunity','lost','won'
);

create table crm_leads (
  id               uuid primary key default gen_random_uuid(),
  company_name     text not null,
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  country          text,
  region           text,
  industry         text,
  lead_source      text,
  estimated_value  numeric(12,2),
  stage            crm_stage not null default 'lead',
  notes            text,
  assigned_to      uuid references accounts(id) on delete set null,
  next_follow_up   date,
  linked_account_id    uuid references accounts(id) on delete set null,
  linked_opportunity_id uuid references opportunities(id) on delete set null,
  linked_engagement_id  uuid references engagements(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_crm_stage on crm_leads(stage);
create index idx_crm_assigned on crm_leads(assigned_to);

-- ── INTERNAL TEAM TASKS (workload tracking) ─────────────────────────────────
create table team_tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  task_type    text,                 -- verification|dispute|support|crm|other
  assigned_to  uuid references accounts(id) on delete set null,
  entity_type  text,
  entity_id    uuid,
  status       text not null default 'open',  -- open|in_progress|done
  due_date     date,
  created_by   uuid references accounts(id) on delete set null,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index idx_tasks_assignee on team_tasks(assigned_to, status);

-- ── RLS — Ops Centre data is internal-staff-only ────────────────────────────
alter table platform_team_members enable row level security;
alter table internal_notes         enable row level security;
alter table audit_logs             enable row level security;
alter table crm_leads              enable row level security;
alter table team_tasks             enable row level security;

-- Team membership: staff can read the roster; only the owner can write it.
create policy team_read on platform_team_members for select using (public.is_platform_staff());
create policy team_owner_write on platform_team_members for all
  using (public.is_platform_owner()) with check (public.is_platform_owner());

-- Notes, audit, CRM, tasks: any active internal staff member can read; writes by staff.
create policy notes_staff on internal_notes for all
  using (public.is_platform_staff()) with check (public.is_platform_staff());
create policy audit_staff_read on audit_logs for select using (public.is_platform_staff());
-- audit_logs are written via service role (append-only from server).
create policy crm_staff on crm_leads for all
  using (public.is_platform_staff()) with check (public.is_platform_staff());
create policy tasks_staff on team_tasks for all
  using (public.is_platform_staff()) with check (public.is_platform_staff());

-- NOTE: seed the first platform_owner manually after migrating, e.g.:
--   insert into platform_team_members (account_id, role)
--   select id, 'platform_owner' from accounts where email = 'joe@mindlabs.je';
