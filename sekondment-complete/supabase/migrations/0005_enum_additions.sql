-- =============================================================================
-- SEKONDMENT — 0005a  ENUM ADDITIONS (must run & commit BEFORE 0005)
-- Postgres forbids using a newly added enum value in the same transaction that
-- adds it, so these live in their own migration file. Supabase runs each
-- migration file in order, each committing before the next begins.
-- =============================================================================

-- Employer Partner becomes a first-class account type.
alter type account_type add value if not exists 'employer_partner';

-- An engagement can now pay an expert, a business, or an employer partner.
alter type payee_type add value if not exists 'employer_partner';
