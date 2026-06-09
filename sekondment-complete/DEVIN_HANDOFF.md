# DEVIN HANDOFF — Sekondment (read this first)

Single entry point for taking Sekondment forward in Devin. Everything built,
every change, the migration situation, and the exact order to proceed.

---

## 0. The one thing to understand first

There are **two versions of this codebase** that have diverged:

- **Your live repo (built via Cascade/Windsurf on your machine):** first green build,
  live Supabase, migrations through **0028** (Cascade added 0028 = a ledger-idempotency
  fix), Vitest tests, Next.js security bump. **This is the source of truth.**
- **Claude's working copy (this package):** an earlier snapshot PLUS a lot of additive
  new features (migrations 0030/0031/0032, the full Operations Centre, commission system,
  concierge, CV upload, team search, exports). Claude never received Cascade's 0028.

**So: your live repo is canonical. This package layers ON TOP of it.** Almost everything
here is new files (safe to drop in). A few edits touch existing money-path files — those
are listed in MERGE_CHECKLIST.md and must be reviewed, not blind-pasted.

**First action in Devin:** push your live repo to GitHub so there's one source of truth,
then apply this package's additions using MERGE_CHECKLIST.md.

---

## 1. Where to read what

1. **CURRENT_STATE.md** — accurate inventory + strategy + hard rules. The canonical reference.
2. **MERGE_CHECKLIST.md** — what's safe to drop in vs what needs review (money path).
3. **THIS FILE** — order of operations + what's new.
4. **BUILD_LOG.md** — dated journal of every change (append-only; keep it going).
5. **KNOWN_GAPS.md** — what's verified vs unverified vs not-built.
6. **INJECT_EXPERTISE.md** — the research-backed expertise data (migration 0030).
7. **EXPERTISE_STRATEGIC_BRIEF.md** — which industries/roles this serves and why.
8. Ignore older counts in MASTER_PLAN/BUILD_MANIFEST/ROADMAP (they carry "see
   CURRENT_STATE.md" banners) — useful for strategy/detail, stale on inventory.

---

## 2. What's new in this package (everything Claude added)

### Operations Centre — internal command system at /platform (18 pages)
Separate from and more powerful than admin. Role-gated (platform_owner/director/
operations/compliance/finance/marketplace/support), audit-logged.
- Executive (+ Marketplace Liquidity Score), Revenue, Payments, Commission,
  Marketplace Health, Delivery reports, CRM (+ add-leads), Concierge queue,
  Geographic, Growth funnel, Compliance, Trust, Expertise intelligence, Capacity,
  Team, Audit logs, Exports (CSV), System health.
- Migrations 0026 (role enum, isolated) + 0027 (team/notes/audit/CRM/tasks tables).

### Configurable commission (migration 0031)
- Site-wide default + per-company override; presets 15 / 12.5 / 10.
- Snapshotted onto each engagement at creation (locked — in-flight deals never change).
- computeSplit takes optional feePct (backward-compatible; default 15).
- ⚠ MONEY PATH — touches escrow.ts, engagements/actions.ts, release route. See checklist.

### Research-backed expertise (migration 0030)
- 62 expertise records across 14 sectors (AI/data, cyber, fractional leadership,
  energy/ESG, healthcare, defence, etc.) with commercial-value / AI-resistance /
  demand scores. ON CONFLICT DO NOTHING — safe.

### Cold-start "want" features
- AI Project Builder promoted to the business dashboard front door.
- Concierge matching (migration 0032): business clicks "find talent for me" → lands in
  /platform/concierge with a 24h guarantee → founder sources manually. This is your
  founder-led GTM tool.

### CV intelligence
- CV file upload (PDF/Word/text) → extracts expertise, seniority, years, jurisdictions,
  languages, certifications AND achievements/milestones. Feeds the proven/verified profile.

### Team capability search (/teams)
- Businesses find employer-partner teams by their combined expertise, not just individuals.

### Data exports (/api/platform/export)
- CSV downloads (revenue/CRM/audit/expertise), role-gated, audit-logged. BI-ready.

### Demo seed (scripts/seed-demo.mjs)
- Populates a live DB with 8 experts, 4 businesses, 5 opportunities, a completed
  engagement + ledger + review, CRM leads — so dashboards & matching have data to show.

### Design system (prototypes/_design-system.ts)
- Golden-ratio spacing + type scale + primitives, so UI is consistent.

---

## 3. Migration situation (IMPORTANT)

Your live repo: 0001→0028. This package adds **0030, 0031, 0032** (and 0026/0027 for
the Ops Centre — check if your repo already has these from earlier Claude work).

Apply order after your live 0028:
- 0026 (platform_role enum — ISOLATED, own transaction) — if not already applied
- 0027 (Ops Centre tables) — if not already applied
- 0030 (research taxonomy — safe, ON CONFLICT DO NOTHING)
- 0031 (configurable commission)
- 0032 (concierge)

Enum-only files that must run isolated: 0005, 0015, 0023, 0026.
There is no 0029 in this package (Claude renamed to 0030 to avoid colliding with any
0029 you may have). Confirm your sequence has no number clash before applying.

---

## 4. Exact order of operations in Devin

1. Push live repo to GitHub (establish source of truth).
2. Apply this package's new files (per MERGE_CHECKLIST.md "SAFE" list).
3. Review + apply the money-path edits (MERGE_CHECKLIST.md "REVIEW" list).
4. Apply migrations 0026/0027 (if missing) → 0030 → 0031 → 0032, in order.
5. `npm run build` — must stay green. Fix anything it reports.
6. Run existing Vitest suite — must still pass (commission change is backward-compatible).
7. Seed first platform owner:
   `insert into platform_team_members (account_id, role) select id,'platform_owner' from accounts where email='joe@mindlabs.je';`
   (Joe signs up first so the account exists.)
8. Optional: `node scripts/seed-demo.mjs` to populate demo data.
9. THE REAL MILESTONE — verify live (none of the new features have run against live
   infra): full core loop, Ops Centre dashboards render, commission change reflects on a
   NEW engagement, concierge request lands in the queue, CV upload extracts, exports
   download. Log results in BUILD_LOG.md, move items to RESOLVED in KNOWN_GAPS.md.

---

## 5. What's genuinely left (from KNOWN_GAPS.md)

- **VERIFY (priority):** every new feature is built but never run live. First Devin run
  is the real test.
- **Stripe:** not finalised — Joe may swap it. Money path is isolated (computeSplit is
  pure arithmetic; Stripe only in execution layer) so it's swappable. System Health page
  treats Stripe as optional.
- **MINOR UI:** board card detail modal, full notification centre page, in-chat file
  attachments (partial), internal-notes write UI, team-invite UI, concierge status-update
  from the queue.
- **FUTURE:** full AI (matching/project builder use rule-based foundations now), advisory
  marketplace, subscriptions/paid tiers, native mobile.

---

## 6. Founder-led GTM (Joe's plan)

You are the marketplace until it has liquidity. Sequence:
1. Recruit ~15 experts you know (supply first) — get them on, expertise tagged/verified.
2. Line up 3-5 businesses with a real near-term need.
3. Help them post (use the Project Builder); hand-match an expert from your pool.
   The concierge queue (/platform/concierge) is your tool for this.
4. Make the first ~5 engagements succeed → capture case studies.
5. Use those to pull the next wave, where the platform does more and you do less.

---

## 7. Hard rules (do not violate)

1. Don't rebuild or switch stack. Inspect, extend incrementally.
2. Add migrations; never delete. Enum-only files isolated.
3. Never break the core loop (post→propose→accept→engage→fund→submit→release→review→dispute).
4. Money path authoritative server-side: no self-verify, no editing Trust Score/ledger/
   proposal price, no releasing unfunded, no reviews outside completed engagements.
5. Legal language: "milestone funding / payment protection / escrow-style / held until
   approval" OK; "regulated escrow / Sekondment employs the worker" NOT OK.
6. Keep BUILD_LOG.md + KNOWN_GAPS.md current every session.
7. Treat the live repo as source of truth; this package layers onto it.
