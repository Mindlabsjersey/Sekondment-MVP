# AGENTS.md — Sekondment

This file orients any AI coding agent (Devin, Claude Code, Cursor, etc.) working on
this project. **Read SETUP.md and ROADMAP.md before doing anything.**

> **If you are Devin (or any autonomous agent):** your ordered task list with
> guardrails and stop-checks is in **DEVIN.md** — follow that. This file is the
> high-level orientation; DEVIN.md is the step-by-step track.

## What this is
Sekondment — a global-ready B2B workforce-capacity & expertise marketplace.
Tagline: "Deploy expertise, not headcount." Built in Next.js 15 / TypeScript /
Supabase / Stripe Connect / Tailwind / Vercel. Jersey is the first test market but
**nothing is Jersey-hardcoded** — it is global from day one.

## Your first job on opening this project
The code was built in a sandbox and has **never run against live infrastructure**.
Do **not** assume it boots. Follow **SETUP.md** phase by phase:
1. `npm install` → `npx tsc --noEmit` → `npm run lint` → `npm run build`
2. Fix exactly the errors the build reports (don't mass-refactor).
3. Create the Supabase project, run migrations `0001 → 0022` in order.
4. Fill `.env.local` from `.env.example`.
5. `npm run dev`, smoke-test the core flow.
6. Wire Stripe test mode, test the money flow.

## Hard rules (do not break these)
- **Do not rebuild the stack** or swap core libraries.
- **Do not remove or break working flows**, especially the core loop:
  post opportunity → propose → accept → engagement → fund milestone (escrow) →
  submit work → release (with Company Resource split) → reviews → disputes.
- **Run migrations in filename order.** 0005 (enum), 0015 (enum), 0020 (expertise
  schema before 0021 seed) are order-sensitive.
- **Never commit `.env.local`** or any secret. `service_role` key is server-only.
- The **stale** `sekondment_master_schema.sql` in the repo root must NOT be used —
  use the numbered migrations. Safe to delete it.

## Careful-language rule (legal)
Allowed: milestone funding, payment protection, funds held until approval,
escrow-**style** flow, platform-facilitated engagement, agreement acceptance.
Never claim: regulated escrow, guaranteed legal compliance, Sekondment employs the
worker, Sekondment owns the job, Sekondment is the legal employer.

## Architecture quick map
- Routes: `src/app/**` (App Router). `(app)` = authed, `(auth)` = auth, `browse` = public.
- Server actions colocated as `actions.ts` / `*-actions.ts`.
- API routes: `src/app/api/**` (Stripe webhook/connect, milestone fund/submit/release).
- Reusable logic in `src/lib/**`. Two unit-tested cores:
  - `src/lib/matching/engine.ts` (expertise match scoring)
  - `src/lib/stripe/escrow.ts` (split math)
- Account types: business, expert, employer_partner, admin.

## Security model (already implemented — verify, don't rebuild)
RLS + column-guard triggers (migrations 0016/0017) prevent users editing
trust_score, verification flags, account status/type, Stripe fields, ledger
(append-only), and proposal price after submission. Milestone release is idempotent.

## Where to find the plan
- **BUILD_PROMPTS.md** — the 5 original prompts verbatim (full intent + acceptance criteria).
- **HANDOFF.md** — full context to resume the build (read this first).
- **SETUP.md** — the step-by-step launch runbook (follow this).
- **ROADMAP.md** — what's done vs outstanding (update checkboxes as you go).
- **BUILD_MANIFEST.md** — full feature/route/table inventory.

## Style
Royal blue (#1d4ed8) + gold (#c8a24a), light/dark via CSS-variable Tailwind tokens
(`bg-paper`, `text-ink`, `bg-moss`=blue, `bg-sand`=gold). Per-industry accent via
`data-industry`. Fraunces (serif) + Spline Sans. Keep formatting minimal & mobile-first.
