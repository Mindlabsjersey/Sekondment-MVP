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
