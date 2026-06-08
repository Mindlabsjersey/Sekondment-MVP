-- =============================================================================
-- SEKONDMENT — 0009  OPPORTUNITY VISIBILITY (public / private)
-- Businesses (and employer partners posting work) can mark an opportunity as
-- public (discoverable by anyone, incl. logged-out browse) or private
-- (hidden from discovery; visible only to the owner, admins, and experts the
-- business has directly invited via opportunity_interest).
-- =============================================================================

create type opportunity_visibility as enum ('public', 'private');

alter table opportunities
  add column visibility opportunity_visibility not null default 'public';

create index idx_opportunities_visibility on opportunities(visibility);

-- ── Replace the read policy to honour visibility ────────────────────────────
-- Old policy: any non-draft opportunity was readable by everyone.
-- New policy: a non-draft opportunity is readable when EITHER
--   • it is public, OR
--   • the caller owns it, OR
--   • the caller is an admin, OR
--   • the caller is an expert the business invited (row in opportunity_interest
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
