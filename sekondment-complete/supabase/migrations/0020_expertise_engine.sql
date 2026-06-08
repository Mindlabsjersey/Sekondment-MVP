-- =============================================================================
-- SEKONDMENT — 0020  EXPERTISE INTELLIGENCE ENGINE (schema)
-- The moat: structured expertise so the marketplace is searchable by capability,
-- not just job titles. Taxonomy + aliases + relationships + per-profile expertise
-- + evidence + per-opportunity requirements + match recommendations.
-- Seed data lives in 0021 (kept separate so the schema commits cleanly first).
-- =============================================================================

create type expertise_type as enum (
  'role', 'skill', 'tool', 'expertise', 'industry',
  'certification', 'project_type', 'deliverable', 'outcome', 'proof_type'
);
create type expertise_relationship_type as enum (
  'requires', 'related_to', 'commonly_used_with', 'belongs_to', 'evidence_for',
  'industry_relevant', 'certification_for', 'alternative_to', 'prerequisite_for'
);
create type expertise_verification_level as enum ('declared', 'verified', 'proven');
create type expertise_evidence_type as enum (
  'certification', 'portfolio', 'employer_confirmation', 'completed_engagement',
  'review', 'case_study', 'reference', 'work_sample', 'licence',
  'cv_extraction', 'linkedin_extraction'
);
create type expertise_importance as enum ('required', 'preferred', 'optional');

-- ── TAXONOMY (the controlled vocabulary) ────────────────────────────────────
create table expertise_taxonomy (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text not null unique,
  type                   expertise_type not null,
  parent_id              uuid references expertise_taxonomy(id) on delete set null,
  description            text,
  commercial_value_score int not null default 50,   -- 0-100, how valuable/billable
  ai_resistance_score    int not null default 50,   -- 0-100, how hard for AI to replace
  difficulty_level       int not null default 3,     -- 1-5
  demand_weight          int not null default 50,   -- 0-100, market demand
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_taxonomy_type on expertise_taxonomy(type, is_active);
create index idx_taxonomy_parent on expertise_taxonomy(parent_id);

-- ── ALIASES (smarter search: "M365" -> Microsoft 365 Migration) ─────────────
create table expertise_aliases (
  id           uuid primary key default gen_random_uuid(),
  expertise_id uuid not null references expertise_taxonomy(id) on delete cascade,
  alias        text not null,
  created_at   timestamptz not null default now()
);
create index idx_aliases_expertise on expertise_aliases(expertise_id);
create index idx_aliases_alias on expertise_aliases(lower(alias));

-- ── RELATIONSHIPS (connect related concepts) ────────────────────────────────
create table expertise_relationships (
  id                uuid primary key default gen_random_uuid(),
  from_expertise_id uuid not null references expertise_taxonomy(id) on delete cascade,
  to_expertise_id   uuid not null references expertise_taxonomy(id) on delete cascade,
  relationship_type expertise_relationship_type not null,
  weight            int not null default 50,
  created_at        timestamptz not null default now(),
  unique (from_expertise_id, to_expertise_id, relationship_type)
);
create index idx_rel_from on expertise_relationships(from_expertise_id);

-- ── PROFILE EXPERTISE (experts/resources <-> expertise) ─────────────────────
create table profile_expertise (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null,                 -- expert_profiles.id or capacity resource
  profile_type       text not null default 'expert',-- 'expert' | 'resource'
  expertise_id       uuid not null references expertise_taxonomy(id) on delete cascade,
  declared_level     int not null default 3,         -- 1-5 self-declared
  verification_level expertise_verification_level not null default 'declared',
  years_experience   numeric(4,1),
  project_count      int not null default 0,
  last_used_at       date,
  confidence_score   int not null default 50,
  evidence_summary   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (profile_id, profile_type, expertise_id)
);
create index idx_profexp_profile on profile_expertise(profile_id, profile_type);
create index idx_profexp_expertise on profile_expertise(expertise_id);
create index idx_profexp_verif on profile_expertise(verification_level);

-- ── EVIDENCE (proof attached to a profile's expertise) ──────────────────────
create table expertise_evidence (
  id                  uuid primary key default gen_random_uuid(),
  profile_expertise_id uuid not null references profile_expertise(id) on delete cascade,
  evidence_type       expertise_evidence_type not null,
  reference_id        uuid,                          -- e.g. engagement_id / review_id / doc_id
  description         text,
  url                 text,
  verified            boolean not null default false,
  created_at          timestamptz not null default now()
);
create index idx_evidence_profexp on expertise_evidence(profile_expertise_id);

-- ── PROJECT REQUIREMENTS (opportunity <-> required expertise) ───────────────
create table project_expertise_requirements (
  id                       uuid primary key default gen_random_uuid(),
  opportunity_id           uuid not null references opportunities(id) on delete cascade,
  expertise_id             uuid not null references expertise_taxonomy(id) on delete cascade,
  importance               expertise_importance not null default 'required',
  required_level           int not null default 3,
  required_verification_level expertise_verification_level not null default 'declared',
  created_at               timestamptz not null default now(),
  unique (opportunity_id, expertise_id)
);
create index idx_projreq_opp on project_expertise_requirements(opportunity_id);
create index idx_projreq_expertise on project_expertise_requirements(expertise_id);

-- ── MATCH RECOMMENDATIONS (cached rule-based scores) ────────────────────────
create table match_recommendations (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  profile_id     uuid not null,
  profile_type   text not null default 'expert',
  score          int not null default 0,            -- 0-100 match %
  reasons        jsonb,                              -- [{factor, detail, weight}]
  missing        jsonb,                              -- unmet requirements
  created_at     timestamptz not null default now(),
  unique (opportunity_id, profile_id, profile_type)
);
create index idx_match_opp on match_recommendations(opportunity_id, score desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table expertise_taxonomy      enable row level security;
alter table expertise_aliases       enable row level security;
alter table expertise_relationships enable row level security;
alter table profile_expertise       enable row level security;
alter table expertise_evidence      enable row level security;
alter table project_expertise_requirements enable row level security;
alter table match_recommendations   enable row level security;

-- Taxonomy/aliases/relationships are reference data: world-readable, service-write.
create policy taxonomy_read on expertise_taxonomy for select using (true);
create policy aliases_read  on expertise_aliases for select using (true);
create policy rel_read      on expertise_relationships for select using (true);

-- Profile expertise: world-readable (discovery depends on it); owner writes own.
create policy profexp_read on profile_expertise for select using (true);
create policy profexp_write on profile_expertise for all using (
  exists (select 1 from expert_profiles e where e.id = profile_id and e.account_id = auth.uid())
) with check (
  exists (select 1 from expert_profiles e where e.id = profile_id and e.account_id = auth.uid())
);

-- Evidence: readable with the profile expertise; owner writes via their profile.
create policy evidence_read on expertise_evidence for select using (true);
create policy evidence_write on expertise_evidence for all using (
  exists (
    select 1 from profile_expertise pe
    join expert_profiles e on e.id = pe.profile_id
    where pe.id = profile_expertise_id and e.account_id = auth.uid()
  )
) with check (
  exists (
    select 1 from profile_expertise pe
    join expert_profiles e on e.id = pe.profile_id
    where pe.id = profile_expertise_id and e.account_id = auth.uid()
  )
);

-- Project requirements: readable by all; the owning business writes them.
create policy projreq_read on project_expertise_requirements for select using (true);
create policy projreq_write on project_expertise_requirements for all using (
  exists (
    select 1 from opportunities o join business_profiles b on b.id = o.business_id
    where o.id = opportunity_id and b.account_id = auth.uid()
  )
) with check (
  exists (
    select 1 from opportunities o join business_profiles b on b.id = o.business_id
    where o.id = opportunity_id and b.account_id = auth.uid()
  )
);

-- Match recommendations: the business that owns the opportunity reads; service writes.
create policy match_read on match_recommendations for select using (
  exists (
    select 1 from opportunities o join business_profiles b on b.id = o.business_id
    where o.id = opportunity_id and b.account_id = auth.uid()
  ) or public.is_admin()
);
