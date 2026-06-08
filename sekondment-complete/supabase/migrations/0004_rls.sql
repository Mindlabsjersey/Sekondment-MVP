-- =============================================================================
-- SEKONDMENT — 0004 ROW LEVEL SECURITY
-- Multi-tenant isolation. Helpers resolve the caller's profile ids; policies
-- restrict reads/writes to data the caller participates in.
-- =============================================================================

-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts where id = auth.uid() and account_type = 'admin');
$$;

-- Helper: business_profile id for current user (null if not a business)
create or replace function my_business_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from business_profiles where account_id = auth.uid();
$$;

-- Helper: expert_profile id for current user (null if not an expert)
create or replace function my_expert_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from expert_profiles where account_id = auth.uid();
$$;

-- =============================================================================
-- ENABLE RLS
-- =============================================================================
alter table accounts            enable row level security;
alter table business_profiles   enable row level security;
alter table expert_profiles     enable row level security;
alter table expert_availability enable row level security;
alter table trust_score_factors enable row level security;
alter table opportunities       enable row level security;
alter table opportunity_interest enable row level security;
alter table saved_experts       enable row level security;
alter table saved_opportunities enable row level security;
alter table engagements         enable row level security;
alter table conversations       enable row level security;
alter table messages            enable row level security;
alter table milestones          enable row level security;
alter table deliverables        enable row level security;
alter table ledger_entries      enable row level security;
alter table disputes            enable row level security;
alter table reviews             enable row level security;
alter table activity_events     enable row level security;

-- =============================================================================
-- ACCOUNTS — own row only (admins see all)
-- =============================================================================
create policy accounts_self on accounts
  for select using (id = auth.uid() or is_admin());
create policy accounts_update_self on accounts
  for update using (id = auth.uid());

-- =============================================================================
-- PROFILES — public read (discovery), owner write
-- Profiles are intentionally readable: the whole marketplace depends on
-- browsing experts and businesses. Sensitive money data lives elsewhere.
-- =============================================================================
create policy biz_read   on business_profiles for select using (true);
create policy biz_write  on business_profiles for all
  using (account_id = auth.uid()) with check (account_id = auth.uid());

create policy expert_read  on expert_profiles for select using (true);
create policy expert_write on expert_profiles for all
  using (account_id = auth.uid()
         -- a business may manage expert profiles it employs (Company Resource)
         or employing_business_id = my_business_id())
  with check (account_id = auth.uid()
         or employing_business_id = my_business_id());

create policy avail_read  on expert_availability for select using (true);
create policy avail_write on expert_availability for all
  using (expert_id = my_expert_id()) with check (expert_id = my_expert_id());

create policy trust_read on trust_score_factors for select using (true);
-- trust factors are written only by service role (server), never by clients.

-- =============================================================================
-- OPPORTUNITIES — open ones public; drafts owner-only
-- =============================================================================
create policy opp_read on opportunities for select
  using (status <> 'draft' or business_id = my_business_id() or is_admin());
create policy opp_write on opportunities for all
  using (business_id = my_business_id()) with check (business_id = my_business_id());

-- =============================================================================
-- INTEREST — expert who expressed it + business who owns the opportunity
-- =============================================================================
create policy interest_read on opportunity_interest for select using (
  expert_id = my_expert_id()
  or exists (select 1 from opportunities o where o.id = opportunity_id and o.business_id = my_business_id())
  or is_admin()
);
create policy interest_expert_write on opportunity_interest for all
  using (expert_id = my_expert_id()) with check (expert_id = my_expert_id());

-- =============================================================================
-- FAVOURITES — owner only
-- =============================================================================
create policy saved_experts_owner on saved_experts for all
  using (business_id = my_business_id()) with check (business_id = my_business_id());
create policy saved_opps_owner on saved_opportunities for all
  using (expert_id = my_expert_id()) with check (expert_id = my_expert_id());

-- =============================================================================
-- ENGAGEMENTS — the two parties + admin
-- =============================================================================
create policy eng_read on engagements for select using (
  business_id = my_business_id() or expert_id = my_expert_id() or is_admin()
);
-- writes happen via server (service role) to keep money state authoritative.

-- =============================================================================
-- MESSAGING — conversation participants only
-- =============================================================================
create policy conv_read on conversations for select using (
  business_id = my_business_id() or expert_id = my_expert_id() or is_admin()
);
create policy conv_write on conversations for insert with check (
  business_id = my_business_id() or expert_id = my_expert_id()
);

create policy msg_read on messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id
          and (c.business_id = my_business_id() or c.expert_id = my_expert_id()))
  or is_admin()
);
create policy msg_write on messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from conversations c where c.id = conversation_id
              and (c.business_id = my_business_id() or c.expert_id = my_expert_id()))
);

-- =============================================================================
-- MILESTONES / DELIVERABLES / LEDGER / ACTIVITY — engagement participants read
-- =============================================================================
create policy ms_read on milestones for select using (
  exists (select 1 from engagements e where e.id = engagement_id
          and (e.business_id = my_business_id() or e.expert_id = my_expert_id())) or is_admin()
);
create policy deliv_read on deliverables for select using (
  exists (select 1 from milestones m join engagements e on e.id = m.engagement_id
          where m.id = milestone_id
          and (e.business_id = my_business_id() or e.expert_id = my_expert_id())) or is_admin()
);
create policy ledger_read on ledger_entries for select using (
  exists (select 1 from engagements e where e.id = engagement_id
          and (e.business_id = my_business_id() or e.expert_id = my_expert_id())) or is_admin()
);
create policy activity_read on activity_events for select using (
  exists (select 1 from engagements e where e.id = engagement_id
          and (e.business_id = my_business_id() or e.expert_id = my_expert_id())) or is_admin()
);

-- =============================================================================
-- DISPUTES — participants + admin (admin resolves)
-- =============================================================================
create policy dispute_read on disputes for select using (
  exists (select 1 from engagements e where e.id = engagement_id
          and (e.business_id = my_business_id() or e.expert_id = my_expert_id())) or is_admin()
);
create policy dispute_raise on disputes for insert with check (
  raised_by = auth.uid()
  and exists (select 1 from engagements e where e.id = engagement_id
              and (e.business_id = my_business_id() or e.expert_id = my_expert_id()))
);

-- =============================================================================
-- REVIEWS — public read (they drive trust), reviewer writes once
-- =============================================================================
create policy reviews_read on reviews for select using (true);
create policy reviews_write on reviews for insert with check (reviewer_id = auth.uid());
