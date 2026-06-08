-- =============================================================================
-- SEKONDMENT — 0023  EXPERTISE GRAPH EXPANSION (Prompt 5)
-- Deepens the expertise graph for the long-term moat: adds jurisdiction +
-- service_category as first-class taxonomy types, richer profile_expertise proof
-- dimensions, an expertise demand/analytics table future AI can consume, and a
-- view for marketplace intelligence. No AI here — structured data only.
-- =============================================================================

-- ── New taxonomy types (jurisdiction, service_category, platform) ───────────
-- The expertise_type enum already has role/skill/tool/expertise/industry/
-- certification/project_type/deliverable/outcome/proof_type. Add the rest.
alter type expertise_type add value if not exists 'jurisdiction';
alter type expertise_type add value if not exists 'service_category';
alter type expertise_type add value if not exists 'platform';
