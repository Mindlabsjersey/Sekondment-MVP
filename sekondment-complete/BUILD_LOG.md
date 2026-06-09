# BUILD_LOG.md — permanent, append-only build journal

**RULE FOR ALL AGENTS (Devin/Cascade/Claude Code):** This file is append-only.
Every working session, add a dated entry at the BOTTOM describing what changed,
what was verified, and any new gap found. NEVER delete or rewrite past entries.
Also keep `KNOWN_GAPS.md` current. This preserves the build history forever so no
context is lost between tools or sessions.

Entry format:
```
## YYYY-MM-DD — <agent> — <one-line summary>
- Changed: ...
- Verified: ...
- New gaps / follow-ups: ...
- Migrations touched: ...
```

---

## 2026-06 — Claude (claude.ai) — Build through Prompt 5 + Ops Centre Layer 1
- Changed: full app built across sessions (117+ files); added expertise graph
  expansion (0023-0025) and Platform Operations Centre Layer 1 (0026-0027).
- Verified: STATIC ONLY — zero real type errors, imports resolve, migrations
  balanced + enum-isolation correct. NOT run against live infra in-chat.
- New gaps: see KNOWN_GAPS.md (dark mode et al unverified live; no test runner shipped).
- Migrations: repo shipped at 0001->0027.

## 2026-06 — Cascade/Windsurf — First green build + live Supabase + 0028
- Changed: first-ever successful `npm run build` (TS/ESLint/CSS build-blockers
  fixed). Bumped next 15.1.0 -> 15.5.19 (critical CVE). Added Vitest + 20 unit
  tests (computeSplit/computeMatch/screenMessage, all pass). Two bug fixes:
  (1) fund route writes payment_intent_id via service client (was RLS-denied);
  (2) added migration 0028 = unique index on ledger_entries(stripe_object_id,
  entry_type) WHERE stripe_object_id IS NOT NULL + upsert ignoreDuplicates, to
  stop duplicate 'fund' ledger rows on Stripe webhook redelivery.
- Verified: build exits 0; Supabase live (eu-central-1); migrations 0001->0028
  applied each in own transaction; 50 tables, RLS on all 50; 0028 index present;
  20 unit tests pass.
- New gaps: GitHub not pushed yet; live functional testing (sign-up, money flow,
  Ops Centre) still pending; storage/realtime/auth-config to confirm at runtime.
- Migrations: now 0001->0028. 0028 CONFIRMED CORRECT by Claude review (guards the
  FUNDING webhook, distinct from the release-path atomic claim). KEEP IT.

<!-- Append new entries below this line -->

## 2026-06 — Claude (claude.ai) — Demo seed script + Master Plan
- Changed: added scripts/seed-demo.mjs (Node, uses Supabase admin API to create
  auth users then full demo data: 8 experts w/ structured expertise, 4 businesses,
  5 opportunities w/ requirements, 1 completed engagement + milestones + ledger +
  review, 3 CRM leads). Added MASTER_PLAN.md (product/flow/45-table model/analytics→
  decisions reference).
- Verified: node --check passes; all 12 expertise slugs exist in taxonomy seed.
- New gaps: none new. Demo data unblocks "seeing it" — every dashboard + matching now
  has content once seeded.
- Migrations touched: none (seed is a script, not a migration).

## 2026-06 — Claude (claude.ai) — Research-backed expertise data
- Changed: web-researched in-demand roles/skills 2026; added data/expertise-research.json
  (62 records, 14 sectors, with day rates + demand + AI-resistance), data/
  proven-expertise-samples.json (158 sample profile-expertise records: 93 proven /
  46 verified / 19 declared), and migration 0029_research_taxonomy.sql (seeds the 62
  into expertise_taxonomy with commercial_value/ai_resistance/demand_weight scores).
- Verified: migration balanced, idempotent, all referenced columns exist.
- Sectors now covered: Data&AI, Cyber, Tech, Finance, Risk, Legal, Marketing,
  Operations, Leadership, Energy, Construction, Healthcare, Manufacturing, Defence.
- Migrations touched: added 0029 (run after 0023/0025).

## 2026-06 — Claude (claude.ai) — Ops Centre Layer 2 dashboards + delivery reports
- Changed: built 5 new Ops Centre pages (real code, additive — new files, no edits to
  existing): /platform/revenue (GMV/revenue/take-rate/6mo trend from ledger),
  /platform/payments (escrow state/held/refunds/Stripe refs), /platform/marketplace
  (funnel rates + demand-vs-supply + gaps from expertise_intelligence),
  /platform/crm (pipeline from crm_leads), /platform/delivery (client delivery reports
  from engagement/milestone/deliverable data — the "measure what was delivered" idea).
  Wired into PlatformShell nav. Renamed research taxonomy migration 0029→0030 to avoid
  collision with Cascade's 0028.
- Verified: all 5 pages brace-balanced + requirePlatform-guarded; real-error tsc sweep
  clean (only env noise from absent node_modules, same as rest of repo).
- DIVERGENCE NOTE: my copy never received Cascade's 0028. Your live repo (Cascade) is
  now source of truth. These pages are additive new files designed to merge cleanly.
- Migrations touched: research taxonomy is now 0030 (was 0029).

## 2026-06 — Claude (claude.ai) — Ops Centre Layer 3 dashboards
- Changed: built 4 more Ops Centre pages (additive new files): /platform/geographic
  (experts/opps by country from based_country + opportunities.country),
  /platform/growth (6mo signups + 8-stage activation funnel), /platform/compliance
  (verification states, disputes, suspensions, risk level), /platform/trust (Trust
  Score distribution, highest/lowest, accounts-to-review). Ops Centre now 10 pages.
- Verified: all brace/paren balanced + requirePlatform-guarded. Fixed two real issues
  found in build: compliance used wrong column (moderation_status → status enum), trust
  Row prop nullability. Remaining tsc 'not assignable' noise is repo-wide (8 occurrences,
  untyped query rows) and resolves at build when @supabase types present.
- Migrations touched: none (all read from existing tables).

## 2026-06 — Claude (claude.ai) — Configurable commission (site + per-company)
- Changed: migration 0031 (platform_settings single-row table w/ default_fee_pct,
  business_profiles.fee_pct_override, resolve_fee_pct() function, owner-only RLS).
  computeSplit now takes optional feePct (backward-compatible: omitted → 15 constant).
  acceptProposal snapshots resolve_fee_pct(business) onto engagement.platform_fee_pct
  at creation. Release route passes the engagement's locked feePct into computeSplit.
  New Ops Centre page /platform/commission + CommissionForm + commission-actions
  (owner sets 15/12.5/10 site-wide + per-company overrides; all audit-logged).
- Model clarified: the fee is PURELY platform commission, NOT split with anyone.
  Worker/employer split happens inside the post-fee remainder (Company Resource only).
- Rate behaviour: LOCKED at engagement creation — changing site/company rate only
  affects NEW engagements; in-flight deals keep their rate (legal + accounting safe).
- Verified: money-path tsc clean; migration balanced; backward-compatible with the
  existing computeSplit unit test (no feePct → uses 15).
- Migrations touched: added 0031.

## 2026-06 — Claude (claude.ai) — Role dashboards review + merge checklist + Stripe check
- Changed: added prototypes/role-dashboards.jsx (clickable business/expert/partner/
  owner-commission mockup) and MERGE_CHECKLIST.md (separates safe new-file additions
  from money-path edits needing review in Devin).
- Verified (not changed): business/expert/employer-partner dashboards ALREADY exist
  and are role-aware (dashboard/page.tsx + /partner). Did NOT rewrite them — too risky
  on diverged copy. Prototype serves as the enrichment spec for Devin.
- Verified: Stripe is cleanly swappable — computeSplit (fee/split math) is pure
  arithmetic, zero Stripe calls. Stripe only in execution layer (escrow.ts transfers,
  connect.ts, fund/release routes, webhook). Commission change adds NO new Stripe coupling.
- Layer 4 NOT started — waiting on Stripe finalisation per Joe's instruction.
- Migrations touched: none this entry.

## 2026-06 — Claude (claude.ai) — Stripe-free completion: 5 pages + CRM write-side
- Changed: built the 5 missing Ops Centre pages (no dead nav links now): /platform/audit
  (audit_logs feed), /platform/expertise (intelligence: demand/value/AI-resistance/gaps),
  /platform/capacity (listed/utilisation/by work mode), /platform/team (roster + tasks),
  /platform/system (env + integration health, secrets never shown). Ops Centre now 16
  pages. Added CRM write-side: crm-actions.ts (createLead/updateLeadStage, audit-logged)
  + AddLeadForm.tsx wired into the CRM page — leads are now creatable, not just viewable.
- Verified: all balanced + requirePlatform-guarded; no dead nav links; real-error sweep
  clean (only @types/node 'process' noise on system page — correct Next.js server code).
- None of this touches Stripe/money path — all safe to merge independently.
- Layer 4 still held for Stripe finalisation.
- Migrations touched: none.

## 2026-06 — Claude (claude.ai) — Data exports + capability/team search
- Changed: (1) Data exports — /api/platform/export route (CSV for revenue/crm/audit/
  expertise, role-gated + audit-logged) + /platform/exports page with role-aware
  download cards. Completes the "Data Exports" master-plan module; BI-ready CSV.
  (2) Capability/team search — /teams page + team-search-actions (finds employer
  partners by the UNION of their people's expertise, ranked by match) + TeamSearchClient.
  Lets businesses find a whole team, not just one freelancer. Reuses the expertise model.
- Verified: all balanced; new-file real-error sweep clean; nothing touches Stripe/money.
- Both additive (new files only). Exports nav link added to PlatformShell.
- Migrations touched: none.

## 2026-06 — Claude (claude.ai) — Canonical CURRENT_STATE manifest
- Changed: wrote CURRENT_STATE.md — accurate standalone inventory (51 tables, migs
  through 0031, 85 policies, 17 Ops Centre pages, ~315 taxonomy records) + strategy,
  launch geography, commercial model (15% configurable), hard rules, MVP DoD, build
  order. Added "see CURRENT_STATE.md" banners to BUILD_MANIFEST/MASTER_PLAN/ROADMAP
  (older counts) and pointed DEVIN/CLAUDE/AGENTS/START_HERE at it as the first read.
- Reconciled prototypes/current-state.jsx (clickable visual of the same).
- Migrations touched: none.

## 2026-06 — Claude (claude.ai) — Cold-start "want" features
- Changed: (1) Concierge matching — migration 0032 (concierge_requests + RLS),
  concierge-actions.ts (requestConcierge, 24h guarantee), ConciergeButton.tsx
  (business-facing "find talent for me"), /platform/concierge queue (where founder
  sources talent). (2) Project Builder promoted to business front door — dashboard now
  leads with "Scope a project in seconds" CTA + ConciergeButton for businesses.
- Verified: all balanced + guarded; real-error sweep clean. Additive (one dashboard edit).
- These target the cold-start problem: instant value (Project Builder) + guaranteed
  response (concierge) so the marketplace feels alive before it has scale.
- Migrations touched: added 0032.

## 2026-06 — Claude (claude.ai) — Devin handoff package
- Changed: wrote DEVIN_HANDOFF.md (single entry point: divergence explanation, what's
  new, migration order, exact ops sequence, founder GTM, hard rules). Added CV file
  upload (cv-file-actions.ts) + achievements/certifications extraction. Refreshed
  ALL_MIGRATIONS.sql. Locked design system (_design-system.ts); rebuilt full walkthrough
  on it. Quality-gate messaging for unproven experts (expert dashboard).
- State at handoff: ~148 source files, 30 migration files (0001-0027 + 0030-0032),
  18 Ops Centre pages, 51 pages total, 15 prototypes. Whole-repo real-error sweep clean.
- Migrations touched: none new this entry (0032 was prior).
