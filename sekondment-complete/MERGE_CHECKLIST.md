# MERGE_CHECKLIST — Commission + Role Dashboards

For Devin/Cascade. These changes came from a Claude session working on a copy that
diverged from the live repo (never received Cascade's 0028). Most additions are new
files (safe). A FEW edit existing money-path files (review carefully). This checklist
separates the two.

---

## ✅ SAFE — new files, drop in as-is (no conflicts possible)

These are brand-new files. They don't touch anything existing:

**Ops Centre pages (read-only dashboards):**
- src/app/(app)/platform/revenue/page.tsx
- src/app/(app)/platform/payments/page.tsx
- src/app/(app)/platform/marketplace/page.tsx
- src/app/(app)/platform/crm/page.tsx
- src/app/(app)/platform/delivery/page.tsx
- src/app/(app)/platform/geographic/page.tsx
- src/app/(app)/platform/growth/page.tsx
- src/app/(app)/platform/compliance/page.tsx
- src/app/(app)/platform/trust/page.tsx
- src/app/(app)/platform/commission/page.tsx
- src/app/(app)/platform/commission/CommissionForm.tsx
- src/app/(app)/platform/commission/commission-actions.ts

**Migrations (additive, isolated):**
- supabase/migrations/0030_research_taxonomy.sql  (62 expertise records, ON CONFLICT DO NOTHING)
- supabase/migrations/0031_configurable_commission.sql  (platform_settings + fee_pct_override + resolve_fee_pct())

→ Apply 0030 and 0031 AFTER your existing 0028 (and any 0029 you have). They don't
  depend on a specific predecessor beyond the expertise_taxonomy table (0020+) and
  business_profiles (0001) + is_platform_owner()/is_platform_staff() (from the Ops
  Centre migration 0027). If you don't have 0027 yet, apply that first.

---

## ⚠ REVIEW — edits to existing files (money path — check against your version)

Three existing files were edited. Re-apply the *intent* if your version differs:

### 1. src/lib/stripe/escrow.ts  (computeSplit)
**Change:** added optional `feePct?: number | null` to `SplitInput`; computeSplit now
uses `input.feePct ?? PLATFORM_FEE_PCT` instead of the hardcoded constant.
**Why safe:** backward-compatible — if feePct is omitted, behaviour is identical (15%).
**Check:** your computeSplit signature matches; the line computing `feeMinor` uses the
resolved `feePct`, not `PLATFORM_FEE_PCT` directly.

### 2. src/app/(app)/engagements/actions.ts  (acceptProposal)
**Change:** before creating the engagement, resolve the rate:
```ts
const { data: feeRow } = await svc.rpc('resolve_fee_pct', { p_business_id: opp.business_id });
const lockedFeePct = typeof feeRow === 'number' ? feeRow : 15;
```
and add `platform_fee_pct: lockedFeePct` to the engagements.insert().
**Why:** snapshots the fee so in-flight deals never change rate.
**Check:** the insert sets platform_fee_pct. Requires migration 0031 (resolve_fee_pct).

### 3. src/app/api/engagements/[id]/milestones/[mid]/release/route.ts
**Change:** added `platform_fee_pct` to the engagement SELECT, and passed
`feePct: eng.platform_fee_pct != null ? Number(eng.platform_fee_pct) : undefined`
into computeSplit.
**Why:** release uses the engagement's locked rate, not the global constant.
**Check:** the SELECT includes platform_fee_pct; computeSplit call passes feePct.

### 4. src/components/PlatformShell.tsx  (nav)
**Change:** added nav entries for Commission and Delivery.
**Why:** so the new pages appear in the Ops Centre nav.
**Check:** trivial — just nav array additions. Merge by adding the two lines.

---

## TEST AFTER MERGING

1. `npm run build` — must stay green.
2. Existing computeSplit unit test must still pass (feePct omitted → 15%).
3. New test idea: computeSplit with feePct: 10 on £1000 → fee £100, net £900.
4. Manual: set site fee to 12.5% in /platform/commission → create a NEW engagement →
   confirm its platform_fee_pct = 12.5; confirm an OLD engagement still shows its
   original rate.
5. Seed owner first (platform_team_members) or /platform/commission redirects.

---

## ROLE DASHBOARDS — NOTE

The business/expert/employer-partner dashboards ALREADY EXIST in the repo
(src/app/(app)/dashboard/page.tsx is role-aware; /partner for employer partners).
Claude did NOT rewrite them (too risky on a diverged copy). The prototype
prototypes/role-dashboards.jsx shows how to ENRICH each — apply that enrichment
directly in your live code where you can see the current state. Do not blind-replace
the existing dashboard files.

---

## STRIPE NOTE

The money path is isolated to src/lib/stripe/* and src/app/api/stripe/* +
the fund/release routes. The commission change does NOT add new Stripe coupling —
it only changes which fee % is used in the arithmetic. If you later swap Stripe for
another processor, computeSplit (pure arithmetic) stays; only the transfer execution
in escrow.ts/connect.ts and the webhook need re-pointing.
