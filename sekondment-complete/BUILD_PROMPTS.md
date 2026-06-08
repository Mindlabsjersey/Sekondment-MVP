# SEKONDMENT — ORIGINAL BUILD PROMPTS (verbatim)

These are the five original prompts that drove the build, saved verbatim so any
agent resuming work has the full original intent and acceptance criteria — not just
the summaries in HANDOFF.md / ROADMAP.md. Status of each is tracked in ROADMAP.md.

---

# PROMPT 1: GLOBAL READINESS & TERMS (summary — full text was the foundation build)

Make the platform global-ready, not Jersey-only. Replace hardcoded currency with a
currency layer (GBP/EUR/USD/AED/CHF/AUD/CAD/SGD). Add country field. Build the
terms/agreements foundation: a /terms page, sign-up acceptance checkbox, onboarding
records platform-terms acceptance, and an engagement agreement panel where both
parties accept before work proceeds. Jersey is the first test market but nothing is
Jersey-hardcoded.

(Note: Prompt 1 predated this verbatim-capture file; the above is an accurate
condensed statement of its scope. Prompts 3-5 below are the full original text.)

---

# PROMPT 2: STABILISE & HARDEN (summary)

Stabilise and harden the build for real use. Add RLS column-guard triggers so users
cannot self-edit protected fields (trust_score, verification_status, account_type,
Stripe fields); make ledger_entries append-only; lock proposal price after
submission. Add account moderation (warn/suspend/reinstate). Make milestone release
idempotent (no duplicate release). Build admin pages: flagged messages, payment
ledger, user management. Defer live build/Stripe testing to a desktop session.

---

# PROMPT 3: GLOBAL READINESS, AGREEMENTS AND COMPLIANCE FOUNDATIONS

Add global readiness and contract foundations to the existing Sekondment build.
Do not make the platform Jersey-only. Jersey is the first commercial test market,
but users from the UK, Ireland, Dubai and wider global markets must be able to sign
up and use the platform.

Global readiness fields: country, region, city, timezone, currency, jurisdiction,
work_mode, remote_available, onsite_available, hybrid_available, travel_available,
countries_served, preferred_currency. Work modes: Remote, Onsite, Hybrid.

Onboarding should ask: where based, timezone, do you work remotely, what countries/
jurisdictions you serve, preferred currency, open to international work.

Opportunity creation should ask: remote/onsite/hybrid, country/jurisdiction, local
knowledge required, timezone overlap needed, project currency, engagement kind
(freelancer/consultant/employer-backed resource).

Search filters: country, city/region, timezone, remote, onsite, hybrid, currency,
availability, expertise, industry, verification level, Trust Score.

Contract/agreement tables: engagement_terms (versioned, never overwritten, with
business/expert/employer acceptance), contract_templates (freelancer, employer-
backed resource, secondment, NDA, SOW, milestone/payment, cancellation, dispute,
no-off-platform), verification_documents (identity, business_registration,
insurance, certification, qualification, licence, reference, right_to_work,
director_confirmation, NDA, contract, portfolio, employer_confirmation),
compliance_events (permanent audit trail), employer_employee_events (invited,
accepted, rejected, approved, suspended, reinstated, revoked, withdrawn).

Legal language — allowed: milestone funding, payment protection, funds held until
approval, escrow-style payment flow, platform-facilitated engagement, agreement
acceptance. Avoid: regulated escrow, guaranteed legal compliance everywhere,
Sekondment employs the worker, Sekondment owns the job, Sekondment is the legal
employer.

Acceptance: users can sign up globally; location/timezone stored; currency not
hardcoded; opportunities support remote/onsite/hybrid; each engagement has accepted
terms; contract versions preserved; employer-backed engagements have employer
approval audit trail; verification evidence uploadable and reviewable; compliance
events logged; admin can view compliance history.

---

# PROMPT 4: EXPERTISE INTELLIGENCE ENGINE AND WORKFORCE CAPACITY MARKETPLACE

Add Sekondment's moat: structured expertise and workforce capacity. Do not build
generic AI first. First build structured data. Make Sekondment searchable by
expertise, not just job titles or profiles.

Tables: expertise_taxonomy (id, name, slug, type, parent_id, description,
commercial_value_score, ai_resistance_score, difficulty_level, demand_weight,
is_active, created_at, updated_at — types: role, skill, tool, expertise, industry,
certification, project_type, deliverable, outcome, proof_type), expertise_aliases,
expertise_relationships (requires, related_to, commonly_used_with, belongs_to,
evidence_for, industry_relevant, certification_for, alternative_to, prerequisite_for),
profile_expertise (declared_level, verification_level [declared/verified/proven],
years_experience, project_count, last_used_at, confidence_score, evidence_summary),
expertise_evidence (certification, portfolio, employer_confirmation,
completed_engagement, review, case_study, reference, work_sample, licence,
CV extraction, LinkedIn extraction), project_expertise_requirements (importance:
required/preferred/optional; required_level; required_verification_level),
match_recommendations.

Profile creation upgrade: write what they do, upload CV, add LinkedIn URL, add
certifications, add portfolio, select suggested expertise tags, confirm/remove
extracted suggestions, set availability against expertise, set rates against
expertise. CV/profile extraction identifies roles, skills, tools, platforms,
industries, certifications, project types, deliverables, outcomes, years of
experience, seniority, evidence. Convert into structured expertise, not raw text.

Expertise seed categories (prioritise valuable, AI-resistant, commercially useful):
Finance & trust, Technology, Marketing & growth, Operations & transformation,
Professional services, Leadership & advisory.

Workforce Capacity Marketplace — businesses list capacity, not just people. Tables:
capacity_profiles (employer_partner_id, employee_id/resource_id, title, expertise
tags, available_hours_per_week, available_days_per_month, availability_start/end,
timezone, location, work_mode, hourly_rate, day_rate, employer_commission_rule,
employee_bonus_rule, public_private_status, approval_status), capacity_availability,
capacity_bookings, capacity_tags, capacity_utilisation_events.

Employer Partner dashboard shows: employees/resources, available hours/days,
expertise available, approval status, live/completed engagements, revenue generated,
commission earned, individual bonus split, utilisation, suggested opportunities.

Matching — rule-based first. Score factors: required expertise match, related
expertise, skill/tool/industry match, availability, rate/budget, location/work mode,
timezone, verification level, proven expertise, Trust Score, completed projects,
review score, response speed, dispute history, employer approval status. Output:
match %, clear reasons, missing requirements, verification level, availability, rate
fit, Trust Score signal.

AI Project Builder foundation — not AI-dependent. Structured templates: business
enters plain-language need; system suggests title, description, scope, deliverables,
required expertise, required tools, milestones, estimated hours, budget range, risks,
recommended experts/resources.

Acceptance: experts add structured expertise; businesses define required expertise;
CV upload suggests tags; search uses expertise + aliases + related terms; profiles
show declared/verified/proven; engagement completion upgrades proof; Employer
Partners list capacity; businesses search expertise + availability; matches show
reasons; the platform becomes a marketplace of expertise and capacity, not people.

---

# PROMPT 5: EXPERTISE GRAPH, CV INTELLIGENCE & MARKETPLACE INTELLIGENCE

Do not build generic AI features. Do not build chatbots or assistants. Build
Sekondment's long-term moat: the Expertise Graph — the structured knowledge layer
powering search, matching, recommendations, capacity marketplace, AI Project Builder,
AI Team Builder, capacity forecasting, advisory marketplace, enterprise workforce
planning. Core principle: businesses search for outcomes, expertise and availability
— not people.

Phase 1 — CV Intelligence: turn CVs/profiles into structured expertise. Extract
roles, skills, tools, platforms, expertise, industries, certifications, project
types, deliverables, outcomes, years of experience, seniority, team size managed,
revenue responsibility, compliance responsibility, languages, jurisdictions worked
in. Don't store raw CV text — convert to structured records. User reviews/confirms.

Phase 2 — Universal Expertise Graph: expand expertise_taxonomy to scale. Stage 1:
1,000 records; Stage 2: 5,000; Stage 3: 20,000+. Types: Role, Skill, Tool, Platform,
Expertise, Industry, Certification, Project Type, Deliverable, Outcome, Proof Type,
Jurisdiction, Service Category. Each record supports parent/child relationships,
aliases, synonyms, related/required/commonly-used-together expertise, industry
relevance, demand/commercial-value/AI-resistance weighting.

Phase 3 — Proof of Expertise: declared/verified/proven. Track years experience,
projects, completed engagements, reviews, average rating, last used, verification
level, supporting evidence. Evidence: certification, qualification, portfolio, work
sample, employer confirmation, reference, completed engagement, review, case study.

Phase 4 — Expertise Search: role/skill/tool/expertise/industry/outcome/natural-
language search; understand aliases and related expertise.

Phase 5 — Capability Search: search for capability not people. Show experts,
employees, employer partner resources, consultancies, teams, plus project evidence.

Phase 6 — Marketplace Intelligence: track most requested expertise, fastest growing,
highest paying, most profitable industries/project types, most requested
certifications, average project value per expertise, average time to hire,
completion rates. Create analytics tables if required.

Phase 7 — Expertise Expansion: build structured categories in priority order:
Finance, Trust Administration, Fund Administration, Compliance, Risk, Technology,
Cyber Security, Cloud, DevOps, Data, Marketing, Operations, Project Management,
Legal, HR, Recruitment, Executive Leadership, Construction, Engineering, Healthcare,
Energy, Manufacturing, Real Estate, Professional Services. Support tens of thousands
of records over time.

Phase 8 — Prepare for future AI: don't make features AI-dependent. Prepare
structured data that future AI will consume (Expertise Graph, project/engagement/
review/capacity/proof data) to power AI Project Builder, AI Team Builder, AI
Matching, AI Pricing, AI Capacity Forecasting, AI Skill Gap Analysis, AI Workforce
Planning — without database redesign.

Acceptance: users upload CVs; suggestions generated; users confirm expertise;
expertise structured not raw text; profiles show declared/verified/proven; search
supports expertise + capability; matching uses structured expertise; Employer
Partner resources use expertise; proof stored; analytics use expertise data;
taxonomy scalable beyond 20,000 records; future AI consumes data without schema
changes.

---

## PROMPT ADDITION — PLATFORM OPERATIONS CENTRE (internal operating system)

Build a dedicated internal command centre, separate from and more powerful than the
marketplace admin pages. Founder/owner view sits at the top of a wider internal OS
that scales from one founder to a full internal team running a global marketplace.

INTERNAL ROLES (separate from marketplace account types):
platform_owner (sees/does everything, cannot be restricted), platform_director,
operations_manager, compliance_manager, finance_manager, marketplace_manager, support_team.

ROUTE: /platform. MODULES (build in layers):
Executive · Revenue · Payments · Marketplace Health · Marketplace Liquidity Score ·
Expertise Intelligence · Workforce Capacity · Geographic · Compliance · Trust ·
User Growth · AI & Matching · Internal Team · Internal Notes · Internal CRM Pipeline ·
Audit Logs · System Health · Data Exports.

KEY REQUIREMENTS:
- Role-based module access (MODULE_ACCESS matrix in src/lib/platform/access.ts).
- Every sensitive internal action audit-logged (audit_logs table + auditLog()).
- Internal notes attachable to key records (internal_notes table).
- Internal CRM pipeline (crm_leads): lead→contacted→demo→trial→active→won/lost +
  employer-partner / enterprise / partnership tracks.
- Internal team management + workload (team_tasks); owner assigns roles.
- Marketplace Liquidity Score (0-100) as a headline owner metric, with diagnosis.
- Analytics-ready event tracking for future BI (Power BI/Fabric/Looker/Metabase)
  without DB redesign.
- Normal admins do NOT automatically get owner-level permissions.

LAYERS: L1 owner role + /platform + Executive + revenue/payment summary +
internal notes + audit foundation (DONE). L2 role-based access + finance/compliance/
marketplace dashboards + CRM + team mgmt. L3 expertise/capacity/geographic/growth +
exports. L4 AI/matching + BI integration + forecasting + enterprise.

Migrations: 0026 (platform_role enum, isolated), 0027 (platform_team_members,
internal_notes, audit_logs, crm_leads, team_tasks + RLS + helper fns).
Status: Layer 1 built; Layers 2-4 tracked in ROADMAP.md and DEVIN.md Task 4.
