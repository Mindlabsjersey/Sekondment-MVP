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
