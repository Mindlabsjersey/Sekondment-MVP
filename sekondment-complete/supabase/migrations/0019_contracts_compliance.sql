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
