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
