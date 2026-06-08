-- =============================================================================
-- SEKONDMENT — 0017  ACCOUNT MODERATION
-- Admin user management: status (active/warned/suspended), admin notes, and a
-- count of anti-circumvention flags for repeat-offender handling.
-- Status is service-role-write-only (guarded) so users can't un-suspend.
-- =============================================================================

create type account_status as enum ('active', 'warned', 'suspended');

alter table accounts
  add column status account_status not null default 'active',
  add column admin_notes text,
  add column warned_at timestamptz,
  add column suspended_at timestamptz;

create index idx_accounts_status on accounts(status);

-- Extend the account guard so users can't change their own moderation status.
create or replace function public.guard_account_protected()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then return new; end if;
  new.account_type           := old.account_type;
  new.stripe_account_id      := old.stripe_account_id;
  new.stripe_onboarding_done := old.stripe_onboarding_done;
  new.status                 := old.status;        -- moderation locked
  new.admin_notes            := old.admin_notes;
  new.warned_at              := old.warned_at;
  new.suspended_at           := old.suspended_at;
  return new;
end $$;
