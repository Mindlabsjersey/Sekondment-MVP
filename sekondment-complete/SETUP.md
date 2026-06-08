# Sekondment — Setup & Launch Runbook

## WHO DOES WHAT (read this first)
This runbook is followed by an AI agent (Devin, Claude Code, etc.) **plus you**.
Split of responsibilities:

**The agent can do automatically (approve its commands):**
- `npm install`, type-check, lint, `npm run build`, and fixing the build errors
- editing/creating code files, running git, building the remaining features

**Only YOU can do (the agent cannot log into your accounts):**
- Create the Supabase project; copy its URL + anon + service_role keys
- Run the migrations in the Supabase SQL editor (or `supabase db push` after *you* log in the CLI)
- Create the Stripe account, enable Connect, run `stripe login` (browser auth)
- Paste secret keys into `.env.local`
- Connect the repo to Vercel and add env vars in the Vercel dashboard

So: the agent handles all the **code**; you handle the **accounts, keys, and dashboards**.
When the agent hits a step it can't do, it will tell you — and this doc says exactly what to click.

> Devin note: Devin can run longer autonomous sequences than a command-by-command
> tool, but it still cannot access your Supabase/Stripe/Vercel accounts. Hand it
> Phase 0 freely; pair with it on Phases 1–6.

---

**Purpose:** This is the single source of truth for getting Sekondment running on a
desktop (macOS / Windows / Linux) with live Supabase + Stripe. Work through it
**top to bottom**. Each phase has a clear done-check. If a step fails, fix it
before moving on. Intended to be handed to Claude Code in VS Code / Windsurf and
executed semi-automatically.

> Context: the codebase was built and static-checked in a sandbox but has **never
> run against live infrastructure**. So expect a few real issues to surface on
> first `npm run build` and first live DB connection — that is normal and is
> exactly what Phase 0/1 are for.

---

## PHASE 0 — Local build health

Prereqs: **Node 20 LTS** (`node -v` → v20.x), npm, git.

```bash
# 1. Install dependencies
npm install

# 2. Type-check (will surface any real errors that the sandbox could not catch
#    because node_modules/React types weren't installed there)
npx tsc --noEmit

# 3. Lint
npm run lint

# 4. Build (the real test — Next.js compiles every route)
npm run build
```

**Done-check:** `npm run build` completes with no errors.

**Likely first-run fixes (do these as they appear):**
- Any leftover `bg-white` / hardcoded colours that should be `bg-surface` — cosmetic, fix later.
- If a server action import path breaks, correct the relative path.
- If `next build` complains about a missing `'use client'` or async/await in a
  component, add/adjust as indicated by the error.
- Do **not** mass-refactor. Fix exactly what the build reports, re-run, repeat.

---

## PHASE 1 — Supabase project + schema

1. Create a project at supabase.com (region: London `eu-west-2`). Save the DB password.
2. **Run migrations in order, 0001 → 0022.** In the Supabase SQL editor, paste and
   run each file from `supabase/migrations/` **in filename order**. Order matters:
   - 0005 adds the `employer_partner` enum value used by 0006.
   - 0015 adds the `releasing` milestone enum value used by the release route.
   - 0020 creates the expertise schema that 0021 seeds and 0022 references.
   > ⚠️ Do NOT use `sekondment_master_schema.sql` in the repo root — it is STALE
   > (predates migrations 0009–0022). Use the numbered migrations only. Consider
   > deleting the stale file to avoid confusion.
3. Confirm tables exist: Supabase → Table editor. You should see ~37 tables
   including `expertise_taxonomy`, `capacity_profiles`, `compliance_events`.
4. Confirm the seed ran: `select count(*) from expertise_taxonomy;` → ~85 rows.
5. Settings → API → copy: Project URL, `anon` public key, `service_role` secret key.

**Done-check:** all migrations applied, no SQL errors, taxonomy seeded.

---

## PHASE 2 — Environment variables

Copy `.env.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=        # from Supabase API settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # anon public key
SUPABASE_SERVICE_ROLE_KEY=       # service_role secret (server-only, NEVER public)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STRIPE_SECRET_KEY=               # Stripe test-mode secret (sk_test_…) — Phase 4
STRIPE_WEBHOOK_SECRET=           # from `stripe listen` — Phase 4
RESEND_API_KEY=                  # optional; leave blank and email safely no-ops
```

`.env.local` is gitignored — never commit it.

**Done-check:** `npm run dev` boots, homepage loads at localhost:3000.

---

## PHASE 3 — Auth + core flow smoke test (Supabase only, no Stripe yet)

In Supabase → Auth, ensure email signups are enabled (disable email confirmation
for faster local testing, or use the magic-link).

Walk the flow in the browser:
1. Sign up as a **business** → onboard → it should land on /dashboard.
2. Sign up (incognito) as an **expert** → onboard → add structured expertise in
   Settings (search "Stripe", add it).
3. Business posts an opportunity → add required expertise → tap **Find matches**
   → the expert should appear with a score + reasons.
4. Expert submits a proposal → business accepts → engagement is created.

**Done-check:** the post → propose → accept → engagement chain works end to end on
live Supabase. Messaging, notification bell, and the project board rely on Supabase
**Realtime** — confirm Realtime is enabled (the migrations add tables to the
`supabase_realtime` publication; verify under Database → Replication).

---

## PHASE 4 — Stripe Connect (test mode)

1. Stripe dashboard → test mode. Enable **Connect**.
2. Put `sk_test_…` in `STRIPE_SECRET_KEY`.
3. Local webhooks: install Stripe CLI, then:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`, restart `npm run dev`.
4. As the expert/payee, complete Stripe Connect onboarding (Settings → Payments).
5. Test the money flow with Stripe test cards (4242 4242 4242 4242):
   - Business funds a milestone → check `ledger_entries` gets a `fund` row.
   - Expert submits work → business releases → check a Stripe **transfer** is
     created and `ledger_entries` gets `fee` + `transfer_*` rows.
   - Confirm the milestone can't be released twice (the route uses an atomic
     `submitted → releasing` claim).
   - Test a refund and a dispute resolution.

**Done-check:** full fund → submit → release flow works in Stripe test mode;
ledger reflects every movement; platform fee + any Company Resource split correct.

---

## PHASE 5 — Regenerate Supabase types (optional but recommended)

```bash
npx supabase login
npx supabase gen types typescript --project-id <your-project-ref> > src/lib/types/supabase.ts
```
Then tighten the `any`-typed query results where helpful. Not required to run, but
removes a class of silent bugs.

---

## PHASE 6 — Deploy (Vercel)

1. Push to GitHub (already a private repo: github.com/Mindlabsjersey/sekondment-v1).
2. Vercel → Import the repo. Framework auto-detected (Next.js).
3. Add the **same env vars** from `.env.local` (use the **production** Supabase keys
   and **live** Stripe keys only when you're ready to go live; keep test keys for staging).
4. Set `NEXT_PUBLIC_SITE_URL` to the Vercel URL.
5. In Stripe, add a **production webhook** pointing at
   `https://<your-domain>/api/stripe/webhook` and put its secret in Vercel env.
6. Deploy.

**Done-check:** the Vercel URL loads, sign-up works, a test engagement completes.

---

## What to verify against the security model (Prompt 2 hardening)

After live DB is up, confirm RLS actually blocks these (try via the Supabase SQL
editor as an authenticated non-service user, or trust the triggers in 0016/0017):
- A user **cannot** UPDATE their own `trust_score`, `verification_status`, or
  account `status` (guarded by triggers — non-service writes are silently reverted).
- `ledger_entries` is **append-only** (update/delete blocked for non-service).
- Proposal price/terms **locked** after submission.
- Milestone release is **idempotent** (atomic claim).

---

## Known deferred / optional work (see ROADMAP.md for the live list)
- CV upload → suggested expertise tags (extraction)
- Richer versioned `engagement_terms` editor + employer (3-party) acceptance + fund-gating
- Admin extras: dispute detail page, activity event viewer, Stripe object reference viewer
- Capacity bookings → auto-create engagements (currently a booking request)
- Surface proven-expertise badges on public expert profiles

## File-location reminders
- Migrations: `supabase/migrations/0001…0022` (run in order)
- Server actions: colocated as `actions.ts` / `*-actions.ts` next to their routes
- Matching engine (unit-tested): `src/lib/matching/engine.ts`
- Escrow split (unit-tested): `src/lib/stripe/escrow.ts`
- Currency: `src/lib/currency.ts` · Industry theming: `src/lib/industry.ts`
- Compliance log: `src/lib/compliance/log.ts`
