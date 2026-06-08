# BUILD MANIFEST — Sekondment (complete app inventory)

This is the canonical "what exists" reference. Sekondment is a **complete B2B
workforce-capacity & expertise marketplace** — not a prototype and not "five
prompts." It was built across many sessions; the five strategic prompts (global
readiness, contracts/compliance, expertise engine, capacity marketplace, expertise
graph) are enhancement layers on top of a full core product.

Tagline: **"Deploy expertise, not headcount."**
Stack: Next.js 15 (App Router) - React 19 - TypeScript - Supabase (Postgres/Auth/
Realtime/Storage/RLS) - Stripe Connect - Tailwind - Resend - Vercel.

**Scale:** 117 source files - 32 pages - 5 API routes - 25 migrations - 45 tables -
76 RLS policies - 22 server-action modules - 17 lib modules.

---

## CORE PRODUCT (the foundation — built first)

### Accounts & onboarding
Four account types, each with tailored onboarding: **business, expert,
employer_partner, admin**. Profiles, availability, trust-score factors.

### The marketplace core loop
post opportunity -> expert/partner **proposes** -> business **accepts** ->
**engagement** created -> fund **milestone** (escrow-style) -> **submit** work ->
**release** payment (with Company Resource split) -> **reviews** -> **disputes**.

### Payments — Stripe Connect, milestone escrow
- Milestone fund / submit / release API routes (src/app/api/engagements/...).
- src/lib/stripe/escrow.ts — split math, **unit-tested**, lowercases currency for Stripe.
- **Company Resource model** (the differentiator): employer is paid, individual
  stays on payroll, optional bonus split. Never broken.
- Append-only ledger_entries; idempotent release (atomic submitted->releasing claim).

### Messaging, trust, reviews, disputes, files, boards, notifications
- Real-time messaging with **anti-circumvention filter** (src/lib/messaging/filter.ts, unit-tested).
- **Trust Score** system (src/lib/trust/score.ts + recompute.ts).
- Reviews (5-dimension), disputes with resolution, project boards
  (columns/cards), engagement file sharing (Supabase Storage), in-app notifications.

### Admin suite (9 pages)
disputes - verification - flagged messages - payment ledger - user management
(warn/suspend/reinstate/recompute trust) - compliance history - activity stream -
expertise intelligence - analytics.

### Design system
Royal blue (#1d4ed8) + gold (#c8a24a); light/dark via CSS-variable Tailwind tokens;
8 per-industry accent themes via data-industry; Fraunces + Spline Sans.

---

## ENHANCEMENT LAYERS (the five strategic prompts)

**P1 — Global readiness & terms:** currency layer (no hardcoded GBP), country/region/
city/timezone, platform terms acceptance, engagement agreement acceptance.

**P2 — Stabilise & harden:** RLS column-guard triggers (no self-edit of trust/
verification/status/stripe; ledger append-only; proposal price locked), account
moderation, duplicate-release guard.

**P3 — Global, agreements, compliance:** global fields wired into onboarding +
opportunity creation, search filters, engagement_terms / contract_templates
(9 seeded) / verification_documents / compliance_events /
employer_employee_events, compliance logging + admin viewer, verification upload/review.

**P4 — Expertise Intelligence Engine + Capacity Marketplace:**
- Expertise graph: taxonomy + aliases + relationships + profile_expertise +
  evidence + project requirements + match_recommendations.
- Rule-based **matching engine** (src/lib/matching/engine.ts, unit-tested) — score
  + reasons + gaps; surfaced on the opportunity page ("Find matches").
- Completion **upgrades expertise** declared->proven with evidence.
- **Capacity Marketplace**: capacity_profiles/availability/bookings/tags/utilisation;
  partner can list capacity; public /capacity browse; businesses request bookings.
- **AI Project Builder** foundation (rule-based, no AI dependency).

**P5 — Expertise Graph, CV Intelligence, Marketplace Intelligence:**
- CV/LinkedIn text -> structured expertise suggestions (+ seniority/jurisdiction/
  language/years), confirm-to-add.
- Taxonomy expanded ~85->~233 across 15 sectors + jurisdictions + service categories;
  jurisdiction/service_category/platform added as taxonomy types.
- expertise_demand_stats + expertise_intelligence view + /admin/expertise
  dashboard (most requested, supply/demand gaps, value, AI-resistance, proven).
- Structured for **future AI consumption without schema changes**.

---

## DATA MODEL (45 tables — run migrations 0001->0025 IN ORDER)

- 0001 core_schema: accounts, business_profiles, expert_profiles, expert_availability, trust_score_factors
- 0002 marketplace: opportunities, opportunity_interest, saved_experts, saved_opportunities, engagements, conversations, messages
- 0003 payments: milestones, deliverables, ledger_entries, disputes, reviews, activity_events
- 0004 rls: RLS + is_admin()
- 0005 enum_additions: employer_partner enum (ISOLATED)
- 0006 partners_rates_proposals: employer_partners, employer_employees, proposals
- 0007 rls_partners_proposals: RLS
- 0008 realtime_messages: realtime publication
- 0009 opportunity_visibility / 0010 expert_visibility: listed/unlisted
- 0011 notifications: notifications
- 0012 files_and_boards: boards, board_columns, board_cards + storage
- 0013 global_currency_country: currency/country fields
- 0014 terms_agreements: legal_documents, document_acceptances
- 0015 milestone_releasing_enum: releasing enum (ISOLATED)
- 0016 security_hardening: column-guard triggers, is_service_role()
- 0017 account_moderation: status/admin_notes
- 0018 global_fields: region/city/timezone/work-mode availability
- 0019 contracts_compliance: engagement_terms, contract_templates, verification_documents, compliance_events, employer_employee_events
- 0020 expertise_engine: 7 expertise tables
- 0021 expertise_seed: ~85 taxonomy + aliases + relationships
- 0022 capacity_marketplace: capacity_profiles, capacity_tags, capacity_availability, capacity_bookings, capacity_utilisation_events
- 0023 expertise_graph_expansion: jurisdiction/service_category/platform enum (ISOLATED)
- 0024 proof_and_intelligence: expertise_demand_stats + expertise_intelligence view + refresh fn
- 0025 taxonomy_expansion: ~148 more taxonomy records

---

## ROUTES (32 pages)
Public: /, /browse/experts, /browse/opportunities, /terms, /sign-in, /sign-up, /sign-up/check-email.
Authed: /dashboard, /onboarding, /settings, /settings/payments, /messages, /messages/[id],
/experts, /experts/[id], /saved, /opportunities, /opportunities/new, /opportunities/[id],
/engagements, /engagements/[id], /partner, /capacity.
Admin: /admin/{disputes,verification,flagged,ledger,users,compliance,activity,expertise,analytics}.
API: /api/stripe/{webhook,connect}, /api/engagements/[id]/milestones/[mid]/{fund,submit,release}.

---



## PLATFORM OPERATIONS CENTRE (internal operating system — Layer 1 built)
Separate internal command centre at /platform with its own role system
(platform_owner/director/operations/compliance/finance/marketplace/support — distinct
from marketplace account types). Layer 1: role system + Executive Dashboard +
Marketplace Liquidity Score + internal notes/audit-log/CRM tables. Migrations 0026-0027.
Layers 2-4 (revenue/payments/marketplace/compliance/expertise/capacity/geographic/
growth/AI/BI/system-health dashboards, CRM UI, team mgmt, exports) tracked for Devin
in ROADMAP.md + DEVIN.md Task 4 (prioritised).

## STATUS
Built and **statically verified** (zero real type errors). Has **not yet run against
live Supabase/Stripe** — first-run build fixes + live infra are the next step
(see DEVIN.md task list and SETUP.md). Two unit-tested cores: matching engine, escrow split.
