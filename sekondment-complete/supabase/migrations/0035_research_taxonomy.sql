-- =============================================================================
-- SEKONDMENT — 0035  RESEARCH TAXONOMY
-- Comprehensive research types, methodologies, and jurisdictional coverage
-- for matching businesses with the right research expertise.
-- =============================================================================

-- ── RESEARCH TYPES ─────────────────────────────────────────────────────────
insert into public.expertise_taxonomy (name, slug, type, is_active) values
  -- Primary Research
  ('Primary Research', 'primary_research', 'research_type', true),
  ('Qualitative Research', 'qualitative_research', 'research_type', true),
  ('Quantitative Research', 'quantitative_research', 'research_type', true),
  ('Mixed Methods Research', 'mixed_methods', 'research_type', true),
  ('Market Research', 'market_research', 'research_type', true),
  ('User Research', 'user_research', 'research_type', true),
  ('Clinical Research', 'clinical_research', 'research_type', true),
  ('Academic Research', 'academic_research', 'research_type', true),
  ('Policy Research', 'policy_research', 'research_type', true),
  ('Social Research', 'social_research', 'research_type', true),
  ('Economic Research', 'economic_research', 'research_type', true),
  ('Environmental Research', 'environmental_research', 'research_type', true),
  ('Technology Research', 'technology_research', 'research_type', true),
  ('Legal Research', 'legal_research', 'research_type', true),
  ('Competitive Intelligence', 'competitive_intelligence', 'research_type', true),
  ('Due Diligence', 'due_diligence', 'research_type', true),
  
  -- Data Analysis Specialisations
  ('Statistical Analysis', 'statistical_analysis', 'research_type', true),
  ('Data Science', 'data_science_research', 'research_type', true),
  ('Predictive Analytics', 'predictive_analytics', 'research_type', true),
  ('Machine Learning Research', 'ml_research', 'research_type', true),
  ('Text Analytics', 'text_analytics', 'research_type', true),
  ('Sentiment Analysis', 'sentiment_analysis', 'research_type', true),
  
  -- Sector-Specific Research
  ('Healthcare Research', 'healthcare_research', 'research_type', true),
  ('Financial Services Research', 'financial_research', 'research_type', true),
  ('Real Estate Research', 'real_estate_research', 'research_type', true),
  ('Energy Research', 'energy_research', 'research_type', true),
  ('Education Research', 'education_research', 'research_type', true),
  ('Public Sector Research', 'public_sector_research', 'research_type', true),
  ('Non-Profit Research', 'nonprofit_research', 'research_type', true),
  ('Sustainability Research', 'sustainability_research', 'research_type', true),
  ('ESG Research', 'esg_research', 'research_type', true),
  ('DEI Research', 'dei_research', 'research_type', true)

on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  is_active = excluded.is_active;

-- ── RESEARCH METHODOLOGIES ─────────────────────────────────────────────────
insert into public.expertise_taxonomy (name, slug, type, is_active) values
  -- Traditional Methods
  ('Surveys', 'surveys', 'methodology', true),
  ('Interviews', 'interviews', 'methodology', true),
  ('Focus Groups', 'focus_groups', 'methodology', true),
  ('Case Studies', 'case_studies', 'methodology', true),
  ('Ethnography', 'ethnography', 'methodology', true),
  ('Observational Research', 'observational_research', 'methodology', true),
  ('Literature Review', 'literature_review', 'methodology', true),
  ('Meta-Analysis', 'meta_analysis', 'methodology', true),
  ('Systematic Review', 'systematic_review', 'methodology', true),
  
  -- Modern/Technology-Enabled
  ('Online Surveys', 'online_surveys', 'methodology', true),
  ('Mobile Ethnography', 'mobile_ethnography', 'methodology', true),
  ('Social Media Listening', 'social_media_listening', 'methodology', true),
  ('Digital Analytics', 'digital_analytics', 'methodology', true),
  ('A/B Testing', 'ab_testing', 'methodology', true),
  ('Usability Testing', 'usability_testing', 'methodology', true),
  ('Eye Tracking', 'eye_tracking', 'methodology', true),
  ('Biometric Research', 'biometric_research', 'methodology', true),
  ('Neuroscience Methods', 'neuroscience_methods', 'methodology', true),
  
  -- Advanced Analytics
  ('Regression Analysis', 'regression_analysis', 'methodology', true),
  ('Conjoint Analysis', 'conjoint_analysis', 'methodology', true),
  ('Factor Analysis', 'factor_analysis', 'methodology', true),
  ('Cluster Analysis', 'cluster_analysis', 'methodology', true),
  ('Structural Equation Modelling', 'sem', 'methodology', true),
  ('Bayesian Analysis', 'bayesian_analysis', 'methodology', true),
  ('Time Series Analysis', 'time_series', 'methodology', true),
  ('Network Analysis', 'network_analysis', 'methodology', true),
  ('GIS/Spatial Analysis', 'gis_analysis', 'methodology', true),
  ('Text Mining', 'text_mining', 'methodology', true),
  ('Natural Language Processing', 'nlp_methods', 'methodology', true),
  
  -- Specialised Approaches
  ('Design Thinking', 'design_thinking', 'methodology', true),
  ('Service Design', 'service_design', 'methodology', true),
  ('Participatory Research', 'participatory_research', 'methodology', true),
  ('Action Research', 'action_research', 'methodology', true),
  ('Grounded Theory', 'grounded_theory', 'methodology', true),
  ('Phenomenology', 'phenomenology', 'methodology', true),
  ('Narrative Inquiry', 'narrative_inquiry', 'methodology', true),
  ('Discourse Analysis', 'discourse_analysis', 'methodology', true)

on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  is_active = excluded.is_active;

-- ── JURISDICTIONS (Legal/Regulatory Research) ──────────────────────────────
insert into public.expertise_taxonomy (name, slug, type, is_active) values
  -- United Kingdom
  ('England & Wales', 'england_wales', 'jurisdiction', true),
  ('Scotland', 'scotland', 'jurisdiction', true),
  ('Northern Ireland', 'northern_ireland', 'jurisdiction', true),
  ('UK Regulatory', 'uk_regulatory', 'jurisdiction', true),
  ('UK GDPR/Data Protection', 'uk_gdpr', 'jurisdiction', true),
  
  -- Crown Dependencies
  ('Jersey', 'jersey', 'jurisdiction', true),
  ('Guernsey', 'guernsey', 'jurisdiction', true),
  ('Isle of Man', 'isle_of_man', 'jurisdiction', true),
  
  -- European
  ('EU Law', 'eu_law', 'jurisdiction', true),
  ('GDPR', 'gdpr', 'jurisdiction', true),
  ('France', 'france', 'jurisdiction', true),
  ('Germany', 'germany', 'jurisdiction', true),
  ('Netherlands', 'netherlands', 'jurisdiction', true),
  ('Ireland', 'ireland', 'jurisdiction', true),
  ('Switzerland', 'switzerland', 'jurisdiction', true),
  ('Luxembourg', 'luxembourg', 'jurisdiction', true),
  
  -- Offshore/International
  ('Cayman Islands', 'cayman', 'jurisdiction', true),
  ('British Virgin Islands', 'bvi', 'jurisdiction', true),
  ('Bermuda', 'bermuda', 'jurisdiction', true),
  ('Delaware (US)', 'delaware', 'jurisdiction', true),
  ('New York (US)', 'new_york', 'jurisdiction', true),
  ('Singapore', 'singapore', 'jurisdiction', true),
  ('Hong Kong', 'hong_kong', 'jurisdiction', true),
  ('Dubai/DIFC', 'dubai', 'jurisdiction', true),
  ('UAE', 'uae', 'jurisdiction', true),
  ('India', 'india', 'jurisdiction', true),
  
  -- Regulatory Frameworks
  ('FCA Regulations', 'fca_regulations', 'jurisdiction', true),
  ('PRA Regulations', 'pra_regulations', 'jurisdiction', true),
  ('SEC Regulations', 'sec_regulations', 'jurisdiction', true),
  ('MiFID II', 'mifid_ii', 'jurisdiction', true),
  ('EMIR', 'emir', 'jurisdiction', true),
  ('AML/KYC', 'aml_kyc', 'jurisdiction', true),
  ('FATCA/CRS', 'fatca_crs', 'jurisdiction', true),
  ('Sanctions Compliance', 'sanctions', 'jurisdiction', true)

on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  is_active = excluded.is_active;

-- ── COMMON ALIASES FOR RESEARCH TERMS ───────────────────────────────────────
insert into public.expertise_aliases (alias, expertise_id)
select 'stats', id from public.expertise_taxonomy where slug = 'statistical_analysis'
union all
select 'statistics', id from public.expertise_taxonomy where slug = 'statistical_analysis'
union all
select 'data viz', id from public.expertise_taxonomy where slug = 'data_visualisation'
union all
select 'data visualization', id from public.expertise_taxonomy where slug = 'data_visualisation'
union all
select 'machine learning', id from public.expertise_taxonomy where slug = 'ml_research'
union all
select 'AI research', id from public.expertise_taxonomy where slug = 'ml_research'
union all
select 'market research', id from public.expertise_taxonomy where slug = 'market_research'
union all
select 'consumer research', id from public.expertise_taxonomy where slug = 'market_research'
union all
select 'brand research', id from public.expertise_taxonomy where slug = 'market_research'
union all
select 'UX research', id from public.expertise_taxonomy where slug = 'user_research'
union all
select 'user experience', id from public.expertise_taxonomy where slug = 'user_research'
union all
select 'product research', id from public.expertise_taxonomy where slug = 'user_research'
union all
select 'focus group', id from public.expertise_taxonomy where slug = 'focus_groups'
union all
select 'FGD', id from public.expertise_taxonomy where slug = 'focus_groups'
union all
select 'in-depth interview', id from public.expertise_taxonomy where slug = 'interviews'
union all
select 'IDI', id from public.expertise_taxonomy where slug = 'interviews'
union all
select 'competitive analysis', id from public.expertise_taxonomy where slug = 'competitive_intelligence'
union all
select 'CI', id from public.expertise_taxonomy where slug = 'competitive_intelligence'
union all
select 'due diligence', id from public.expertise_taxonomy where slug = 'due_diligence'
union all
select 'DD', id from public.expertise_taxonomy where slug = 'due_diligence'
union all
select 'ESG research', id from public.expertise_taxonomy where slug = 'esg_research'
union all
select 'sustainability research', id from public.expertise_taxonomy where slug = 'sustainability_research'
union all
select 'DEI', id from public.expertise_taxonomy where slug = 'dei_research'
union all
select 'diversity research', id from public.expertise_taxonomy where slug = 'dei_research'

on conflict (alias, expertise_id) do nothing;

-- =============================================================================
-- Note: This migration assumes expertise_taxonomy table exists from 0030.
-- If data visualisation doesn't exist, add it:
-- =============================================================================
insert into public.expertise_taxonomy (name, slug, type, is_active)
select 'Data Visualisation', 'data_visualisation', 'research_type', true
where not exists (select 1 from public.expertise_taxonomy where slug = 'data_visualisation');
