-- AUTO-GENERATED apply bundle: migrations 1-4 (run this whole file once in Supabase SQL Editor)

-- ===================== 0001_core_schema.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0001 CORE SCHEMA
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
-- TRUST SCORE â€” stored snapshot of factors (score itself lives on profiles).
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


-- ===================== 0002_marketplace.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0002 MARKETPLACE & ENGAGEMENT SCHEMA
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


-- ===================== 0003_payments.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0003 PAYMENTS, ESCROW, DISPUTES, REVIEWS
-- Stripe Connect "separate charges & transfers" model. The platform balance
-- IS the escrow (Stripe does not offer legal escrow accounts â€” funds are held
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
-- ESCROW LEDGER â€” append-only record of every money movement.
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


-- ===================== 0004_rls.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0004 ROW LEVEL SECURITY
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
-- ACCOUNTS â€” own row only (admins see all)
-- =============================================================================
create policy accounts_self on accounts
  for select using (id = auth.uid() or is_admin());
create policy accounts_update_self on accounts
  for update using (id = auth.uid());

-- =============================================================================
-- PROFILES â€” public read (discovery), owner write
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
-- OPPORTUNITIES â€” open ones public; drafts owner-only
-- =============================================================================
create policy opp_read on opportunities for select
  using (status <> 'draft' or business_id = my_business_id() or is_admin());
create policy opp_write on opportunities for all
  using (business_id = my_business_id()) with check (business_id = my_business_id());

-- =============================================================================
-- INTEREST â€” expert who expressed it + business who owns the opportunity
-- =============================================================================
create policy interest_read on opportunity_interest for select using (
  expert_id = my_expert_id()
  or exists (select 1 from opportunities o where o.id = opportunity_id and o.business_id = my_business_id())
  or is_admin()
);
create policy interest_expert_write on opportunity_interest for all
  using (expert_id = my_expert_id()) with check (expert_id = my_expert_id());

-- =============================================================================
-- FAVOURITES â€” owner only
-- =============================================================================
create policy saved_experts_owner on saved_experts for all
  using (business_id = my_business_id()) with check (business_id = my_business_id());
create policy saved_opps_owner on saved_opportunities for all
  using (expert_id = my_expert_id()) with check (expert_id = my_expert_id());

-- =============================================================================
-- ENGAGEMENTS â€” the two parties + admin
-- =============================================================================
create policy eng_read on engagements for select using (
  business_id = my_business_id() or expert_id = my_expert_id() or is_admin()
);
-- writes happen via server (service role) to keep money state authoritative.

-- =============================================================================
-- MESSAGING â€” conversation participants only
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
-- MILESTONES / DELIVERABLES / LEDGER / ACTIVITY â€” engagement participants read
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
-- DISPUTES â€” participants + admin (admin resolves)
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
-- REVIEWS â€” public read (they drive trust), reviewer writes once
-- =============================================================================
create policy reviews_read on reviews for select using (true);
create policy reviews_write on reviews for insert with check (reviewer_id = auth.uid());


