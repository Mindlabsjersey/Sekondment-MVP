-- =============================================================================
-- SEKONDMENT — 0026  PLATFORM OPERATIONS CENTRE — internal role enum (ISOLATED)
-- Internal platform roles are SEPARATE from marketplace account types
-- (business/expert/employer_partner/admin). These govern the Ops Centre.
-- Enum-add only — must be its own transaction (used by 0027).
-- =============================================================================

create type platform_role as enum (
  'platform_owner',     -- founder; can see/do everything; cannot be restricted
  'platform_director',  -- COO/Head of Ops; broad read, no owner controls
  'operations_manager', -- users, verification, disputes, capacity, flagged
  'compliance_manager', -- verification, contracts, compliance, audit, suspensions
  'finance_manager',    -- GMV, revenue, payouts, refunds, ledger, splits
  'marketplace_manager',-- supply/demand, capacity, expertise, liquidity
  'support_team'        -- tickets, basic profiles, notes
);
