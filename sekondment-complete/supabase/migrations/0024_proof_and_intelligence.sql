-- =============================================================================
-- SEKONDMENT — 0024  PROOF DIMENSIONS + MARKETPLACE INTELLIGENCE (Prompt 5)
-- Runs AFTER 0023 (which adds enum values in its own transaction).
-- =============================================================================

-- ── Richer CV-intelligence dimensions on profile_expertise ──────────────────
alter table profile_expertise
  add column if not exists seniority          text,        -- junior|mid|senior|lead|exec
  add column if not exists team_size_managed  int,
  add column if not exists revenue_responsibility text,
  add column if not exists completed_engagements int not null default 0,
  add column if not exists average_rating      numeric(3,2);

-- ── Account-level CV-derived attributes (languages, jurisdictions worked in) ─
alter table expert_profiles
  add column if not exists languages           text[] not null default '{}',
  add column if not exists jurisdictions_worked text[] not null default '{}',
  add column if not exists seniority           text,
  add column if not exists revenue_responsibility text;

-- ── EXPERTISE DEMAND / ANALYTICS (Phase 6 + Phase 8: AI-consumable) ─────────
-- One row per expertise; updated as the marketplace runs. Future AI reads this
-- directly — no schema change needed to add pricing/forecasting models later.
create table expertise_demand_stats (
  expertise_id        uuid primary key references expertise_taxonomy(id) on delete cascade,
  times_requested     int not null default 0,     -- # opportunities requiring it
  times_matched       int not null default 0,     -- # match recommendations generated
  active_experts      int not null default 0,     -- # profiles declaring it
  proven_experts      int not null default 0,     -- # profiles with proven level
  completed_engagements int not null default 0,
  avg_project_value   numeric(12,2),
  avg_rating          numeric(3,2),
  last_requested_at   timestamptz,
  updated_at          timestamptz not null default now()
);

alter table expertise_demand_stats enable row level security;
-- Admin reads full stats; everyone can read the non-sensitive demand signal.
create policy demand_read on expertise_demand_stats for select using (true);

-- Helper column referenced by the intelligence view (add BEFORE the view).
alter table expertise_taxonomy add column if not exists industry_relevance_note text;

-- ── Marketplace intelligence VIEW (Phase 6) ─────────────────────────────────
-- Joins demand stats with taxonomy weighting so admin analytics + future AI can
-- answer "most requested / fastest growing / highest value" without bespoke queries.
create or replace view expertise_intelligence as
select
  t.id, t.name, t.slug, t.type, t.industry_relevance_note,
  t.commercial_value_score, t.ai_resistance_score, t.demand_weight,
  coalesce(d.times_requested, 0)       as times_requested,
  coalesce(d.times_matched, 0)         as times_matched,
  coalesce(d.active_experts, 0)        as active_experts,
  coalesce(d.proven_experts, 0)        as proven_experts,
  coalesce(d.completed_engagements, 0) as completed_engagements,
  d.avg_project_value,
  d.avg_rating,
  d.last_requested_at
from expertise_taxonomy t
left join expertise_demand_stats d on d.expertise_id = t.id
where t.is_active = true;

-- ── Recompute helper: refresh demand stats for one expertise ────────────────
create or replace function public.refresh_expertise_demand(exp_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into expertise_demand_stats (expertise_id, times_requested, times_matched,
    active_experts, proven_experts, updated_at)
  values (
    exp_id,
    (select count(*) from project_expertise_requirements where expertise_id = exp_id),
    (select count(*) from match_recommendations m
       join project_expertise_requirements r on r.opportunity_id = m.opportunity_id
       where r.expertise_id = exp_id),
    (select count(*) from profile_expertise where expertise_id = exp_id),
    (select count(*) from profile_expertise where expertise_id = exp_id and verification_level = 'proven'),
    now()
  )
  on conflict (expertise_id) do update set
    times_requested = excluded.times_requested,
    times_matched = excluded.times_matched,
    active_experts = excluded.active_experts,
    proven_experts = excluded.proven_experts,
    updated_at = now();
end;
$$;
