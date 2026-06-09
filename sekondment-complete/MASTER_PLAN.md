> **For current build inventory, see CURRENT_STATE.md** (this file may contain older counts; strategy/detail here is still useful).

# SEKONDMENT — MASTER PLAN, DATA MODEL & ANALYTICS REFERENCE

The single document that explains what Sekondment is, how the flow works, every
table and why it exists, and — importantly — what decisions the analytics are built
to help you make. Read this to orient; feed it to Devin for context.

Tagline: **"Deploy expertise, not headcount."**

---

## 1. THE PRODUCT IN ONE PARAGRAPH

Businesses don't search for people — they search for outcomes, expertise and
availability. Sekondment is a global B2B marketplace where businesses post
opportunities, verified experts / freelancers / consultants / employer-backed
"company resources" propose, and engagements run on milestone-based escrow-style
payments with reviews, disputes and structured expertise matching underneath.
The differentiator is the **Company Resource model**: an employer is paid, the
individual stays on their payroll, with an optional bonus split — so businesses can
"deploy expertise, not headcount" and employers monetise spare capacity.

---

## 2. THE CORE FLOW (what a user actually does)

post opportunity → expert/partner **proposes** → business **accepts** →
**engagement** created → business **funds** a milestone (money held, escrow-style)
→ expert **submits** work → business **releases** (platform fee taken, rest
transferred, Company Resource split applied) → **reviews** exchanged → **disputes**
if needed. Completing a paid milestone **upgrades** the expert's relevant expertise
from "declared" to "proven" — feeding the moat (below).

---

## 3. THE SEVEN DASHBOARDS (who logs in where)

1. **User/Business Dashboard** — post opportunities, review proposals, manage engagements
2. **Expert Dashboard** — find work, propose, manage deliverables, get paid
3. **Employer Partner Dashboard** — list company resources/capacity, manage employees, take split
4. **Admin Dashboard** (`/admin/*`) — the operational queues: disputes, verification,
   flagged messages, ledger, users, compliance, activity, expertise, analytics
5. **Platform Operations Centre** (`/platform`) — the INTERNAL command centre for you
   + staff (separate from, and more powerful than, admin). Role-gated. **This is the
   "other place staff log in."** Layer 1 built (Executive Dashboard + Liquidity Score);
   Layers 2-4 outstanding.
6. **Enterprise Dashboard** — future.

Internal platform roles (separate from marketplace account types):
platform_owner (you — sees/does everything, cannot be restricted), platform_director,
operations_manager, compliance_manager, finance_manager, marketplace_manager, support_team.

---

## 4. THE DATA MODEL — 45 TABLES, WHY EACH EXISTS

### Accounts & profiles
- **accounts** — every user; carries account_type (business/expert/employer_partner/admin)
- **business_profiles / expert_profiles / employer_partners** — type-specific detail
- **expert_availability** — work modes, hours, day rate
- **employer_employees** — which individuals an employer partner can deploy

### Marketplace core
- **opportunities** — jobs businesses post (+ visibility, country, jurisdiction)
- **opportunity_interest** — who's interested
- **proposals** — expert/partner bids (price locked after submission)
- **engagements** — an accepted proposal = a live working relationship
- **conversations / messages** — in-platform chat (anti-circumvention filtered)
- **saved_experts / saved_opportunities** — bookmarks

### Money / escrow
- **milestones** — chunks of work + payment; the escrow state machine
  (pending→funded→submitted→releasing→released)
- **deliverables** — what the expert submits
- **ledger_entries** — APPEND-ONLY money record. entry_type ∈ fund / fee /
  transfer_expert / transfer_business / refund. THE source of truth for GMV & revenue.
- **disputes** — raised, evidence, resolution
- **reviews** — 5-dimension ratings both ways

### Expertise Graph (the long-term moat)
- **expertise_taxonomy** — the structured vocabulary (~233 records across 15 sectors +
  jurisdictions + service categories). Each has commercial_value_score,
  ai_resistance_score, demand_weight.
- **expertise_aliases** — "m365" → Microsoft 365 Migration (search understands synonyms)
- **expertise_relationships** — related/parent/child links
- **profile_expertise** — who has what, at what level (declared/verified/proven),
  years, project_count, rating
- **expertise_evidence** — proof: certs, portfolio, completed engagements, references
- **project_expertise_requirements** — what an opportunity needs
- **match_recommendations** — scored candidates the engine produced
- **expertise_demand_stats** — per-expertise: times_requested, times_matched,
  active_experts, proven_experts, avg_project_value, avg_rating → powers intelligence

### Capacity marketplace
- **capacity_profiles / capacity_tags / capacity_availability** — listable spare capacity
- **capacity_bookings** — businesses request it
- **capacity_utilisation_events** — usage tracking

### Compliance, trust & collaboration
- **trust_score_factors** — inputs to each user's Trust Score
- **verification_documents** — uploaded evidence + admin review
- **legal_documents / document_acceptances** — terms, who accepted what
- **engagement_terms / contract_templates** — per-engagement agreements (9 seeded templates)
- **compliance_events / employer_employee_events** — audit trail for risk
- **notifications** — in-app bell (realtime)
- **activity_events** — engagement-level event stream
- **boards / board_columns / board_cards** — per-engagement project boards

### Platform Operations Centre (internal)
- **platform_team_members** — internal staff + their platform_role
- **internal_notes** — attach private notes to any record
- **audit_logs** — every sensitive internal action (who viewed/changed what)
- **crm_leads** — founder-led sales pipeline (lead→demo→trial→won/lost)
- **team_tasks** — internal workload tracking

---

## 5. THE ANALYTICS — AND THE DECISIONS THEY DRIVE

This is the point of the Ops Centre: not vanity numbers, but **decisions**.

| Metric (built / planned) | Question it answers | Decision it drives |
|---|---|---|
| **Marketplace Liquidity Score** (built) | Is the marketplace healthy enough to function? | Whether to recruit experts, drive demand, or improve matching |
| GMV + platform revenue (built, from ledger) | Are we making money? | Pricing, runway, whether the model works |
| New users today/month (built) | Are we growing? | Marketing spend, where to focus |
| Open disputes + verification backlog (built) | Are we safe / on top of risk? | Where staff time goes today |
| **Most-requested expertise** (built, /admin/expertise) | What do buyers want? | What expertise to recruit & verify next |
| **Supply/demand gaps** (built) | What's wanted but under-supplied? | Targeted expert recruitment |
| Highest commercial value / AI-resistance (built) | What's most defensible & profitable? | What to promote & monetise |
| Revenue by country/industry/expertise (planned, L2) | Where's the money coming from? | Geographic & vertical focus (Jersey-first → where next) |
| Proposal/acceptance/completion rates (planned, L2) | Where does the funnel leak? | Onboarding, matching, support fixes |
| Capacity utilisation (planned, L3) | Is employer capacity being used? | Whether the Company Resource model is working |
| Trust Score distribution (planned, L3) | Who's risky? | Proactive moderation |
| Growth funnel (planned, L3) | Where do users drop off? | Product fixes at the leak point |

**The strategic loop:** expertise demand data tells you what to recruit → recruiting
the right experts improves liquidity → liquidity drives engagements → engagements
generate revenue + proven-expertise data → proven data makes matching better → better
matching attracts more businesses. The Ops Centre is the cockpit for steering that loop.

---

## 6. WHAT'S BUILT vs OUTSTANDING (honest)

**Built & verified live (by Cascade):** production build, Supabase live, migrations
0001→0028, 15% fee, escrow idempotency, 20 unit tests.

**Built but NOT yet seen working (verify on localhost):** dark mode, realtime,
uploads, Stripe payout onboarding, industry themes, mobile, the matching flow itself,
the Executive Dashboard with real data.

**Ops Centre:** only Layer 1 (Executive Dashboard) has a real page. The other 13 nav
tabs (Revenue, Payments, Marketplace, CRM, etc.) are links with NO page yet — Layers 2-4.

**Not built:** real CV PDF parsing, team/consultancy capability search, versioned
engagement terms, capacity→auto-engagement, taxonomy beyond 233, demo/seed data.

**Biggest blocker to "seeing it":** there is NO demo data, so a fresh login shows empty
screens. A seed script is the highest-value next step for actually exploring it.
