# INJECT_EXPERTISE — Research-backed expertise expansion

**Purpose:** Add 62 research-backed expertise records (across 14 sectors, with realistic day rates and demand/AI-resistance data) to the expertise taxonomy. Wire them through profile linking and the matching engine so businesses can post for them and experts can claim them.

**Status:** Ready to inject. No schema changes. Migration 0029 + data files provided.

---

## What changes

### Taxonomy expansion (0030_research_taxonomy.sql)
Adds 62 new expertise records to `expertise_taxonomy` with:
- **name** — e.g. "Machine Learning Engineering", "Fractional CISO", "ISO27001 Implementation"
- **slug** — unique key for matching/search
- **type** — 'expertise' (technical/specialist skill) or 'role' (fractional leadership position)
- **commercial_value_score** — 0-100; learned from 2026 freelance rates (higher = premium)
- **ai_resistance_score** — 0-100; how much the role resists automation (governance, leadership, compliance = high)
- **demand_weight** — 0-100; current market demand signal (cybersecurity, AI = high)
- **industry_relevance_note** — which sector(s) this serves

### Sectors covered
- **Data & AI** (9 roles) — ML Engineering, LLM/Prompt, Data Governance, Fractional AI Officer, etc.
- **Cyber Security** (9 roles) — Penetration Testing, CISO, Zero Trust, Red Teaming, SOC2, ISO27001, etc.
- **Technology** (8 roles) — AWS/Azure, Kubernetes, SRE, IaC, Stripe Connect, Microsoft 365 Migration, CTO
- **Finance** (8 roles) — AML, KYC, Trust Admin, Fund Admin, Financial Modelling, CFO, Controller
- **Leadership** (4 roles) — Fractional CFO, COO, CISO (from Cyber), CTO (from Tech)
- **Risk & Legal** (6 roles) — Enterprise Risk, Operational Resilience, GDPR, Commercial Contracts, M&A, Internal Audit
- **Marketing** (5 roles) — Meta/Google Ads, SEO, HubSpot, Fractional CMO
- **Operations** (5 roles) — Transformation, Change Management, Supply Chain, PMO, COO
- **Energy** (3 roles) — Renewable Energy PM, Carbon Accounting, Grid Integration
- **Construction** (3 roles) — HSE, Quantity Surveying, BIM Coordination
- **Healthcare** (3 roles) — Clinical Governance, Medical Device Regulation, Health Informatics
- **Manufacturing** (2 roles) — Lean/Six Sigma, Industrial Automation
- **Defence** (1 role) — Defence Procurement

---

## How to inject (Devin instructions)

1. **Load the migration**
   ```bash
   # The migration file supabase/migrations/0030_research_taxonomy.sql
   # is already in the repo. Review it:
   cat supabase/migrations/0030_research_taxonomy.sql
   # It contains 62 INSERT records, each with (name, slug, type, commercial_value_score, ai_resistance_score, demand_weight, industry_relevance_note)
   # All use ON CONFLICT (slug) DO NOTHING — safe to run multiple times.
   ```

2. **Add the data reference files** (for context/verification)
   - `data/expertise-research.json` — the 62 records with day rates and demand data from 2026 market research
   - `data/proven-expertise-samples.json` — 158 sample profile_expertise records showing the three-tier proof model (93 proven, 46 verified, 19 declared) — *for reference only, do NOT insert into the DB* — these are demo records for understanding structure, not for seeding

3. **Run the migration** (when you deploy to live Supabase)
   ```bash
   # After migrations 0001→0028 are applied:
   psql -d <your-supabase-db> < supabase/migrations/0030_research_taxonomy.sql
   # Or: via Supabase dashboard → SQL Editor → paste the file
   ```

4. **Verify the data**
   Once applied, the expertise is live in the taxonomy:
   ```sql
   select count(*) from expertise_taxonomy;
   select distinct industry_relevance_note from expertise_taxonomy order by 1;
   ```

---

## What now works (without code changes)

Once 0029 runs:

- **Businesses can post opportunities** requiring any of the 62 new expertises (e.g. "need a Fractional CISO", "ISO27001 Implementation specialist")
- **Experts can add these as structured expertise** to their profiles (profile_expertise links generically to taxonomy)
- **The matching engine** automatically ranks experts holding these expertises against the requirements
- **The Operations Centre** charts already reading `expertise_demand_stats` will show demand + supply for all 62, allowing you to see which are hot and which are undersupplied

---

## What does NOT change

- **No schema changes.** All tables (profile_expertise, project_expertise_requirements, expertise_demand_stats, matching engine) already exist and work generically with any expertise_id.
- **No app version changes.** The matching, the Ops Centre dashboards, the CVImport skill extraction — all work unchanged.
- **No user-facing code.** Just data.
- **Businesses still specify requirements the same way** (BusinessBuilder / opportunity creation → pick expertise + required level).
- **Experts still add expertise the same way** (ExpertisePicker → pick expertise + level).

---

## Research sources & rationale

Data grounded in 2026 market research on:
- Fractional/interim work trends (up 57% since 2020)
- Highest-rate freelance specialisms (ML/AI, cybersecurity, cloud, data)
- Sector-specific demand (healthcare, energy, defence, construction)
- Skills shortages (cybersecurity: 4M+ gap globally; 95% of teams report critical shortfall)
- Emerging roles (Fractional AI Officer, Fractional CISO, Data Governance, Digital Transformation Lead)

Rates normalised to GBP from US/global freelance surveys; directionally accurate for planning, not gospel.

---

## Future use (not built yet)

- **Client delivery reports** — using engagement/milestone/deliverable data to show clients what their teams delivered (accountability layer)
- **Deeper Ops Centre analytics** — revenue by expertise, demand-supply heatmap by geography, predictive gaps
- **Team/consultancy capability search** — reuse the matching engine to show businesses what teams (employer partners + their employees) can do

---

## Devin: if you're reading this

This is a pure data injection. Do NOT:
- Rewrite the matching engine
- Change profile_expertise structure
- Modify the Ops Centre
- Alter the opportunity-creation flow

DO:
- Load the migration when ready (0029 is isolated and safe)
- Reference the JSON data files for context (not as executables)
- Treat this as "the marketplace now knows about 62 new things"
