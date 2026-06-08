-- =============================================================================
-- SEKONDMENT — 0012  SECURE FILES + ENGAGEMENT BOARDS
-- (a) Storage bucket policies so files live inside the same RLS perimeter as
--     the data — encrypted at rest, access-controlled, never in email.
-- (b) A lightweight Trello-style board per engagement (columns + cards) so work
--     can be organised and tracked in-app.
-- =============================================================================

-- ── (a) STORAGE ─────────────────────────────────────────────────────────────
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

-- ── (b) BOARDS ──────────────────────────────────────────────────────────────
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

-- ── RLS: only the engagement's parties (and admins) touch its board ─────────
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
