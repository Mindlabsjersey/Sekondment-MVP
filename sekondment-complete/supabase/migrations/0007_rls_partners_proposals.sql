-- =============================================================================
-- SEKONDMENT — 0007  RLS FOR NEW TABLES
-- employer_partners · employer_employees · proposals
-- =============================================================================

-- Helper: employer_partner id for the current user (null if not a partner)
create or replace function my_employer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from employer_partners where account_id = auth.uid();
$$;

alter table employer_partners   enable row level security;
alter table employer_employees  enable row level security;
alter table proposals           enable row level security;

-- -----------------------------------------------------------------------------
-- EMPLOYER PARTNERS — public read (discovery of deploying companies), owner write
-- -----------------------------------------------------------------------------
create policy employer_read on employer_partners for select using (true);
create policy employer_write on employer_partners for all
  using (account_id = auth.uid()) with check (account_id = auth.uid());

-- -----------------------------------------------------------------------------
-- EMPLOYER ↔ EMPLOYEE — the employer manages the link; the employee can see
-- their own membership and accept/withdraw.
-- -----------------------------------------------------------------------------
create policy emp_emp_read on employer_employees for select using (
  employer_id = my_employer_id()
  or expert_id = my_expert_id()
  or is_admin()
);
-- employer controls approvals
create policy emp_emp_employer_write on employer_employees for all
  using (employer_id = my_employer_id())
  with check (employer_id = my_employer_id());
-- employee may update only their own row (e.g. withdraw consent)
create policy emp_emp_employee_update on employer_employees for update
  using (expert_id = my_expert_id())
  with check (expert_id = my_expert_id());

-- -----------------------------------------------------------------------------
-- PROPOSALS — the expert who made it + the business that owns the opportunity
-- -----------------------------------------------------------------------------
create policy proposals_read on proposals for select using (
  expert_id = my_expert_id()
  or exists (select 1 from opportunities o where o.id = opportunity_id and o.business_id = my_business_id())
  or is_admin()
);
-- expert creates/edits their own proposal
create policy proposals_expert_write on proposals for all
  using (expert_id = my_expert_id())
  with check (expert_id = my_expert_id());
-- business can update status (shortlist/accept/reject) on proposals to its opportunities
create policy proposals_business_update on proposals for update
  using (exists (select 1 from opportunities o where o.id = opportunity_id and o.business_id = my_business_id()))
  with check (exists (select 1 from opportunities o where o.id = opportunity_id and o.business_id = my_business_id()));
