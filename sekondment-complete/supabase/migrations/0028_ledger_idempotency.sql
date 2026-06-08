-- =============================================================================
-- SEKONDMENT — 0028  LEDGER IDEMPOTENCY
-- Stripe legitimately retries webhook deliveries (e.g. payment_intent.succeeded).
-- The webhook writes a 'fund' ledger row keyed on the PaymentIntent id; a retry
-- would otherwise insert a DUPLICATE money row and corrupt reconciliation.
--
-- A partial unique index on (stripe_object_id, entry_type) makes each Stripe
-- object record at most one ledger row per entry_type. NULL stripe_object_id is
-- excluded so non-Stripe / future entries are unaffected (and Postgres treats
-- NULLs as distinct anyway). This index also backs the webhook's conflict-safe
-- upsert (ON CONFLICT DO NOTHING).
--
-- Note: 'fund' uses the PaymentIntent id, 'fee' uses the charge id, and each
-- 'transfer_*' uses its own transfer id, so these never collide.
-- =============================================================================

-- Defensive: collapse any pre-existing duplicates before enforcing uniqueness.
delete from ledger_entries a
using ledger_entries b
where a.ctid < b.ctid
  and a.stripe_object_id is not null
  and a.stripe_object_id = b.stripe_object_id
  and a.entry_type = b.entry_type;

create unique index if not exists ux_ledger_stripe_object_entry
  on ledger_entries (stripe_object_id, entry_type)
  where stripe_object_id is not null;
