# Sekondment

> **AI agents (Devin / Claude Code / Cursor):** if you are Devin, start with
> **DEVIN.md** (ordered task list + guardrails). Otherwise start with **AGENTS.md**,
> then follow **SETUP.md** phase by phase. **ROADMAP.md** tracks what's done vs
> outstanding. **AUDIT.md** lists known first-run hurdles — read it before the first build.

**Deploy expertise, not headcount.**

A trusted B2B expertise marketplace. Businesses post opportunities; verified experts and
company resources submit proposals; engagements run through milestone-based Stripe escrow with
two-sided reviews and dispute resolution.

The differentiator: the **Company Resource / Employer Partner** model — a business can deploy its
own employed staff through the platform, with payment routing to the employer (plus an optional
commission split to the individual), while the person stays on their employer's payroll.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions, RSC) |
| Language | TypeScript |
| Backend / DB | Supabase (Postgres, Auth, Realtime, Storage, Row Level Security) |
| Payments | Stripe Connect (separate charges & transfers) |
| Styling | Tailwind CSS |
| Hosting | Vercel |

---

## What's built

**Complete user journey (the success metric, end-to-end):**
post opportunity -> expert submits proposal -> business accepts -> engagement created with payee
resolution -> fund into escrow -> expert submits work -> business approves & releases (with split) ->
two-sided reviews -> disputes if needed.

- **Auth** — email + Google + LinkedIn, role selection (business / expert), middleware route protection
- **Onboarding** — business and expert profile forms
- **Opportunities** — create (outcome-first wizard), list, detail
- **Proposals** — submit (price/timeline/cover), shortlist/accept/reject
- **Engagements** — milestone workspace, fund/submit/release, live escrow ledger
- **Stripe** — Connect onboarding, PaymentIntents, Transfers, multi-payee split, webhooks
- **Reviews** — two-sided, category ratings, feeds Trust Score average
- **Disputes** — raise/respond/admin-resolve (release / refund / split, real Stripe money)
- **Messaging** — real-time chat (Supabase Realtime) with anti-circumvention flagging
- **Admin** — dispute resolution queue

**Database:** 21 tables, 36 RLS policies, 8 migrations.

### Not yet built
Expert discovery (wired page — prototype exists), full Trust Score engine, Employer Partner
onboarding/dashboard (prototype exists), admin verification queue + analytics.

### /prototypes
Standalone clickable React/HTML demos on mock data (homepage, discovery, opportunity creation,
engagement/escrow, employer dashboard, unified app, status board). These illustrate UX and are
**not** wired to the backend — useful as reference while wiring real pages.

---

## Project structure

```
src/
  app/
    page.tsx                  homepage
    layout.tsx, globals.css   shell + design system
    (auth)/                   sign-in, sign-up, OAuth callback
    (app)/                    authenticated pages
      dashboard, onboarding, opportunities, engagements,
      messages, settings/payments, admin/disputes
    api/                      stripe webhook/connect, milestone fund/submit/release
  components/AppShell.tsx
  lib/
    supabase/                 browser / server / service clients
    stripe/                   client, escrow (split math), connect
    messaging/filter.ts       anti-circumvention filter
    types/database.ts         typed schema
  middleware.ts
supabase/migrations/          0001-0008
```

---

## Setup guide

### Prerequisites
- **Node.js 18.18+** (20 LTS recommended) — https://nodejs.org
- A **Supabase** account — https://supabase.com
- A **Stripe** account in test mode — https://stripe.com

### 1. Install dependencies
```bash
npm install
```

### 2. Create a Supabase project
1. supabase.com -> New project. Save the database password.
2. Project Settings -> API. Copy: Project URL, `anon` public key, `service_role` key.
3. Apply the schema. Easiest path: open the SQL editor and paste each file in
   `supabase/migrations/` **in order 0001 -> 0008**, running each.
   (Or use the Supabase CLI: `supabase link` then `supabase db push`.)
4. Authentication -> Providers: enable Email, and optionally Google and LinkedIn (LinkedIn uses
   the `linkedin_oidc` provider). Set the redirect URL to
   `http://localhost:3000/auth/callback` for local dev.

### 3. Set up Stripe (test mode)
1. Toggle **Test mode** on in the Stripe dashboard.
2. Developers -> API keys: copy the **Secret key** (`sk_test_...`).
3. Connect -> enable **Connect** (Express accounts).
4. Webhook (local): install the Stripe CLI and run
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   — it prints a `whsec_...` signing secret.

### 4. Environment variables
Copy `.env.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
`.env.local` is gitignored — never commit it.

### 5. Run
```bash
npm run dev          # http://localhost:3000
# in a second terminal, for webhooks:
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 6. Deploy to Vercel
1. Push to GitHub (see below).
2. vercel.com -> New Project -> import the repo.
3. Add the same env vars (use your real Vercel URL for `NEXT_PUBLIC_SITE_URL`).
4. In Stripe, add a production webhook endpoint pointing at
   `https://your-app.vercel.app/api/stripe/webhook` and use that signing secret in Vercel.
5. Update Supabase Auth redirect URLs to include the Vercel domain.

---

## Push to GitHub (no terminal needed to start)
1. github.com -> New repository -> name it `sekondment` -> Private -> Create (don't add a README).
2. On the repo page, use **uploading an existing file**, then drag in the project folder
   contents (the `.gitignore` ensures `node_modules` and secrets are excluded — but double-check
   no `.env.local` is included).
3. Commit. For ongoing work, install GitHub Desktop (desktop.github.com) for a no-terminal
   commit/push workflow, or use `git` once comfortable.

---

## Important notes
- **Escrow wording:** Stripe does not provide regulated escrow accounts. Funds are held on the
  platform balance and released via delayed transfers. Keep "escrow" in marketing, but have a
  lawyer review your Terms before claiming a regulated escrow account.
- **Validation status:** the money math (`lib/stripe/escrow.ts`) and the message filter
  (`lib/messaging/filter.ts`) have passing unit tests. The app has been syntax-checked but not yet
  run against a live Supabase/Stripe — step 5 is where you confirm end-to-end.
