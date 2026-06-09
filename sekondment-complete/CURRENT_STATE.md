# SEKONDMENT — Current State & Direction

The accurate, current picture of the build. Use this as the reference for what
exists, what's left, and where it's going. Inspect the repo to confirm — this
reflects the codebase, not aspiration.

---

## 1. One-line

Sekondment is a global-ready, Jersey-launched marketplace for business capability,
verified expertise and workforce capacity — where businesses deploy expertise (not
headcount) and everything (proposals, agreements, delivery, payments, reviews,
disputes, messaging) happens in-platform. Tagline: **"Deploy expertise, not headcount."**

---

## 2. Stack (do not rebuild or switch)

Next.js 15 (App Router, Server Actions, RSC) · React 19 · TypeScript · Tailwind ·
Supabase (Postgres / Auth / Realtime / Storage / RLS) · Stripe Connect · Resend · Vercel.

---

## 3. Build inventory (accurate as of this doc)

- **~51 tables**, **migrations through 0031**, **~85 RLS policies**
- **~50 pages**, **17 of them the Operations Centre**, 6 API routes, ~144 source files
- **~315 expertise taxonomy records** across 14 sectors

### Account types
business · expert · employer_partner · admin (+ internal platform roles, see §5)

### Core transaction loop (built)
post opportunity → propose → accept → engagement → fund milestone → submit work →
release (platform fee + Company Resource split) → reviews → disputes. Messaging throughout.

### Built feature areas
- **Marketplace:** opportunities (post/list/detail, public/private), proposals
  (submit/shortlist/accept/reject), expert discovery + filters + keyword search,
  saved experts/opportunities, **team capability search** (find employer partners by
  combined expertise).
- **Money & escrow:** milestone fund/submit/release, append-only ledger, Stripe Connect
  (separate charges + transfers), platform fee, **Company Resource split** (employer paid,
  individual stays on payroll + optional bonus), refunds, **configurable commission**
  (site-wide default + per-company override; default 15%, presets 15/12.5/10; locked per
  engagement at creation). Two-sided reviews. Disputes + admin resolution.
- **Expertise engine:** structured taxonomy (~315 records) + aliases + relationships,
  profile_expertise with declared/verified/proven levels, expertise_evidence,
  project_expertise_requirements, **matching engine** (scored 0-100 + reasons + gaps),
  match_recommendations, expertise upgrade declared→proven on paid completion.
- **Capacity marketplace:** capacity_profiles, availability, tags, bookings, utilisation.
- **Operations Centre (internal, /platform):** 16 dashboards — Executive (+ Liquidity
  Score), Revenue, Payments, Commission, Marketplace Health, Delivery reports, CRM (with
  add-leads), Geographic, Growth funnel, Compliance, Trust, Expertise intelligence,
  Capacity, Team, Audit logs, System health, Data exports (CSV). Internal role system
  (owner/director/operations/compliance/finance/marketplace/support), audit logging,
  internal notes + CRM + team-tasks tables.
- **Trust & safety:** Trust Score engine, verification documents + admin review,
  anti-circumvention message filter, compliance events, account moderation.
- **Collaboration:** real-time messaging, notification bell, secure file sharing
  (private buckets, signed URLs, party-scoped), deliverable uploads, project boards.
- **Global readiness:** country/region/city/timezone fields, work mode (remote/hybrid/
  onsite), multi-currency, jurisdiction notes, 8 industry accent themes, light/dark, mobile.
- **Compliance/legal:** engagement_terms, contract_templates, document acceptances,
  versioned terms. Careful "escrow-style / payment protection" language (never "regulated
  escrow" or "platform employs the worker").

---

## 4. What's genuinely left

### VERIFY (built, never run against live infra — this is the real priority)
- First live run on Supabase + (optional) Stripe; full core-loop end-to-end test.
- Confirm: dark mode, realtime messaging/notifications, file uploads, mobile layout,
  industry themes — all coded, none clicked-through live.
- Migration sequencing on a clean DB (enum-only files 0005/0015/0023/0026 isolated).

### MINOR UI gaps
- Board card detail modal · full notification centre page · in-chat file attachments
  (partial) · internal-notes write UI · team-invite/role-assign UI.

### FUTURE phases (deliberately deferred)
- Full AI (matching reasons, AI Project/Team Builder — rule-based foundations exist).
- Advisory/knowledge marketplace (advisory sessions) · subscriptions/paid tiers ·
  featured listings · capacity forecasting · enterprise private marketplace · native mobile.

---

## 5. Internal platform roles (Operations Centre access)

Separate from marketplace account types: platform_owner (sees/does everything, cannot
be restricted) · platform_director · operations_manager · compliance_manager ·
finance_manager · marketplace_manager · support_team. Module access is role-gated;
every sensitive action is audit-logged. Seed the first owner after migrating:
`insert into platform_team_members (account_id, role) select id,'platform_owner' from accounts where email='joe@mindlabs.je';`

---

## 6. Launch geography

Jersey is the first commercial test market (founder-led sales: finance, trust/fund
admin, compliance, tech, marketing, operations, professional services). **Global from
day one — nothing Jersey-hardcoded.** London is the second growth route. The product
supports global signups, multiple jurisdictions/timezones/currencies, and remote/hybrid/
local work without a rebuild.

---

## 7. Commercial model

15% platform commission by default, configurable site-wide and per-company (presets
15 / 12.5 / 10), snapshotted onto each engagement at creation so in-flight deals never
change rate. The fee is pure platform revenue — NOT split with anyone; the employer/
employee split happens inside the post-fee remainder (Company Resource only).
Future monetisation (deferred): featured listings, Pro subscriptions (Professional/
Business/Employer Partner/Enterprise), verification fees, advisory commission, premium
AI tools, capacity forecasting, white-label.

---

## 8. Hard rules

1. Don't rebuild the app or switch stack. Inspect first; fix/extend incrementally.
2. Add migrations; never delete existing ones. Enum-only files run isolated.
3. Never break the core transaction loop.
4. Money path is authoritative server-side: users can't self-verify, edit Trust Score,
   fake ledger entries, edit proposal prices after submission, release unfunded
   milestones, or review outside completed engagements. Admin/owner actions are genuinely
   gated.
5. Legal language: "milestone funding / payment protection / escrow-style / funds held
   until approval" OK. "Regulated escrow / Sekondment employs the worker / guaranteed in
   every jurisdiction" NOT OK without review.
6. Build order: working product → trust/payment hardening → moat (expertise) → scale.
   Don't overbuild subscriptions before liquidity exists; don't build full AI before the
   structured expertise data (which now exists) is in use.

---

## 9. MVP definition of done

App builds clean · migrations run clean on a fresh DB · core loop works end-to-end in
test mode · RLS audited and sensitive fields protected · Company Resource split correct ·
reviews/disputes work · admin can manage disputes/verification/flagged messages/analytics ·
messaging + notifications work · global signups supported · Jersey usable as first market ·
no user can bypass the payment flow or manipulate trust · product demos confidently.

---

## 10. Strategic order

Trusted project marketplace → workforce capacity marketplace → verified expertise
marketplace → matching/recommendations → AI project builder → employer capacity platform
→ advisory marketplace → enterprise private marketplace → global workforce operating system.

Immediate job: **verify what's built runs live, harden the money path, fill the minor
UI gaps — then layer on the deferred phases.** The foundation and the moat both exist;
the next milestone is proving it works against live infrastructure, not building more.
