-- AUTO-GENERATED apply bundle: migrations 16-22 (run this whole file once in Supabase SQL Editor)

-- ===================== 0016_security_hardening.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0015  SECURITY HARDENING (column-level write guards)
-- RLS policies grant row access but cannot restrict *which columns* a user
-- changes. The profile write policies let owners edit their whole row â€” which
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

-- â”€â”€ EXPERT PROFILES: protect trust_score + verification flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ BUSINESS PROFILES: protect trust_score + verification flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ ACCOUNTS: protect account_type + stripe fields from self-edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ PROPOSALS: lock price once submitted â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ LEDGER ENTRIES: append-only. No updates or deletes by anyone but service â”€
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


-- ===================== 0017_account_moderation.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0017  ACCOUNT MODERATION
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


-- ===================== 0018_global_fields.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0018  GLOBAL READINESS FIELDS
-- Location, timezone and work-mode availability so users worldwide can sign up
-- and be matched. Builds on 0013 (country, preferred_currency, jurisdiction).
-- Nothing Jersey-specific; all fields optional with sensible defaults.
-- =============================================================================

-- â”€â”€ ACCOUNTS: where the user is and how they like to work â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table accounts
  add column region            text,
  add column city              text,
  add column timezone          text,            -- IANA, e.g. 'Europe/London'
  add column open_to_international boolean not null default true;

-- â”€â”€ EXPERT PROFILES: work-mode availability + reach â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table expert_profiles
  add column remote_available  boolean not null default true,
  add column onsite_available  boolean not null default false,
  add column hybrid_available  boolean not null default false,
  add column travel_available  boolean not null default false,
  add column countries_served  text[] not null default '{}',
  add column based_country      text,
  add column based_city         text,
  add column timezone           text;

-- â”€â”€ OPPORTUNITIES: location/jurisdiction context for matching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ===================== 0019_contracts_compliance.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0019  CONTRACTS, VERIFICATION & COMPLIANCE FOUNDATIONS
-- Versioned engagement terms, reusable contract templates, formal verification
-- evidence, and permanent audit trails. Careful legal language: Sekondment
-- FACILITATES engagements with milestone funding and payment protection; it is
-- NOT a regulated escrow, NOT the employer, and does NOT own the work.
-- =============================================================================

-- â”€â”€ ENGAGEMENT TERMS (versioned, never overwritten) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ CONTRACT TEMPLATES (reusable standard documents) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table contract_templates (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  body        text not null,
  version     text not null default '2026-06-01',
  is_current  boolean not null default true,
  created_at  timestamptz not null default now()
);

-- â”€â”€ VERIFICATION DOCUMENTS (formal evidence) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ COMPLIANCE EVENTS (permanent audit trail) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ EMPLOYER â†” EMPLOYEE EVENTS (consent/approval audit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ STORAGE: private bucket for verification evidence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

-- Path is <account_id>/<file>. Owner reads/writes own; admins read all.
create policy "verif docs: owner read" on storage.objects for select
  using (bucket_id = 'verification-docs'
         and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin()));
create policy "verif docs: owner insert" on storage.objects for insert
  with check (bucket_id = 'verification-docs' and split_part(name, '/', 1) = auth.uid()::text);

-- â”€â”€ SEED CONTRACT TEMPLATES (careful, defensible language) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ===================== 0020_expertise_engine.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0020  EXPERTISE INTELLIGENCE ENGINE (schema)
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

-- â”€â”€ TAXONOMY (the controlled vocabulary) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ ALIASES (smarter search: "M365" -> Microsoft 365 Migration) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table expertise_aliases (
  id           uuid primary key default gen_random_uuid(),
  expertise_id uuid not null references expertise_taxonomy(id) on delete cascade,
  alias        text not null,
  created_at   timestamptz not null default now()
);
create index idx_aliases_expertise on expertise_aliases(expertise_id);
create index idx_aliases_alias on expertise_aliases(lower(alias));

-- â”€â”€ RELATIONSHIPS (connect related concepts) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ PROFILE EXPERTISE (experts/resources <-> expertise) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ EVIDENCE (proof attached to a profile's expertise) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ PROJECT REQUIREMENTS (opportunity <-> required expertise) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ MATCH RECOMMENDATIONS (cached rule-based scores) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ===================== 0021_expertise_seed.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0021  EXPERTISE TAXONOMY SEED
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


-- ===================== 0022_capacity_marketplace.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0022  WORKFORCE CAPACITY MARKETPLACE
-- Lets Employer Partners list CAPACITY (hours/days of a resource), not just
-- people. Businesses can find expertise + availability. Bookings draw down
-- capacity; utilisation events track usage. The Company Resource model stays
-- the differentiator: payment routes to employer, optional bonus split.
-- =============================================================================

create type capacity_visibility as enum ('public', 'private');
create type capacity_approval as enum ('pending', 'approved', 'suspended');
create type capacity_booking_status as enum ('requested', 'confirmed', 'declined', 'completed', 'cancelled');

-- â”€â”€ CAPACITY PROFILES (a listable resource + its commercial terms) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ CAPACITY TAGS (link a capacity profile to structured expertise) â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table capacity_tags (
  id           uuid primary key default gen_random_uuid(),
  capacity_id  uuid not null references capacity_profiles(id) on delete cascade,
  expertise_id uuid not null references expertise_taxonomy(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (capacity_id, expertise_id)
);
create index idx_captags_capacity on capacity_tags(capacity_id);
create index idx_captags_expertise on capacity_tags(expertise_id);

-- â”€â”€ CAPACITY AVAILABILITY (concrete windows, optional finer grain) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ CAPACITY BOOKINGS (a business reserves capacity) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ CAPACITY UTILISATION EVENTS (audit + analytics) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


