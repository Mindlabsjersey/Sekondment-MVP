-- =============================================================================
-- SEKONDMENT — 0033  EMPLOYEE DEPLOYMENT (Company Resource self-match + approval)
-- An Employee (an expert account) can match themselves to a Business that
-- deploys them. The link stays 'pending' until the Business approves it, at
-- which point the employee becomes a live Company Resource.
--
-- Approval/decline is a normal UPDATE of employment_status, already permitted by
-- the existing expert_write policy (employing_business_id = my_business_id()).
-- We only need to (a) store the status + payee preference and (b) let the
-- Business *see* pending employees regardless of profile visibility so the
-- approval queue works.
-- Idempotent — safe to re-run.
-- =============================================================================

alter table expert_profiles
  add column if not exists employment_status text not null default 'independent'
    check (employment_status in ('independent', 'pending', 'employed'));

alter table expert_profiles
  add column if not exists payment_preference text
    check (payment_preference in ('me', 'employer', 'split'));

create index if not exists idx_expert_employment_status on expert_profiles(employment_status);

-- Allow a Business to read expert profiles that have matched themselves to it
-- (pending or approved) even when the profile is unlisted, so the approval queue
-- is visible. Additive to the existing visibility / engagement rules.
drop policy if exists expert_read on expert_profiles;
create policy expert_read on expert_profiles for select using (
  account_id = auth.uid()
  or is_admin()
  or visibility = 'listed'
  or employing_business_id = my_business_id()
  or exists (
    select 1 from engagements e
    join business_profiles b on b.id = e.business_id
    where e.expert_id = expert_profiles.id
      and b.account_id = auth.uid()
  )
);

-- Approve or decline a pending employee. Runs as definer so a decline can clear
-- the link (which the expert_write WITH CHECK would otherwise reject), but only
-- after verifying the caller owns the Business the employee matched to.
create or replace function respond_to_employee(p_expert_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
begin
  select employing_business_id into v_business
  from expert_profiles where id = p_expert_id;

  if v_business is null then
    raise exception 'This person is not linked to a business';
  end if;

  if not exists (
    select 1 from business_profiles bp
    where bp.id = v_business and bp.account_id = auth.uid()
  ) then
    raise exception 'Not authorised to manage this employee';
  end if;

  if p_approve then
    update expert_profiles
      set employment_status = 'employed'
      where id = p_expert_id;
  else
    update expert_profiles
      set employment_status = 'independent',
          employing_business_id = null,
          payment_preference = null
      where id = p_expert_id;
  end if;
end;
$$;

grant execute on function respond_to_employee(uuid, boolean) to authenticated;
