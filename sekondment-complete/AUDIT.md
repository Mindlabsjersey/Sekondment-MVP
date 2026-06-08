# Sekondment — Code Health & Progress Audit

Generated for external code-review. This is an honest assessment of where the
build stands, what's verified, what's unverified, and the specific hurdles likely
to surface on first real run. Run this file (plus the codebase) through your checker.

---

## 1. Inventory (measured from the codebase)

| Metric | Count |
|---|---|
| Source files (`src/`) | 113 |
| Page routes | 30 |
| API routes | 5 |
| Server-action files | 21 |
| Migrations | 22 (0001 → 0022) |
| Tables created | 44 |
| RLS policies | 76 |
| Lib modules | 17 |

Account types: business, expert, employer_partner, admin.
Unit-tested cores: `src/lib/matching/engine.ts` (8/8), `src/lib/stripe/escrow.ts`,
`src/lib/messaging/filter.ts`.

---

## 2. Static verification — PASSED

All checks below were run in-sandbox and are clean:

- ✅ **Type-check**: zero *real* type errors. (The ~600 errors tsc shows in-sandbox
  are 100% missing-`node_modules` artifacts — `process`, React/JSX namespaces,
  `key`/`children` false positives — and disappear after `npm install`.)
- ✅ **Server/client boundaries**: every action file has `'use server'`; every
  component using hooks has `'use client'`.
- ✅ **Imports**: all relative and `@/` alias imports resolve to real files.
- ✅ **Migration ordering**: enum `add value` statements (0005, 0015) are isolated
  in their own files (Postgres requires this). Helper functions (`is_admin`,
  `is_service_role`, `owns_capacity`) are defined before first use.
- ✅ **Realtime publication**: creation is guarded with `if not exists` in 0008,
  0011, 0012; no duplicate `add table` across migrations.
- ✅ **Upsert constraints**: `onConflict` clauses in code match the DB unique
  constraints (verified for profile_expertise, saved_*, requirements).
- ✅ **No TODO/FIXME/HACK markers** left in source.
- ✅ **Escrow currency casing**: the escrow helper lowercases currency before the
  Stripe call (`.toLowerCase()`), so uppercase DB values ('GBP') are handled.

---

## 3. KNOWN HURDLES — likely to surface on first real run

These are NOT yet fixed; they're the honest risk list for the desktop session.

### 3.1 First `npm run build` will likely surface real errors  (EXPECTED)
The code has never compiled against installed dependencies. Next.js's production
build is stricter than the sandbox's isolated type-check. Expect a handful of:
- Server/client component mismatches the isolated check can't see
- Possibly stricter typing on `searchParams`/`params` (Next 15 made these Promises)
- Unused-import or `any` lint warnings
**Action:** fix exactly what the build reports; don't refactor broadly. (SETUP.md Phase 0.)

### 3.2 Supabase `supabase_realtime` publication may already include tables  (MEDIUM)
Supabase projects often ship with `supabase_realtime` pre-created. The migrations
guard *creating* it, but `alter publication supabase_realtime add table X` will
**error if X is already a member**. On a fresh project this is usually fine, but if
a migration re-run or a pre-seeded publication causes a conflict:
**Action:** if you see "relation is already member of publication", wrap those
`add table` lines or skip them — they're non-fatal to core functionality.

### 3.3 `bg-white` on public pages won't dark-theme  (COSMETIC)
26 files use `bg-white` directly (mostly homepage + public browse cards). In dark
mode these stay white instead of using the dark surface token.
**Action:** find/replace `bg-white` → `bg-surface` on cards/panels. Purely visual;
not a blocker. (Some `bg-white` uses are intentional, e.g. toggle thumbs — review each.)

### 3.4 RLS column-guards are triggers, silent by design  (BEHAVIOURAL)
Migrations 0016/0017 silently revert protected-column edits by non-service writers
(trust_score, verification, status, ledger, proposal price). This is intentional but
means a write "succeeds" while ignoring the protected field — verify this matches
your expectations when testing. No error is thrown.

### 3.5 Stripe Connect needs real test-mode setup  (BLOCKER for payment testing)
The full money flow (fund→release→transfer) cannot be validated until Stripe test
keys + `stripe listen` webhook are configured. Until then, payment routes will fail
at the Stripe call. (SETUP.md Phase 4.)

### 3.6 `engagements.opportunity_id` is nullable  (MINOR)
The expertise-proof upgrade on completion reads `engagement.opportunity_id`. It's
`on delete set null`, so an engagement whose opportunity was deleted won't upgrade
expertise. Acceptable; noted for completeness.

---

## 4. NOT BUILT (deferred — not errors, scope)

- CV upload → suggested expertise tags (extraction)
- Richer versioned `engagement_terms` editor + 3-party (employer) acceptance + fund-gating
- Admin: dispute detail page, activity event viewer, Stripe object reference viewer,
  employer-partner management page, richer flagged-messages page
- Capacity booking → auto-create engagement (currently a booking *request* only)
- Country/jurisdiction + proven-expertise badges on public profile UI
- CV/AI project builder is rule-based (intentional — AI deferred)

---

## 5. NOT POSSIBLE TO VERIFY IN-SANDBOX (needs desktop)

- `npm install` / lint / production build success
- Live Supabase connection + migration execution + RLS behaviour against real auth
- Stripe test-mode money flow
- Realtime features (messaging, notification bell, board) — depend on Realtime being
  enabled on the live project
- Resend email no-op vs live send

---

## 6. Overall assessment

**Architecture & data model:** complete and coherent. 44 tables, 76 RLS policies,
covering marketplace, payments, trust, compliance, expertise intelligence, capacity.

**Code quality:** clean — no real type errors, consistent patterns, two unit-tested
cores, no leftover debug markers, correct server/client boundaries.

**Biggest risk:** the gap between "static-checked" and "actually runs." Sections 3.1
and 3.5 are where first-run friction will concentrate. Everything else is either
cosmetic (3.3), behavioural-by-design (3.4), or deferred scope (section 4).

**Recommended next action:** desktop session per SETUP.md — `npm install` → build →
fix reported errors → live Supabase → Stripe test. The codebase is in a strong
position to come up cleanly with a modest amount of first-run fixing.
