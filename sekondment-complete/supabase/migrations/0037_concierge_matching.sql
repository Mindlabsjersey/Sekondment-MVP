-- =============================================================================
-- SEKONDMENT — 0037  CONCIERGE MATCHING (cold-start solver)
-- During early/low-liquidity periods, a business can request "find me experts"
-- and the platform team (founder-led at first) sources + surfaces candidates,
-- guaranteeing a response. Removes the empty-marketplace fear.
-- Additive. No money path. Safe.
-- =============================================================================

create table if not exists concierge_requests (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references business_profiles(id) on delete cascade,
  opportunity_id  uuid references opportunities(id) on delete set null,
  brief           text not null,                 -- what they need (plain language)
  status          text not null default 'open',  -- open | sourcing | candidates_sent | closed
  target_response_by timestamptz,                -- the guarantee (e.g. now + 24h)
  handled_by      uuid references accounts(id) on delete set null,  -- which staff member
  candidate_notes text,                          -- staff notes on who was sourced
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_concierge_status on concierge_requests(status, created_at desc);

alter table concierge_requests enable row level security;

-- A business can see + create its own requests.
create policy concierge_own_read on concierge_requests for select
  using (business_id in (select id from business_profiles where account_id = auth.uid()));
create policy concierge_own_insert on concierge_requests for insert
  with check (business_id in (select id from business_profiles where account_id = auth.uid()));

-- Platform staff can see + manage all (uses helper from the Ops Centre migration).
create policy concierge_staff_all on concierge_requests for all
  using (public.is_platform_staff()) with check (public.is_platform_staff());
