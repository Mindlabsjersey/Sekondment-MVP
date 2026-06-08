-- =============================================================================
-- SEKONDMENT — 0015  SECURITY HARDENING (column-level write guards)
-- RLS policies grant row access but cannot restrict *which columns* a user
-- changes. The profile write policies let owners edit their whole row — which
-- would allow self-setting trust_score or verification. These triggers block
-- changes to protected columns unless performed by the service role (server).
--
-- Detection: the service_role JWT has role = 'service_role'. Client requests
-- (anon/authenticated) cannot spoof this. auth.role() returns the current role.
-- =============================================================================

create or replace function public.is_service_role()
returns boolean language sql stable as $$
  select coalesce(auth.role() = 'service_role', false)
$$;

-- ── EXPERT PROFILES: protect trust_score + verification flags ───────────────
create or replace function public.guard_expert_protected()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return new; end if;
  -- Preserve protected columns at their OLD values for non-service writers.
  new.trust_score            := old.trust_score;
  new.verification_status    := old.verification_status;
  new.email_verified         := old.email_verified;
  new.identity_verified      := old.identity_verified;
  new.linkedin_verified      := old.linkedin_verified;
  new.certification_verified := old.certification_verified;
  new.employer_partner_id    := old.employer_partner_id;  -- set only via partner approval
  return new;
end $$;

drop trigger if exists trg_guard_expert on expert_profiles;
create trigger trg_guard_expert before update on expert_profiles
  for each row execute function public.guard_expert_protected();

-- ── BUSINESS PROFILES: protect trust_score + verification flags ─────────────
create or replace function public.guard_business_protected()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return new; end if;
  new.trust_score         := old.trust_score;
  new.verification_status := old.verification_status;
  new.email_verified      := old.email_verified;
  new.company_verified    := old.company_verified;
  new.director_verified   := old.director_verified;
  return new;
end $$;

drop trigger if exists trg_guard_business on business_profiles;
create trigger trg_guard_business before update on business_profiles
  for each row execute function public.guard_business_protected();

-- ── ACCOUNTS: protect account_type + stripe fields from self-edit ───────────
create or replace function public.guard_account_protected()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return new; end if;
  new.account_type         := old.account_type;          -- role can't be self-changed
  new.stripe_account_id    := old.stripe_account_id;     -- payout identity locked
  new.stripe_onboarding_done := old.stripe_onboarding_done;
  return new;
end $$;

drop trigger if exists trg_guard_account on accounts;
create trigger trg_guard_account before update on accounts
  for each row execute function public.guard_account_protected();

-- ── PROPOSALS: lock price once submitted ────────────────────────────────────
-- Proposals are created as 'submitted'. A business must never edit a proposal;
-- an expert cannot change price/terms after submission (only withdraw). Service
-- role (the accept flow) may still update status.
create or replace function public.guard_proposal_price()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return new; end if;
  -- Any non-service writer is blocked from changing commercial terms.
  new.price       := old.price;
  new.rate_type   := old.rate_type;
  new.est_units   := old.est_units;
  return new;
end $$;

drop trigger if exists trg_guard_proposal on proposals;
create trigger trg_guard_proposal before update on proposals
  for each row execute function public.guard_proposal_price();

-- ── LEDGER ENTRIES: append-only. No updates or deletes by anyone but service ─
create or replace function public.guard_ledger_append_only()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return coalesce(new, old); end if;
  raise exception 'ledger_entries is append-only';
end $$;

drop trigger if exists trg_guard_ledger_update on ledger_entries;
create trigger trg_guard_ledger_update before update on ledger_entries
  for each row execute function public.guard_ledger_append_only();

drop trigger if exists trg_guard_ledger_delete on ledger_entries;
create trigger trg_guard_ledger_delete before delete on ledger_entries
  for each row execute function public.guard_ledger_append_only();
