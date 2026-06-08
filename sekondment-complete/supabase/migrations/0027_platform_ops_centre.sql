-- =============================================================================
-- SEKONDMENT — 0027  PLATFORM OPERATIONS CENTRE — tables (runs AFTER 0026)
-- Internal team membership, internal notes, audit logs, and CRM pipeline.
-- The Ops Centre is the owner/internal-team command system — separate from and
-- more powerful than the marketplace admin pages.
-- =============================================================================

-- ── INTERNAL TEAM (who can access the Ops Centre, and as what role) ─────────
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

-- ── INTERNAL NOTES (attach to any key record) ──────────────────────────────
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

-- ── AUDIT LOGS (every sensitive internal action) ────────────────────────────
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

-- ── INTERNAL CRM PIPELINE (founder-led sales / partnerships) ────────────────
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

-- ── INTERNAL TEAM TASKS (workload tracking) ─────────────────────────────────
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

-- ── RLS — Ops Centre data is internal-staff-only ────────────────────────────
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
