# SEKONDMENT — CLAUDE HANDOFF PROMPT
# Paste this entire document into Claude inside Devin to resume the build.
# This replaces the full conversation history from Claude.ai.

---

## WHO YOU ARE AND WHAT WE'VE BUILT

You are resuming a long build session for **Sekondment** — a global-ready B2B
workforce-capacity and expertise marketplace. Tagline: "Deploy expertise, not
headcount." Built entirely through Claude.ai chat sessions. The codebase is now
open in Devin (formerly Windsurf) and you are Claude running inside Devin.

The codebase has been **static-checked and verified** but has **never run against
live infrastructure**. First priority on desktop is getting it to build and connect
to live Supabase + Stripe.

---

## THE PRODUCT

**Core differentiator:** the Company Resource / Employer Partner model — a business
deploys employed staff through the platform; payment routes to the employer (not the
individual); the expert stays on the employer's payroll; optional bonus split.

**Account types:** business, expert, employer_partner, admin.

**The success-metric flow:**
opportunity → proposal → accept → engagement → fund milestone (escrow-style) →
submit work → release payment (with split) → reviews → disputes.

**The moat:** the Expertise Graph — structured expertise taxonomy (not job titles),
alias-aware search, rule-based matching engine (0-100 score with reasons + gaps),
proof accumulation from completed engagements (declared→verified→proven).

---

## TECH STACK (do not change)

- Next.js 15, App Router, Server Actions, RSC
- React 19, TypeScript
- Supabase (Postgres, Auth, Realtime, Storage, RLS)
- Stripe Connect (separate charges & transfers)
- Tailwind CSS with CSS-variable tokens
- Vercel (hosting)
- Resend (email — safely no-ops without API key)

---

## CODEBASE STATE

**117 source files, 25 migrations, 44 tables, 76 RLS policies, 30 pages, 5 API routes.**
Zero real type errors (sandbox tsc shows ~600 missing-node_modules noise — vanishes
on npm install). Never run against live infrastructure.

### Migrations (run 0001 → 0025 IN ORDER — order-sensitive):
- 0001 core_schema, 0002 marketplace, 0003 payments, 0004 rls
- **0005** enum_additions (employer_partner) — ISOLATED enum-add, own transaction
- 0006 partners_rates_proposals, 0007 rls_partners_proposals
- 0008 realtime_messages, 0009 opportunity_visibility, 0010 expert_visibility
- 0011 notifications, 0012 files_and_boards, 0013 global_currency_country
- 0014 terms_agreements, **0015** milestone_releasing_enum — ISOLATED enum-add
- 0016 security_hardening, 0017 account_moderation, 0018 global_fields
- 0019 contracts_compliance, 0020 expertise_engine, 0021 expertise_seed
- 0022 capacity_marketplace
- **0023** expertise_graph_expansion — ISOLATED enum-add (jurisdiction/service_category)
- 0024 proof_and_intelligence (runs AFTER 0023)
- 0025 taxonomy_expansion (runs AFTER 0023)

⚠ Three migrations (0005, 0015, 0023) are enum-add-only and MUST run in their own
transaction. The combined `supabase/ALL_MIGRATIONS.sql` has a warning about this.
Safest: run each .sql file individually in the Supabase SQL editor in filename order.

### Key routes:
All authed routes under `src/app/(app)/`. Public: `/browse/*`, `/terms`.
Auth: `/sign-in`, `/sign-up`, `/auth/callback`.
API: `/api/stripe/{webhook,connect}`, `/api/engagements/[id]/milestones/[mid]/{fund,submit,release}`.
Middleware: `src/middleware.ts` (protects authed routes; `/browse/*` public).

### Key lib files:
- `src/lib/matching/engine.ts` — rule-based matching (unit-tested 8/8)
- `src/lib/stripe/escrow.ts` — split math (unit-tested)
- `src/lib/compliance/log.ts` — audit trail
- `src/lib/currency.ts` — formatMoney, SUPPORTED_CURRENCIES
- `src/lib/supabase/server.ts` — createClient + createServiceClient (server-only)

### Design system:
Royal blue `#1d4ed8` + gold `#c8a24a`. CSS-variable Tailwind tokens:
`bg-paper`, `text-ink`, `bg-moss` (blue), `bg-sand` (gold). Dark mode via class.
`darkMode: 'class'`. Fraunces serif + Spline Sans.

---

## HARD RULES (never break these)

1. **Do not rebuild the stack** or swap core libraries.
2. **Do not break the core flow:** post → propose → accept → engagement → fund →
   submit → release (with Company Resource split) → reviews → disputes.
3. **Run migrations in filename order.** 0005, 0015, 0023 are enum-add-only —
   each needs its own transaction.
4. **Never commit `.env.local`** or any secret. `service_role` key is server-only.
5. **Do not use `sekondment_master_schema.sql`** — it was deleted (stale, dangerous).
   Use the numbered migrations only.
6. **Careful legal language:** allowed: "milestone funding", "payment protection",
   "escrow-style payment flow", "platform-facilitated engagement". Never claim:
   regulated escrow, Sekondment employs the worker, Sekondment owns the job.

---

## SETUP SEQUENCE (what to do right now)

Full runbook in `SETUP.md`. Summary:

### Phase 0 — Local build (agent does this):
```bash
npm install
npx tsc --noEmit      # fix real errors only (not missing-module noise)
npm run lint
npm run build         # will likely surface a few real errors — fix them
```
Expected first-run build errors (not alarming — fix exactly what's reported):
- Next.js 15 stricter on searchParams/params (now Promises) — add `await`
- Possibly missing `'use client'` or `'use server'` on a file or two
- Do NOT mass-refactor. Fix exactly what the build reports.

### Phase 1 — Supabase (Joseph does this — agent cannot log in):
1. Create project at supabase.com (region: London eu-west-2)
2. Run migrations 0001→0025 in order in the SQL editor
3. Copy URL + anon key + service_role key into `.env.local`
4. `npm run dev` — smoke-test the core flow

### Phase 2 — Stripe test mode (Joseph does this):
1. `stripe login` (browser auth — Joseph only)
2. `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Copy `whsec_…` into `.env.local`
4. Test fund → submit → release with card 4242 4242 4242 4242

### Phase 3 — Build remaining features (agent does this):
See ROADMAP.md "6PM DESKTOP SESSION" section for the exact priority order.

---

## WHAT'S BUILT (all five prompts)

### Prompt 1 — Global readiness + terms ✅
Currency layer (8 currencies, formatMoney throughout), global fields (country/city/
timezone/workmode), terms/agreements, sign-up checkbox, onboarding acceptance.

### Prompt 2 — Security hardening ✅ (code), ⏳ (live verification pending)
RLS column-guard triggers (trust_score/verification/status/ledger/proposal-price
all protected), account moderation (warn/suspend/reinstate), admin pages:
flagged messages, payment ledger, user management.

### Prompt 3 — Global compliance ✅
Onboarding asks location/timezone/countries/remote/currency. Opportunity-create
asks onsite/hybrid, country, local knowledge, engagement kind. Search filters:
country, remote, onsite. Admin: compliance history viewer, verification doc upload
+ review. employer_employee_events logged (invite/approve/suspend/revoke).
Tables: engagement_terms, contract_templates (9 seeded), verification_documents,
compliance_events, employer_employee_events.

### Prompt 4 — Expertise Intelligence Engine + Capacity Marketplace ✅
7 expertise tables (0020) + 85-entry seed (0021) + 35 aliases.
Alias-aware expert picker in settings. Rule-based matching engine (unit-tested).
RequirementsManager + MatchesPanel on opportunity detail (owner defines expertise,
finds matches, sees % + reasons + gaps). Engagement completion → expertise upgrades
declared→proven with completed_engagement evidence.
Capacity marketplace: 5 tables (0022), employer capacity manager, public /capacity
browse, BookCapacityButton. AI Project Builder (rule-based, on opportunity-create).

### Prompt 5 — Expertise Graph + Marketplace Intelligence ✅ (structural)
Taxonomy expanded ~85 → ~233 records across 15 sectors + jurisdictions + service
categories (0025). CV extraction deepened: seniority, jurisdictions, languages.
expertise_demand_stats table + expertise_intelligence view (AI-consumable, no
schema change needed for future AI features). Admin /expertise dashboard: most
requested, supply/demand gaps, commercial value, AI-resistance, proven counts.
Demand stats refresh when matches run.

---

## OUTSTANDING ITEMS (ROADMAP.md has the full list)

### Desktop-only (needs live infrastructure):
- npm install / build / fix first-run errors
- Live Supabase: run migrations, verify RLS guards, test Realtime
- Stripe test-mode: full fund→submit→release flow, ledger audit

### Optional features still to build (in priority order):
1. Richer versioned engagement_terms editor + 3-party employer acceptance + fund-gating
2. Admin: dispute detail page, employer-partner management page, Stripe object viewer
3. Capacity booking → auto-create engagement (currently request only)
4. Taxonomy growth toward 1,000+ records (ongoing data-ops, not code)
5. Real CV parsing (PDF upload + NLP — future AI layer, interface already ready)
6. Capability search showing teams/consultancies (would need a teams table)

---

## HOW TO CONTINUE THIS SESSION

You are Claude inside Devin. Treat this exactly as a continuation of the build.
The codebase is open in Devin. Start with Phase 0 (npm install + build), fix what
surfaces, then work through the outstanding items above in priority order.

Always:
- Inspect before editing (`view` the file, understand the structure)
- Fix exactly what the build reports (don't mass-refactor)
- Verify with `npx tsc --noEmit` after each meaningful change
- Keep the core flow unbroken
- Update ROADMAP.md checkboxes as you complete items

The session context from Claude.ai is not available here — this document IS the
context. If you need detail about a specific file, read it from the codebase.
Everything is in `src/` and `supabase/migrations/`.

The full original build prompts (1-5) are saved verbatim in **BUILD_PROMPTS.md** —
read them for the complete original intent and acceptance criteria behind each phase.
