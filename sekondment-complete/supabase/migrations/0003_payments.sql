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
