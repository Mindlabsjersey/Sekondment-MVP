# KNOWN_GAPS.md — running list of what's missing / unverified

**RULE FOR ALL AGENTS:** Keep this current. When you verify something works live,
move it to "RESOLVED" with a date. When you find something new, add it. This is the
honest "what could still bite us" list. Distinguish:
- **[BLOCKER]** must work for MVP
- **[VERIFY]** built but never run live — confirm it actually works
- **[GAP]** genuinely not built yet
- **[COSMETIC]** visual / polish

---

## VERIFY — built in code, never run live (confirm on localhost)
- [VERIFY] CV file upload (PDF/Word/text) + achievements extraction — built, confirm live.
- [VERIFY] Concierge matching (/platform/concierge + business button) — confirm flow live.
- [VERIFY] Configurable commission (site + per-company, locked per engagement) — confirm a
  new engagement picks up the rate and old ones keep theirs.
- [VERIFY] Data exports (CSV) + team capability search (/teams) — confirm live.
- [VERIFY] Ops Centre — all 18 pages render with data once seeded.
- [VERIFY] **Dark mode** — fully implemented (ThemeToggle flips `.dark` on <html>;
  globals.css defines :root + .dark tokens; Tailwind maps bg-paper/text-ink to them;
  darkMode:'class'). Looked "missing" only because the app had never run. Confirm the
  🌙/☀️ toggle (top-right, app shell + public header) visibly switches themes.
- [VERIFY] **Realtime** — messages, notifications, board_cards/columns added to
  supabase_realtime publication (0008/0011/0012) with replica identity full. Confirm
  Realtime is enabled on the project and live updates work in two windows.
- [VERIFY] **Storage uploads** — buckets `engagement-files` (0012) and
  `verification-docs` (0019) are created by migrations with RLS policies. Confirm
  uploads succeed and non-parties are blocked.
- [VERIFY] **Stripe Connect onboarding** — expert payout setup redirect; needs live
  test keys. Confirm fund -> submit -> release -> transfer end to end.
- [VERIFY] **Industry accent themes** — `data-industry` attribute swaps accent vars;
  confirm it visibly applies on industry-tagged pages.
- [VERIFY] **Mobile layout** — responsive classes used throughout; never viewed on a
  real device. Confirm key pages (dashboard, opportunity, engagement) on mobile.

## GAP — not built yet (tracked, not MVP-blocking unless noted)
- [GAP] Platform Operations Centre Layers 2-4 (Revenue/Payments/Marketplace/
  Compliance/Capacity/Geographic/Growth/AI dashboards, CRM UI, team mgmt, exports,
  system health). Layer 1 only is built. See DEVIN.md Task 4 + ROADMAP.
- [GAP] Real CV PDF parsing (currently paste-text keyword extraction; AI deferred).
- [GAP] Capability search showing teams/consultancies (individuals + employer
  resources only; needs a teams table).
- [GAP] Versioned engagement_terms editor + 3-party employer acceptance + fund-gating.
- [GAP] Capacity booking -> auto-create engagement (currently a booking request).
- [GAP] Taxonomy at scale (~233 seeded; target 1k->5k->20k is ongoing data-ops).

## COSMETIC
- [COSMETIC] ~26 files use `bg-white` directly on public pages — won't flip in dark
  mode. Find/replace to `bg-surface` (review each; some are intentional).

## EMAIL (expected behaviour, not a bug)
- Email no-ops without RESEND_API_KEY. "No emails arrive" is expected until a key is
  set; don't hunt for a failure that isn't there.

---

## RESOLVED
- [RESOLVED] Demo/seed data — `scripts/seed-demo.mjs` creates 8 experts (with
  structured expertise), 4 businesses, 5 opportunities, 1 completed engagement with
  ledger+review, and CRM leads. Run after migrations to populate every dashboard.
- [RESOLVED 2026-06 Cascade] First production build compiles (was never compiling).
- [RESOLVED 2026-06 Cascade] next CVE-2025-66478 — bumped to 15.5.19.
- [RESOLVED 2026-06 Cascade] Duplicate 'fund' ledger row on webhook redelivery —
  migration 0028 (unique index + upsert). Confirmed correct by Claude review.
- [RESOLVED 2026-06 Cascade] fund route RLS-denied on milestones — now writes
  payment_intent_id via service client.
- [RESOLVED 2026-06 Cascade] No test runner — added Vitest + 20 unit tests (pass).
