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
