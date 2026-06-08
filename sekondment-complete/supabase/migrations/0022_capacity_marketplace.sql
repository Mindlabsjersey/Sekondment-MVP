-- =============================================================================
-- SEKONDMENT — 0022  WORKFORCE CAPACITY MARKETPLACE
-- Lets Employer Partners list CAPACITY (hours/days of a resource), not just
-- people. Businesses can find expertise + availability. Bookings draw down
-- capacity; utilisation events track usage. The Company Resource model stays
-- the differentiator: payment routes to employer, optional bonus split.
-- =============================================================================

create type capacity_visibility as enum ('public', 'private');
create type capacity_approval as enum ('pending', 'approved', 'suspended');
create type capacity_booking_status as enum ('requested', 'confirmed', 'declined', 'completed', 'cancelled');

-- ── CAPACITY PROFILES (a listable resource + its commercial terms) ──────────
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

-- ── CAPACITY TAGS (link a capacity profile to structured expertise) ─────────
create table capacity_tags (
  id           uuid primary key default gen_random_uuid(),
  capacity_id  uuid not null references capacity_profiles(id) on delete cascade,
  expertise_id uuid not null references expertise_taxonomy(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (capacity_id, expertise_id)
);
create index idx_captags_capacity on capacity_tags(capacity_id);
create index idx_captags_expertise on capacity_tags(expertise_id);

-- ── CAPACITY AVAILABILITY (concrete windows, optional finer grain) ──────────
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

-- ── CAPACITY BOOKINGS (a business reserves capacity) ────────────────────────
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

-- ── CAPACITY UTILISATION EVENTS (audit + analytics) ─────────────────────────
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

-- ── RLS ─────────────────────────────────────────────────────────────────────
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
