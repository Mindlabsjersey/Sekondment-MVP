-- AUTO-GENERATED apply bundle: migrations 6-14 (run this whole file once in Supabase SQL Editor)

-- ===================== 0006_partners_rates_proposals.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0005  EMPLOYER PARTNERS Â· RATE TYPES Â· PROPOSALS
-- Additive migration. Reflects the agreed decisions:
--   1. Employer Partner becomes a first-class account type with per-employee
--      approval before deployment.
--   2. Engagements/opportunities gain a rate_type (fixed/hourly/daily/retainer).
--   3. A real proposals table (price + timeline + cover message) supersedes the
--      lightweight opportunity_interest record for the negotiation flow.
-- Existing migrations 0001â€“0004 are untouched.
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

-- New rate model + proposal enums (brand-new types â€” safe to create and use here).
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
-- EMPLOYER â†” EMPLOYEE LINK  (the approval workflow)
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


-- ===================== 0007_rls_partners_proposals.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0007  RLS FOR NEW TABLES
-- employer_partners Â· employer_employees Â· proposals
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
-- EMPLOYER PARTNERS â€” public read (discovery of deploying companies), owner write
-- -----------------------------------------------------------------------------
create policy employer_read on employer_partners for select using (true);
create policy employer_write on employer_partners for all
  using (account_id = auth.uid()) with check (account_id = auth.uid());

-- -----------------------------------------------------------------------------
-- EMPLOYER â†” EMPLOYEE â€” the employer manages the link; the employee can see
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
-- PROPOSALS â€” the expert who made it + the business that owns the opportunity
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


-- ===================== 0008_realtime_messages.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0008  ENABLE REALTIME ON MESSAGES
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


-- ===================== 0009_opportunity_visibility.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0009  OPPORTUNITY VISIBILITY (public / private)
-- Businesses (and employer partners posting work) can mark an opportunity as
-- public (discoverable by anyone, incl. logged-out browse) or private
-- (hidden from discovery; visible only to the owner, admins, and experts the
-- business has directly invited via opportunity_interest).
-- =============================================================================

create type opportunity_visibility as enum ('public', 'private');

alter table opportunities
  add column visibility opportunity_visibility not null default 'public';

create index idx_opportunities_visibility on opportunities(visibility);

-- â”€â”€ Replace the read policy to honour visibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Old policy: any non-draft opportunity was readable by everyone.
-- New policy: a non-draft opportunity is readable when EITHER
--   â€¢ it is public, OR
--   â€¢ the caller owns it, OR
--   â€¢ the caller is an admin, OR
--   â€¢ the caller is an expert the business invited (row in opportunity_interest
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


-- ===================== 0010_expert_visibility.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0010  EXPERT PROFILE VISIBILITY
-- Experts (incl. company resources and freelancers) can choose whether their
-- profile is publicly listed/discoverable or unlisted (private). Unlisted
-- profiles don't appear in browse/search, but remain reachable by direct link
-- and by businesses they're already engaged with â€” useful for resources a
-- company doesn't want publicly poached, or freelancers who want invite-only.
-- =============================================================================

create type profile_visibility as enum ('listed', 'unlisted');

alter table expert_profiles
  add column visibility profile_visibility not null default 'listed';

create index idx_expert_profiles_visibility on expert_profiles(visibility);

-- â”€â”€ Read policy honouring visibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ===================== 0011_notifications.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0011  IN-APP NOTIFICATIONS
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


-- ===================== 0012_files_and_boards.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0012  SECURE FILES + ENGAGEMENT BOARDS
-- (a) Storage bucket policies so files live inside the same RLS perimeter as
--     the data â€” encrypted at rest, access-controlled, never in email.
-- (b) A lightweight Trello-style board per engagement (columns + cards) so work
--     can be organised and tracked in-app.
-- =============================================================================

-- â”€â”€ (a) STORAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ (b) BOARDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ RLS: only the engagement's parties (and admins) touch its board â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ===================== 0013_global_currency_country.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0013  GLOBAL READINESS: CURRENCY + COUNTRY
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


-- ===================== 0014_terms_agreements.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0014  TERMS, AGREEMENTS & ACCEPTANCE
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

-- (b) Acceptance records â€” who accepted which document version, when.
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

-- â”€â”€ RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table legal_documents      enable row level security;
alter table document_acceptances enable row level security;

-- Legal docs are world-readable (needed before login to show terms at sign-up).
create policy legal_docs_read on legal_documents for select using (true);

-- Acceptances: a user sees and creates only their own. No updates/deletes.
create policy doc_accept_read on document_acceptances for select
  using (account_id = auth.uid());
create policy doc_accept_insert on document_acceptances for insert
  with check (account_id = auth.uid());

-- â”€â”€ Seed current global documents (plain, sensible defaults; replace later) â”€â”€
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


