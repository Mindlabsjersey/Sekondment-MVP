-- Apply in Supabase Dashboard -> SQL Editor (runs over HTTPS, no Postgres port needed).
-- Adds: research taxonomy (0030), configurable commission (0031), concierge (0032).

-- ===== 0030_research_taxonomy.sql =====
-- =============================================================================
-- SEKONDMENT — 0029  RESEARCH-BACKED TAXONOMY + DEMAND DATA (Prompt: research)
-- 62 expertise records across 14 sectors, with commercial_value_score,
-- ai_resistance_score and demand_weight set from 2026 market research (fractional
-- leadership, cyber, AI/data, compliance, energy/HSE, healthcare, defence...).
-- Idempotent. Runs after 0023 (enum types) / 0025 (earlier expansion).
-- =============================================================================

insert into expertise_taxonomy (name, slug, type, commercial_value_score, ai_resistance_score, demand_weight, industry_relevance_note) values
  ('Machine Learning Engineering','machine-learning-engineering','expertise',86,60,100,'Data & AI'),
  ('Agentic AI Development','agentic-ai-development','expertise',90,80,100,'Data & AI'),
  ('LLM / Prompt Engineering','llm-prompt-engineering','expertise',78,40,100,'Data & AI'),
  ('MLOps & Model Deployment','mlops-model-deployment','expertise',80,60,100,'Data & AI'),
  ('AI Governance & Ethics','ai-governance-ethics','expertise',81,100,100,'Data & AI'),
  ('Data Engineering','data-engineering','expertise',75,60,100,'Data & AI'),
  ('Data Governance','data-governance','expertise',76,80,100,'Data & AI'),
  ('Analytics Engineering (dbt)','analytics-engineering-dbt','expertise',73,60,80,'Data & AI'),
  ('Fractional AI Officer','fractional-ai-officer','role',93,100,100,'Data & AI'),
  ('Penetration Testing','penetration-testing','expertise',80,80,100,'Cyber Security'),
  ('Security Architecture','security-architecture','expertise',83,80,100,'Cyber Security'),
  ('Incident Response & Forensics','incident-response-forensics','expertise',81,80,100,'Cyber Security'),
  ('Zero Trust Implementation','zero-trust-implementation','expertise',81,80,100,'Cyber Security'),
  ('Cloud Security (CSPM)','cloud-security-cspm','expertise',80,80,100,'Cyber Security'),
  ('AI Security / Red Teaming','ai-security-red-teaming','expertise',86,100,100,'Cyber Security'),
  ('SOC2 Readiness','soc2-readiness','expertise',75,80,100,'Cyber Security'),
  ('ISO27001 Implementation','iso27001-implementation','expertise',75,80,100,'Cyber Security'),
  ('Fractional CISO','fractional-ciso','role',90,100,100,'Cyber Security'),
  ('Cloud Architecture (AWS)','cloud-architecture-aws','expertise',78,60,100,'Technology'),
  ('Azure Architecture','azure-architecture','expertise',76,60,80,'Technology'),
  ('Kubernetes / Platform Engineering','kubernetes-platform-engineering','expertise',80,60,100,'Technology'),
  ('Site Reliability Engineering','site-reliability-engineering','expertise',78,60,80,'Technology'),
  ('Terraform / IaC','terraform-iac','expertise',76,60,80,'Technology'),
  ('Stripe Connect Implementation','stripe-connect-implementation','expertise',75,60,80,'Technology'),
  ('Microsoft 365 Migration','microsoft-365-migration','expertise',70,40,80,'Technology'),
  ('Fractional CTO','fractional-cto','role',86,100,100,'Technology'),
  ('AML Review','aml-review','expertise',71,80,100,'Finance'),
  ('KYC Review','kyc-review','expertise',70,60,100,'Finance'),
  ('Trust Administration','trust-administration','expertise',71,80,80,'Finance'),
  ('Fund Administration','fund-administration','expertise',72,80,80,'Finance'),
  ('Regulatory Reporting','regulatory-reporting','expertise',73,80,80,'Finance'),
  ('Financial Modelling','financial-modelling','expertise',75,60,80,'Finance'),
  ('Fractional CFO','fractional-cfo','role',86,100,100,'Leadership'),
  ('Fractional Financial Controller','fractional-financial-controller','role',78,80,80,'Finance'),
  ('Enterprise Risk Management','enterprise-risk-management','expertise',78,100,80,'Risk'),
  ('Operational Resilience (DORA)','operational-resilience-dora','expertise',80,100,100,'Risk'),
  ('Internal Audit','internal-audit','expertise',73,80,80,'Risk'),
  ('Data Protection / GDPR','data-protection-gdpr','expertise',76,80,100,'Legal'),
  ('Commercial Contracts','commercial-contracts','expertise',75,80,80,'Legal'),
  ('M&A Legal Support','m&a-legal-support','expertise',83,100,80,'Legal'),
  ('Meta Ads Lead Generation','meta-ads-lead-generation','expertise',67,40,80,'Marketing'),
  ('Google Ads / PPC','google-ads-ppc','expertise',67,40,80,'Marketing'),
  ('SEO Strategy','seo-strategy','expertise',66,40,60,'Marketing'),
  ('HubSpot / Lifecycle Automation','hubspot-lifecycle-automation','expertise',68,40,80,'Marketing'),
  ('Fractional CMO','fractional-cmo','role',81,80,100,'Marketing'),
  ('Business Transformation','business-transformation','expertise',80,80,80,'Operations'),
  ('Change Management','change-management','expertise',75,80,80,'Operations'),
  ('Supply Chain Optimisation','supply-chain-optimisation','expertise',76,80,100,'Operations'),
  ('Fractional COO','fractional-coo','role',85,100,100,'Leadership'),
  ('PMO / Programme Management','pmo-programme-management','expertise',73,60,80,'Operations'),
  ('Renewable Energy Project Management','renewable-energy-project-management','expertise',76,80,100,'Energy'),
  ('Carbon Accounting & ESG Reporting','carbon-accounting-esg-reporting','expertise',75,80,100,'Energy'),
  ('Grid Integration','grid-integration','expertise',78,80,80,'Energy'),
  ('HSE / Health & Safety Management','hse-health-safety-management','expertise',71,80,100,'Construction'),
  ('Quantity Surveying','quantity-surveying','expertise',73,80,80,'Construction'),
  ('BIM Coordination','bim-coordination','expertise',71,60,80,'Construction'),
  ('Clinical Governance','clinical-governance','expertise',75,100,100,'Healthcare'),
  ('Medical Device Regulation','medical-device-regulation','expertise',78,100,100,'Healthcare'),
  ('Health Informatics','health-informatics','expertise',76,80,80,'Healthcare'),
  ('Lean Manufacturing / Six Sigma','lean-manufacturing-six-sigma','expertise',73,80,80,'Manufacturing'),
  ('Industrial Automation','industrial-automation','expertise',76,80,100,'Manufacturing'),
  ('Defence Procurement','defence-procurement','expertise',80,100,100,'Defence')
on conflict (slug) do nothing;


-- ===== 0031_configurable_commission.sql =====
-- =============================================================================
-- SEKONDMENT — 0031  CONFIGURABLE COMMISSION
-- Site-wide default platform fee (owner-controlled) + per-company override.
-- The fee is SNAPSHOTTED onto each engagement at creation (engagements.
-- platform_fee_pct already exists) so in-flight deals never change rate.
-- Default stays 15%. Only the owner can change site-wide settings.
-- =============================================================================

-- ── SITE-WIDE PLATFORM SETTINGS (single row, owner-controlled) ──────────────
create table if not exists platform_settings (
  id                 int primary key default 1,
  default_fee_pct    numeric(5,2) not null default 15.00 check (default_fee_pct >= 0 and default_fee_pct <= 100),
  updated_by         uuid references accounts(id) on delete set null,
  updated_at         timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into platform_settings (id, default_fee_pct) values (1, 15.00)
  on conflict (id) do nothing;

-- ── PER-COMPANY OVERRIDE (null = use site-wide default) ─────────────────────
alter table business_profiles
  add column if not exists fee_pct_override numeric(5,2) check (fee_pct_override >= 0 and fee_pct_override <= 100);

-- ── RESOLVER: the fee that applies to a given business right now ────────────
-- Per-company override wins; otherwise the site-wide default.
create or replace function public.resolve_fee_pct(p_business_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(
    (select fee_pct_override from business_profiles where id = p_business_id),
    (select default_fee_pct from platform_settings where id = 1),
    15.00
  );
$$;

-- ── RLS: only platform owner may change site-wide settings ──────────────────
alter table platform_settings enable row level security;
create policy settings_read on platform_settings for select using (public.is_platform_staff());
create policy settings_owner_write on platform_settings for all
  using (public.is_platform_owner()) with check (public.is_platform_owner());

-- NOTE: business_profiles.fee_pct_override is written only by platform staff via
-- a server action (service role); the existing column-guard trigger should be
-- extended so a business cannot set its own override. See 0016 hardening pattern.


-- ===== 0032_concierge_matching.sql =====
-- =============================================================================
-- SEKONDMENT — 0032  CONCIERGE MATCHING (cold-start solver)
-- During early/low-liquidity periods, a business can request "find me experts"
-- and the platform team (founder-led at first) sources + surfaces candidates,
-- guaranteeing a response. Removes the empty-marketplace fear.
-- Additive. No money path. Safe.
-- =============================================================================

create table if not exists concierge_requests (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references business_profiles(id) on delete cascade,
  opportunity_id  uuid references opportunities(id) on delete set null,
  brief           text not null,                 -- what they need (plain language)
  status          text not null default 'open',  -- open | sourcing | candidates_sent | closed
  target_response_by timestamptz,                -- the guarantee (e.g. now + 24h)
  handled_by      uuid references accounts(id) on delete set null,  -- which staff member
  candidate_notes text,                          -- staff notes on who was sourced
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_concierge_status on concierge_requests(status, created_at desc);

alter table concierge_requests enable row level security;

-- A business can see + create its own requests.
create policy concierge_own_read on concierge_requests for select
  using (business_id in (select id from business_profiles where account_id = auth.uid()));
create policy concierge_own_insert on concierge_requests for insert
  with check (business_id in (select id from business_profiles where account_id = auth.uid()));

-- Platform staff can see + manage all (uses helper from the Ops Centre migration).
create policy concierge_staff_all on concierge_requests for all
  using (public.is_platform_staff()) with check (public.is_platform_staff());

