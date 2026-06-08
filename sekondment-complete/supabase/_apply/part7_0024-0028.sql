-- AUTO-GENERATED apply bundle: migrations 24-28 (run this whole file once in Supabase SQL Editor)

-- ===================== 0024_proof_and_intelligence.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0024  PROOF DIMENSIONS + MARKETPLACE INTELLIGENCE (Prompt 5)
-- Runs AFTER 0023 (which adds enum values in its own transaction).
-- =============================================================================

-- â”€â”€ Richer CV-intelligence dimensions on profile_expertise â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table profile_expertise
  add column if not exists seniority          text,        -- junior|mid|senior|lead|exec
  add column if not exists team_size_managed  int,
  add column if not exists revenue_responsibility text,
  add column if not exists completed_engagements int not null default 0,
  add column if not exists average_rating      numeric(3,2);

-- â”€â”€ Account-level CV-derived attributes (languages, jurisdictions worked in) â”€
alter table expert_profiles
  add column if not exists languages           text[] not null default '{}',
  add column if not exists jurisdictions_worked text[] not null default '{}',
  add column if not exists seniority           text,
  add column if not exists revenue_responsibility text;

-- â”€â”€ EXPERTISE DEMAND / ANALYTICS (Phase 6 + Phase 8: AI-consumable) â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- One row per expertise; updated as the marketplace runs. Future AI reads this
-- directly â€” no schema change needed to add pricing/forecasting models later.
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

-- â”€â”€ Marketplace intelligence VIEW (Phase 6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ Recompute helper: refresh demand stats for one expertise â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ===================== 0025_taxonomy_expansion.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0025  EXPERTISE TAXONOMY EXPANSION (Prompt 5, Phase 7)
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


-- ===================== 0026_platform_roles_enum.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0026  PLATFORM OPERATIONS CENTRE â€” internal role enum (ISOLATED)
-- Internal platform roles are SEPARATE from marketplace account types
-- (business/expert/employer_partner/admin). These govern the Ops Centre.
-- Enum-add only â€” must be its own transaction (used by 0027).
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


-- ===================== 0027_platform_ops_centre.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0027  PLATFORM OPERATIONS CENTRE â€” tables (runs AFTER 0026)
-- Internal team membership, internal notes, audit logs, and CRM pipeline.
-- The Ops Centre is the owner/internal-team command system â€” separate from and
-- more powerful than the marketplace admin pages.
-- =============================================================================

-- â”€â”€ INTERNAL TEAM (who can access the Ops Centre, and as what role) â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ INTERNAL NOTES (attach to any key record) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ AUDIT LOGS (every sensitive internal action) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ INTERNAL CRM PIPELINE (founder-led sales / partnerships) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ INTERNAL TEAM TASKS (workload tracking) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ RLS â€” Ops Centre data is internal-staff-only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ===================== 0028_ledger_idempotency.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0028  LEDGER IDEMPOTENCY
-- Stripe legitimately retries webhook deliveries (e.g. payment_intent.succeeded).
-- The webhook writes a 'fund' ledger row keyed on the PaymentIntent id; a retry
-- would otherwise insert a DUPLICATE money row and corrupt reconciliation.
--
-- A partial unique index on (stripe_object_id, entry_type) makes each Stripe
-- object record at most one ledger row per entry_type. NULL stripe_object_id is
-- excluded so non-Stripe / future entries are unaffected (and Postgres treats
-- NULLs as distinct anyway). This index also backs the webhook's conflict-safe
-- upsert (ON CONFLICT DO NOTHING).
--
-- Note: 'fund' uses the PaymentIntent id, 'fee' uses the charge id, and each
-- 'transfer_*' uses its own transfer id, so these never collide.
-- =============================================================================

-- Defensive: collapse any pre-existing duplicates before enforcing uniqueness.
delete from ledger_entries a
using ledger_entries b
where a.ctid < b.ctid
  and a.stripe_object_id is not null
  and a.stripe_object_id = b.stripe_object_id
  and a.entry_type = b.entry_type;

create unique index if not exists ux_ledger_stripe_object_entry
  on ledger_entries (stripe_object_id, entry_type)
  where stripe_object_id is not null;


