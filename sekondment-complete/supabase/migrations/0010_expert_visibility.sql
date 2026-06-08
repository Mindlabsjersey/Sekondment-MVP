-- =============================================================================
-- SEKONDMENT — 0010  EXPERT PROFILE VISIBILITY
-- Experts (incl. company resources and freelancers) can choose whether their
-- profile is publicly listed/discoverable or unlisted (private). Unlisted
-- profiles don't appear in browse/search, but remain reachable by direct link
-- and by businesses they're already engaged with — useful for resources a
-- company doesn't want publicly poached, or freelancers who want invite-only.
-- =============================================================================

create type profile_visibility as enum ('listed', 'unlisted');

alter table expert_profiles
  add column visibility profile_visibility not null default 'listed';

create index idx_expert_profiles_visibility on expert_profiles(visibility);

-- ── Read policy honouring visibility ────────────────────────────────────────
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
