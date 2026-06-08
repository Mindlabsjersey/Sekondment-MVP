-- =============================================================================
-- SEKONDMENT — 0013  GLOBAL READINESS: CURRENCY + COUNTRY
-- Sekondment is GBP-first (Jersey test market) but global from day one. Carry
-- currency on opportunities and a preferred currency + country on accounts so
-- the UI never assumes GBP and future per-jurisdiction logic has a hook.
-- =============================================================================

-- Opportunities carry the currency their budget is expressed in.
alter table opportunities
  add column currency char(3) not null default 'GBP';

-- Accounts: country (ISO-ish free text for now) + preferred display currency.
alter table accounts
  add column country text,
  add column preferred_currency char(3) not null default 'GBP';

-- Expert rates are quoted in a currency too.
alter table expert_profiles
  add column rate_currency char(3) not null default 'GBP';

-- Helpful indexes for future jurisdiction filtering.
create index idx_accounts_country on accounts(country);
create index idx_opportunities_currency on opportunities(currency);
