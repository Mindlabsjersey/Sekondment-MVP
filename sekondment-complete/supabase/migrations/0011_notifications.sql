-- =============================================================================
-- SEKONDMENT — 0011  IN-APP NOTIFICATIONS
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
