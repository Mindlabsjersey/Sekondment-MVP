# DEVIN.md — Autonomous Agent Handoff for Sekondment

You are picking up a **complete, substantial B2B marketplace** built across many
sessions — a Next.js 15 / TypeScript / Supabase / Stripe Connect codebase with full
auth, a milestone-escrow payment loop, messaging, trust scoring, reviews, disputes,
a 9-page admin suite, an expertise-intelligence engine, and a capacity marketplace.
It is NOT a prototype and NOT "five prompts" — read **BUILD_MANIFEST.md** for the
full inventory before you assume anything about scope.

Then read this file fully before acting, followed by `CLAUDE.md`, `SETUP.md`,
`AUDIT.md`, and `ROADMAP.md`. This file tells you the EXACT track to stay on so the
project continues consistently. **Do not improvise architecture.**

---

## GROUND RULES (read first — these are hard constraints)

1. **Never rebuild the stack or swap libraries.** Next.js 15 App Router, Supabase,
   Stripe Connect, Tailwind. No Prisma, no other ORM, no auth library swap.
2. **Never break the core loop:** post opportunity → propose → accept → engagement
   → fund milestone (escrow-style) → submit → release (with Company Resource split)
   → reviews → disputes. If a change risks this, STOP and flag it.
3. **Run migrations in filename order, 0001 → 0025.** Order-sensitive files:
   - 0005, 0015, 0023 each ONLY add enum values (must run in their own transaction
     before any statement uses the new value). Do not merge them into other files.
   - 0020 (expertise schema) before 0021 (its seed).
   - 0023 (enum values) before 0024/0025 (which use them).
4. **Never commit secrets.** `.env.local` is gitignored. The `service_role` key is
   server-only — never expose it to client components or `NEXT_PUBLIC_*`.
5. **Do NOT use `supabase/ALL_MIGRATIONS.sql` if it errors on enum usage** — fall
   back to the individual numbered files (each runs in its own transaction).
6. **Careful legal language (compliance requirement).**
   - Allowed: "milestone funding", "payment protection", "funds held until
     approval", "escrow-style flow", "platform-facilitated", "agreement acceptance".
   - NEVER write: "regulated escrow", "guaranteed legal compliance", "Sekondment
     employs the worker", "Sekondment owns the job", "Sekondment is the legal employer".
7. **When unsure, STOP and ask** rather than guessing. Specifically: any change to
   payments/escrow, RLS policies, or the Company Resource (employer-partner) model.

---

## CURRENT STATE (verified at handoff)

- 117 source files, 32 pages, 5 API routes, 25 migrations, 44+ tables, 76+ RLS policies.
- Zero real TypeScript errors (the ~600 tsc shows in a bare checkout are all
  missing-`node_modules` noise — they vanish after `npm install`).
- **Has NEVER run against live Supabase/Stripe.** All prior verification is static.
- Two unit-tested cores: `src/lib/matching/engine.ts`, `src/lib/stripe/escrow.ts`.
- Prompts 1–5 are substantially complete in-chat. Remaining work is (a) first-run
  fixes, (b) live infra setup, (c) the optional features in the TODO below.

---

## ⛳ THE TODO LIST — do these IN ORDER

### TASK 0 — Bring the project up (BLOCKING, do first)
- [ ] `npm install`
- [ ] `npx tsc --noEmit` — expect clean (or fix only genuine errors)
- [ ] `npm run lint`
- [ ] `npm run build` — **this WILL likely surface real errors** the sandbox could
      not catch (Next 15 stricter on async `params`/`searchParams`, server/client
      boundaries). Fix EXACTLY what it reports; do not refactor broadly. Re-run until green.
- [ ] Commit: "chore: first successful build + fixes"
**Stop-check:** do not proceed until `npm run build` succeeds.

### TASK 1 — Live Supabase (needs human for project creation + keys)
- [ ] Human creates Supabase project (region eu-west-2) and provides URL + anon +
      service_role keys. (You cannot do this step — request the keys.)
- [ ] Run migrations 0001 → 0025 in order via the SQL editor or `supabase db push`.
- [ ] Verify: `select count(*) from expertise_taxonomy;` → ~233 rows.
- [ ] Confirm Realtime is enabled (Database → Replication) for messages,
      notifications, board_cards/columns.
- [ ] Populate `.env.local` from `.env.example`.
**Stop-check:** `npm run dev` boots, sign-up works, the Find-matches flow returns
candidates against a seeded expert.

### TASK 2 — Live Stripe test mode (needs human for account + CLI login)
- [ ] Human enables Stripe Connect (test mode), provides `sk_test_…`.
- [ ] `stripe listen --forward-to localhost:3000/api/stripe/webhook`; put the
      `whsec_…` into `STRIPE_WEBHOOK_SECRET`.
- [ ] Test fund → submit → release with test card 4242…; confirm `ledger_entries`
      gets fund/fee/transfer rows and the Company Resource split is correct.
- [ ] Confirm release is idempotent (can't release twice).
**Stop-check:** full money flow works in test mode.

### TASK 3 — Verify the security model holds against live DB
- [ ] Confirm a normal user CANNOT update their own `trust_score`,
      `verification_status`, account `status` (triggers in 0016/0017 silently revert).
- [ ] Confirm `ledger_entries` is append-only for non-service writers.
- [ ] Confirm proposal price is locked after submission.

### TASK 4 — Platform Operations Centre (PRIORITISE — owner's internal OS)
The internal command system for Joe + future internal team. Layer 1 is built
(role system, /platform route, Executive Dashboard, Liquidity Score, internal
notes/audit/CRM tables). Continue in layer order — see ROADMAP.md "Platform
Operations Centre" section for the module list and the original spec in
BUILD_PROMPTS.md ("PLATFORM OPERATIONS CENTRE").
- [ ] Seed first owner: insert into platform_team_members (account_id, role)
      select id, 'platform_owner' from accounts where email='joe@mindlabs.je';
- [ ] Layer 2: Revenue, Payments, Marketplace Health, Compliance dashboards;
      CRM pipeline UI; internal team management; internal-notes component.
- [ ] Layer 3: Expertise intelligence, Workforce capacity, Geographic, Growth
      funnel dashboards; audited data exports.
- [ ] Layer 4: AI/Matching dashboard, BI event stream, System health.
RULES: every /platform page calls requirePlatform('<module>'); every sensitive
action calls auditLog(...) from src/lib/platform/access.ts; respect the
MODULE_ACCESS role matrix; the owner role can never be restricted by other staff.

### TASK 5 — Optional features (only after 0–3 are solid; do in priority order)
1. [ ] CV upload as PDF (currently paste-text only). Add file upload → text
       extraction → feed existing `extractExpertiseFromText`. Keep it keyword-based;
       do NOT add an AI dependency (see PROMPT 5 Phase 8 — prepare data, not AI).
2. [ ] Capability search showing TEAMS/consultancies (needs a `teams` table; design
       it mirroring `profile_expertise` so matching reuses the same engine).
3. [ ] Versioned `engagement_terms` editor + 3-party (employer) acceptance +
       fund-gating (table `engagement_terms` already exists from migration 0019).
4. [ ] Capacity booking → optionally auto-create an engagement on confirmation.
5. [ ] Continue seeding `expertise_taxonomy` toward Stage 1 (1,000 records) via
       curated SQL inserts — follow the pattern in 0021/0025 (name, slug, type,
       scores, industry_relevance_note; `on conflict (slug) do nothing`).
6. [ ] Admin: dispute detail page, Stripe object reference viewer, richer
       flagged-messages page (recipient/severity/repeat-offender/notes).
7. [ ] Find/replace `bg-white` → `bg-surface` on cards in public pages (cosmetic
       dark-mode fix; ~26 files — review each, some are intentional).

### TASK 5 — Deploy
- [ ] Push to GitHub (private repo Mindlabsjersey/sekondment-v1).
- [ ] Vercel import; add env vars (test keys for staging, live keys only when ready).
- [ ] Add production Stripe webhook → its secret into Vercel env.

---

## ARCHITECTURE MAP (so you don't hunt)
- Routes: `src/app/**`. `(app)` = authed, `(auth)` = auth, `browse` = public teaser.
- Server actions: colocated `actions.ts` / `*-actions.ts` next to routes.
- API: `src/app/api/**` (Stripe webhook/connect, milestone fund/submit/release).
- Shared logic: `src/lib/**`. Key files:
  - `matching/engine.ts` (scoring, unit-tested), `matching/upgrade.ts` (proof on completion)
  - `stripe/escrow.ts` (split math, lowercases currency for Stripe — unit-tested)
  - `compliance/log.ts`, `notifications/create.ts`, `currency.ts`, `industry.ts`
- Expertise graph: migrations 0020 (schema), 0021 (seed), 0023 (enum types),
  0024 (proof dims + demand stats + `expertise_intelligence` view), 0025 (expansion).
- Admin pages: disputes, verification, flagged, ledger, users, compliance, activity,
  expertise (intelligence), analytics.

## DEFINITION OF DONE for any task you take
1. `npx tsc --noEmit` clean. 2. `npm run build` succeeds. 3. The core loop still
works. 4. No secret committed. 5. ROADMAP.md checkbox updated. 6. Migrations (if any)
run in order without error and are idempotent where possible.
