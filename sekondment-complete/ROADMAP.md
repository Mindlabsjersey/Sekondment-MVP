> **For current build inventory, see CURRENT_STATE.md** (this file may contain older counts; strategy/detail here is still useful).

# Sekondment — Build Roadmap & Outstanding Work

This file tracks the strategic direction (Prompt 1) and the stabilise/harden plan
(Prompt 2) so the work is never lost between sessions. Update the checkboxes as
items are completed.

---

## Strategic direction (Prompt 1 — master)
Global-ready workforce capacity & expertise marketplace. Jersey is the first
commercial test market but **nothing is Jersey-hardcoded**. Support UK, Ireland,
Dubai, international from day one. Sekondment facilitates engagements; all payments
and communication stay in-platform.

Evolution order: trusted project marketplace → workforce capacity → verified
expertise → matching/recommendations → AI project builder → employer capacity →
knowledge/advisory → enterprise/private → global workforce OS.

Immediate priority: stabilise → harden payments/trust → global readiness →
contract/terms foundations → then expertise & capacity systems.

### Prompt 1 status
- [x] Global readiness: multi-currency formatter (`src/lib/currency.ts`), 8 currencies
- [x] Schema: `opportunities.currency`, `accounts.country` + `preferred_currency`,
      `expert_profiles.rate_currency` (migration 0013)
- [x] Currency selector on opportunity create; ~30 hardcoded `£` replaced
- [x] **Contracts / terms / agreements + acceptance flows** — DONE (migration 0014:
      legal_documents, document_acceptances, engagement agreement acceptance; /terms
      page; sign-up acceptance; onboarding records acceptance; engagement agreement panel)
- [x] Country + remote/onsite + proven-expertise badges surfaced on public expert profile

---

## Stabilise, test & harden (Prompt 2)

### Phase 0 — build health (must run on a real machine; cannot run on iPad/in-chat)
- [ ] npm install, lint, type check, tests, build
- [ ] Check env vars; Supabase connection; Stripe test mode; Resend no-op
- [ ] Confirm migrations 0009–0013 run in order
- [ ] Regenerate Supabase types
- [ ] Fix any compile/route/action errors surfaced by a real build
- [ ] Confirm all pages render, auth redirects, account-type routing

### Phase 1 — payment tests (Stripe test mode, needs live keys)
- [ ] Fund milestone → ledger records funding
- [ ] Submit work → release payment → Stripe transfer created
- [ ] Platform fee deducted; Employer Partner split; optional individual split
- [ ] Refund; split dispute resolution; webhook reliability
- [ ] Failed payments handled; **duplicate release impossible** (needs guard — see below)

### Security / RLS hardening — users must NOT be able to directly change:
- [ ] Trust Score · verification flags · Stripe account fields · ledger entries
- [ ] payment/payout status · proposal price after submit · admin fields
- [ ] dispute resolution fields · employer approval fields outside workflow
- [ ] reviews outside completed engagements · release unfunded milestones
- [ ] No self-verify · no duplicate accepted proposal → duplicate engagement
- [x] Milestone release idempotent (atomic claim + revert-on-failure)
  - NOTE: audit current RLS in 0004/0007; several of these are already enforced
    via service-client-only writes, but confirm each explicitly.

### Admin control centre — to add/improve
- [x] Flagged messages page (basic)
- [x] Analytics page
- [x] Verification queue · dispute queue
- [x] Admin payment ledger page
- [x] User management page (warn / suspend / recompute Trust Score)
- [ ] Verification detail page · dispute detail page
- [ ] Employer Partner management page
- [x] Activity event viewer (/admin/activity)
- [ ] Stripe object reference viewer
- [ ] Upgrade flagged-messages page: recipient, conversation, related opp/engagement,
      flag type, severity, repeat-offender count, dismiss/warn/suspend, admin notes

### Acceptance criteria (Prompt 2)
App builds cleanly · core flow works locally · Stripe test flow works · RLS prevents
sensitive manipulation · admin can monitor money/disputes/verification/flagged ·
existing marketplace flow intact.

---

## Hard constraints (all prompts)
Preserve stack (Next 15, React, TS, Tailwind, Supabase, Stripe Connect, Resend, Vercel).
Do not rebuild. Do not remove working flows. Do not break the core engagement→payment loop.

## Reality note
Phase 0 and Phase 1 (and live RLS verification) require running against real
Supabase/Stripe on a desktop — they cannot be completed from iPad/in-chat. The
in-chat work is limited to: writing code, schema, RLS policies, and static checks.

---

## Prompt 3 — Global readiness, agreements & compliance (status)
### Done (code-level, in-chat)
- [x] Global fields: region, city, timezone, open_to_international (accounts);
      remote/onsite/hybrid/travel availability, countries_served, based_country/city,
      timezone (expert_profiles); country, jurisdiction, local_knowledge_required,
      timezone_overlap, engagement_kind (opportunities) — migration 0018
- [x] Tables: engagement_terms (versioned), contract_templates (9 seeded),
      verification_documents, compliance_events, employer_employee_events — migration 0019
- [x] Compliance logging helper + wired into release/dispute/warn/suspend/verification
- [x] Admin compliance history viewer (/admin/compliance)
- [x] Verification document upload (user) + admin review action + private bucket
- [x] Careful legal language in seeded templates (no regulated-escrow / employer claims)
### Still to wire (in-chat, next)
- [x] Onboarding UI: where based / timezone / remote / countries served / preferred currency / international
- [x] Opportunity-create UI: onsite/hybrid, country/jurisdiction, local knowledge, timezone overlap, engagement kind
- [x] Search filters: country, remote, onsite (city/timezone/currency filters can extend later)
- [~] engagement_terms: table ready; basic both-party acceptance live via 0014 panel. RICHER versioned per-field terms editor + 3-party (employer) acceptance + fund-gating still TODO (post-MVP enhancement).
- [x] Admin verification page shows uploaded verification_documents with approve/reject
- [x] employer_employee_events wired into invite/approve/suspend/revoke flow

---

## Prompt 4 — Expertise Intelligence & Capacity Marketplace (status)
### Layer 1 — Expertise schema + seed (DONE)
- [x] 7 tables: expertise_taxonomy, expertise_aliases, expertise_relationships,
      profile_expertise, expertise_evidence, project_expertise_requirements,
      match_recommendations (migration 0020) + RLS
- [x] Seed: 85 commercially-valuable AI-resistant expertise entries + 35 aliases (0021)
### Layer 2 — Structured expertise on profiles (DONE)
- [x] Alias-aware expertise search; experts add/remove structured expertise (settings)
- [x] Actions for opportunity expertise requirements
### Layer 3 — Rule-based matching engine (DONE)
- [x] Pure scoring engine with reasons + missing (src/lib/matching/engine.ts) — UNIT TESTED 7/7
- [x] computeMatchesForOpportunity action caching to match_recommendations
### Layer 4 — Capacity marketplace (DONE)
- [x] Tables: capacity_profiles/availability/bookings/tags/utilisation (migration 0022)
- [x] Employer dashboard: capacity manager (list/unlist/delete, rates, commission/bonus)
- [x] Public capacity browse (/capacity) + business booking requests
### Layer 5 — UI surfacing + extras (MOSTLY DONE)
- [x] Opportunity page: requirements editor + Find matches button showing match % + reasons
- [~] Expertise requirements: managed on opportunity DETAIL page (create-page picker optional)
- [x] CV/LinkedIn text -> suggested expertise tags (keyword extraction, AI-ready interface)
- [x] Engagement completion upgrades expertise declared->proven + completed_engagement evidence
- [x] expertise_relationships seed (20 related pairs)
- [x] AI Project Builder foundation: rule-based structured suggestions (no AI dep)

---

## ▶ 6PM DESKTOP SESSION — EXACT ORDER OF PLAY
Open the project in VS Code / Windsurf with Claude Code. Claude Code auto-reads
CLAUDE.md. Then:

### Step A — Bootstrap (automated)
Run `bash scripts/setup.sh` (or on Windows, run the npm commands from SETUP.md
Phase 0 manually). This does: node check → npm install → .env.local scaffold →
tsc → build. **Fix exactly the build errors it reports** (see SETUP.md Phase 0).

### Step B — Live Supabase (SETUP.md Phase 1-3)
Create project → run migrations 0001→0022 in order → fill .env.local →
`npm run dev` → smoke-test core flow + Find matches.

### Step C — Live Stripe test mode (SETUP.md Phase 4)
Connect, `stripe listen`, run fund→submit→release with test cards.

### Step D — Then build the remaining FEATURES (in priority order)
1. CV upload → suggested expertise tags (keyword extraction first; AI later)
2. Admin detail pages: dispute detail, verification detail (richer), activity
   event viewer, Stripe object reference viewer
3. Employer Partner management page (admin)
4. Richer versioned engagement_terms editor + 3-party (employer) acceptance + fund-gating
5. Capacity bookings → optionally spin up an engagement automatically
6. Country/jurisdiction shown on public profile UI
7. Surface proven-expertise badges on public expert profiles
8. Upgrade flagged-messages page (recipient, severity, repeat-offender count, notes)

### Step E — Deploy (SETUP.md Phase 6)
GitHub → Vercel → env vars → production Stripe webhook → ship.

> NOTE: RLS hardening (no self-verify, ledger append-only, proposal-price lock,
> idempotent release, status guards) is ALREADY implemented in migrations
> 0016/0017 and the release route. Phase B/C just VERIFIES it against live DB.

---

## Prompt 5 — Expertise Graph, CV Intelligence & Marketplace Intelligence (status)
### Done (in-chat, structural)
- [x] Phase 1 CV intelligence: paste CV/LinkedIn text -> structured expertise
      suggestions + seniority/jurisdiction/language/years extraction (keyword-based,
      AI-ready interface). Stores structured records, not raw text.
- [x] Phase 2 graph structure: jurisdiction + service_category + platform added as
      taxonomy types (0023); taxonomy expanded ~85 -> ~233 across 15 sectors +
      14 jurisdictions + 8 service categories (0025). Parent/child + aliases +
      relationships already support unbounded growth.
- [x] Phase 3 proof: declared/verified/proven + richer dimensions (seniority,
      team_size, completed_engagements, average_rating) on profile_expertise (0024).
      Completion upgrades declared->proven with evidence (built in Prompt 4).
- [x] Phase 4/5 search: alias-aware expertise + capability search (Prompt 4).
- [x] Phase 6 marketplace intelligence: expertise_demand_stats table +
      expertise_intelligence view + /admin/expertise dashboard (most requested,
      supply/demand gaps, value, AI-resistance, proven counts). Demand refreshes
      when matches run.
- [x] Phase 8 AI-readiness: analytics table + view structured so future AI
      (pricing, forecasting, skill-gap, team builder) consumes WITHOUT schema change.

### Honest scope notes (ongoing, not in-chat)
- [~] Phase 2 record COUNT: target is 1k -> 5k -> 20k records. Structure scales
      to that, but seeding tens of thousands of QUALITY records is a continuous
      data-ops effort (curate/import), not a single chat task. ~233 seeded so far.
- [~] Phase 1 real CV PARSING: currently keyword extraction over pasted text. A
      real parser (PDF upload + NLP) is the future-AI layer; the prompt explicitly
      says don't build AI now — the structured interface is ready for it.
- [ ] Capability search showing teams/consultancies (currently individuals +
      employer resources; team entities would need a teams table — future).

### Migrations added this prompt
- 0023 expertise_graph_expansion (enum values — isolated)
- 0024 proof_and_intelligence (dimensions + demand stats + view + refresh fn)
- 0025 taxonomy_expansion (~148 new records)

---

## Platform Operations Centre (internal operating system) — status
The internal command system for the owner + internal team. SEPARATE from and more
powerful than the marketplace admin pages. Internal platform roles are distinct from
marketplace account types. Build in layers (per the spec).

### Layer 1 — DONE (in-chat)
- [x] Internal role system: `platform_role` enum (owner/director/operations/
      compliance/finance/marketplace/support) — migration 0026 (isolated enum)
- [x] Tables (0027): platform_team_members, internal_notes, audit_logs, crm_leads,
      team_tasks + RLS (staff-only; owner-only writes to team roster) + helper fns
      (is_platform_owner, is_platform_staff, platform_role_of)
- [x] Access lib `src/lib/platform/access.ts`: getPlatformRole, canAccess (module
      matrix), auditLog
- [x] `/platform` route + role-aware `PlatformShell` + `requirePlatform()` guard
- [x] Executive Dashboard: users/businesses/experts/partners, new today/month,
      GMV, revenue, engagements, disputes, verification backlog, risk status,
      + Marketplace Liquidity Score (0-100) with diagnosis

### Layer 2 — TODO (Devin)
- [ ] Revenue dashboard (GMV/revenue by period/country/industry/account-type/split)
- [ ] Payments dashboard (funded/released/held/refunds/failed/Stripe refs/exports)
- [ ] Marketplace Health dashboard (proposal/acceptance/conversion/completion rates,
      time-to-proposal/engagement, no-proposal opps, supply/demand gaps)
- [ ] Compliance dashboard (verification states, contracts, NDAs, disputes, risk level)
- [ ] Internal CRM pipeline UI (table crm_leads exists; build kanban/list + stages)
- [ ] Internal team management (owner invites/assigns roles; team_tasks workload)
- [ ] Internal notes UI component attachable to records (table internal_notes exists)

### Layer 3 — TODO (Devin)
- [ ] Expertise intelligence dashboard (reuse /admin/expertise data in Ops Centre)
- [ ] Workforce capacity dashboard (hours listed/booked/utilisation/revenue/by geo)
- [ ] Geographic dashboard (users/revenue/projects by country/region/city; map later)
- [ ] User growth funnel (signup→onboarding→profile→expertise→proposal→engagement→
      milestone→completed→review; retention/churn/activation)
- [ ] Data exports (CSV/report downloads; all exports audit-logged)

### Layer 4 — TODO (Devin, future)
- [ ] AI & Matching dashboard (matches generated/accepted/dismissed/conversion)
- [ ] BI/data-warehouse event stream (Power BI/Fabric/Looker/Metabase ready)
- [ ] System health module (app/db/Stripe/Resend status, failed webhooks/emails)
- [ ] Optional: audited user impersonation (owner/senior only, clearly marked)

### Setup note
After migrating, seed the first owner manually:
  insert into platform_team_members (account_id, role)
  select id, 'platform_owner' from accounts where email = 'joe@mindlabs.je';
