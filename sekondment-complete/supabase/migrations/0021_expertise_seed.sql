-- =============================================================================
-- SEKONDMENT — 0021  EXPERTISE TAXONOMY SEED
-- ~110 commercially valuable, AI-resistant expertise entries + key aliases.
-- Idempotent: on conflict (slug) do nothing.
-- =============================================================================

insert into expertise_taxonomy (name, slug, type, commercial_value_score, ai_resistance_score) values
  ('Trust Administration','trust-administration','expertise',75,80),
  ('Fund Administration','fund-administration','expertise',75,80),
  ('AML Review','aml-review','expertise',75,80),
  ('KYC Review','kyc-review','expertise',75,80),
  ('Client Due Diligence','client-due-diligence','expertise',75,80),
  ('Regulatory Reporting','regulatory-reporting','expertise',75,80),
  ('Risk Management','risk-management','expertise',75,80),
  ('Financial Reporting','financial-reporting','expertise',75,80),
  ('Audit Preparation','audit-preparation','expertise',75,80),
  ('Payroll','payroll','expertise',75,80),
  ('Bookkeeping','bookkeeping','expertise',75,80),
  ('Tax Advisory','tax-advisory','expertise',75,80),
  ('Corporate Services','corporate-services','expertise',75,80),
  ('Company Secretarial','company-secretarial','expertise',75,80),
  ('Governance','governance','expertise',75,80),
  ('Cloud Architecture','cloud-architecture','expertise',65,60),
  ('AWS Architecture','aws-architecture','expertise',65,60),
  ('Azure Administration','azure-administration','expertise',65,60),
  ('Microsoft 365 Migration','microsoft-365-migration','expertise',65,60),
  ('Cyber Security Audit','cyber-security-audit','expertise',65,60),
  ('ISO27001 Implementation','iso27001-implementation','certification',65,60),
  ('SOC2 Readiness','soc2-readiness','certification',65,60),
  ('Data Engineering','data-engineering','expertise',65,60),
  ('Power BI Dashboarding','power-bi-dashboarding','tool',65,60),
  ('Systems Integration','systems-integration','expertise',65,60),
  ('API Integration','api-integration','expertise',65,60),
  ('Stripe Connect Implementation','stripe-connect-implementation','tool',65,60),
  ('DevOps','devops','expertise',65,60),
  ('Kubernetes Deployment','kubernetes-deployment','tool',65,60),
  ('Database Migration','database-migration','expertise',65,60),
  ('CRM Implementation','crm-implementation','expertise',65,60),
  ('AI Automation','ai-automation','expertise',65,60),
  ('Workflow Automation','workflow-automation','expertise',65,60),
  ('Marketing Strategy','marketing-strategy','expertise',65,60),
  ('Brand Positioning','brand-positioning','expertise',65,60),
  ('Meta Ads Lead Generation','meta-ads-lead-generation','expertise',65,60),
  ('Google Ads','google-ads','expertise',65,60),
  ('LinkedIn Ads','linkedin-ads','expertise',65,60),
  ('SEO','seo','expertise',65,60),
  ('CRO','cro','expertise',65,60),
  ('Funnel Build','funnel-build','expertise',65,60),
  ('Landing Page Strategy','landing-page-strategy','expertise',65,60),
  ('Email Marketing','email-marketing','expertise',65,60),
  ('HubSpot Automation','hubspot-automation','tool',65,60),
  ('Salesforce Marketing Cloud','salesforce-marketing-cloud','tool',65,60),
  ('Campaign Management','campaign-management','expertise',65,60),
  ('Analytics Reporting','analytics-reporting','expertise',65,60),
  ('GA4 Setup','ga4-setup','tool',65,60),
  ('Content Strategy','content-strategy','expertise',65,60),
  ('Local Business Marketing','local-business-marketing','expertise',65,60),
  ('B2B Lead Generation','b2b-lead-generation','expertise',65,60),
  ('Process Improvement','process-improvement','expertise',65,70),
  ('Procurement','procurement','expertise',65,70),
  ('Project Management','project-management','expertise',65,70),
  ('Programme Management','programme-management','expertise',65,70),
  ('Business Analysis','business-analysis','expertise',65,70),
  ('Change Management','change-management','expertise',65,70),
  ('Vendor Management','vendor-management','expertise',65,70),
  ('Operations Management','operations-management','expertise',65,70),
  ('Policy Writing','policy-writing','expertise',65,70),
  ('SOP Creation','sop-creation','expertise',65,70),
  ('Quality Management','quality-management','expertise',65,70),
  ('Supply Chain','supply-chain','expertise',65,70),
  ('Service Delivery','service-delivery','expertise',65,70),
  ('Business Transformation','business-transformation','expertise',65,70),
  ('Legal Support','legal-support','expertise',65,80),
  ('HR Advisory','hr-advisory','expertise',65,80),
  ('Recruitment','recruitment','expertise',65,80),
  ('Executive Search','executive-search','expertise',65,80),
  ('Corporate Governance','corporate-governance','expertise',65,80),
  ('Employment Advisory','employment-advisory','expertise',65,80),
  ('Compliance Advisory','compliance-advisory','expertise',65,80),
  ('Risk Advisory','risk-advisory','expertise',65,80),
  ('Board Support','board-support','expertise',65,80),
  ('Commercial Advisory','commercial-advisory','expertise',65,80),
  ('Fractional CFO','fractional-cfo','role',75,80),
  ('Fractional COO','fractional-coo','role',75,80),
  ('Interim CEO','interim-ceo','role',75,80),
  ('Commercial Strategy','commercial-strategy','role',75,80),
  ('Board Advisory','board-advisory','role',75,80),
  ('Transformation Leadership','transformation-leadership','role',75,80),
  ('Sales Strategy','sales-strategy','role',75,80),
  ('Partnership Strategy','partnership-strategy','role',75,80),
  ('Investor Readiness','investor-readiness','role',75,80),
  ('Business Planning','business-planning','role',75,80)
on conflict (slug) do nothing;

-- Aliases
insert into expertise_aliases (expertise_id, alias) select id, 'M365 migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Office 365 migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'tenant migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Exchange migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'SharePoint migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Entra ID migration' from expertise_taxonomy where slug='microsoft-365-migration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Stripe Connect' from expertise_taxonomy where slug='stripe-connect-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'marketplace payments' from expertise_taxonomy where slug='stripe-connect-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Stripe marketplace' from expertise_taxonomy where slug='stripe-connect-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'connected accounts' from expertise_taxonomy where slug='stripe-connect-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'ISO 27001' from expertise_taxonomy where slug='iso27001-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'ISO27001' from expertise_taxonomy where slug='iso27001-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'information security management' from expertise_taxonomy where slug='iso27001-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'ISMS' from expertise_taxonomy where slug='iso27001-implementation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'anti-money laundering' from expertise_taxonomy where slug='aml-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'AML' from expertise_taxonomy where slug='aml-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'AML/CFT' from expertise_taxonomy where slug='aml-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'know your customer' from expertise_taxonomy where slug='kyc-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'KYC' from expertise_taxonomy where slug='kyc-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'client onboarding' from expertise_taxonomy where slug='kyc-review' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'trustee services' from expertise_taxonomy where slug='trust-administration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'trust admin' from expertise_taxonomy where slug='trust-administration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'fiduciary administration' from expertise_taxonomy where slug='trust-administration' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'HubSpot' from expertise_taxonomy where slug='hubspot-automation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'HubSpot workflows' from expertise_taxonomy where slug='hubspot-automation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'HubSpot CRM' from expertise_taxonomy where slug='hubspot-automation' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'Power BI' from expertise_taxonomy where slug='power-bi-dashboarding' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'PowerBI' from expertise_taxonomy where slug='power-bi-dashboarding' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'BI dashboards' from expertise_taxonomy where slug='power-bi-dashboarding' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'SOC 2' from expertise_taxonomy where slug='soc2-readiness' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'SOC2' from expertise_taxonomy where slug='soc2-readiness' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'SOC 2 Type II' from expertise_taxonomy where slug='soc2-readiness' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'part-time CFO' from expertise_taxonomy where slug='fractional-cfo' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'interim CFO' from expertise_taxonomy where slug='fractional-cfo' on conflict do nothing;
insert into expertise_aliases (expertise_id, alias) select id, 'outsourced CFO' from expertise_taxonomy where slug='fractional-cfo' on conflict do nothing;

-- Relationships (related_to / commonly_used_with) so related-match credit fires.
insert into expertise_relationships (from_expertise_id, to_expertise_id, relationship_type, weight)
select a.id, b.id, 'related_to', 60 from expertise_taxonomy a, expertise_taxonomy b
where (a.slug, b.slug) in (
  ('aws-architecture','cloud-architecture'),
  ('azure-administration','cloud-architecture'),
  ('kubernetes-deployment','devops'),
  ('api-integration','systems-integration'),
  ('stripe-connect-implementation','api-integration'),
  ('soc2-readiness','iso27001-implementation'),
  ('cyber-security-audit','iso27001-implementation'),
  ('kyc-review','aml-review'),
  ('client-due-diligence','kyc-review'),
  ('fund-administration','trust-administration'),
  ('google-ads','meta-ads-lead-generation'),
  ('linkedin-ads','meta-ads-lead-generation'),
  ('hubspot-automation','crm-implementation'),
  ('ga4-setup','analytics-reporting'),
  ('cro','funnel-build'),
  ('programme-management','project-management'),
  ('change-management','business-transformation'),
  ('fractional-coo','operations-management'),
  ('fractional-cfo','financial-reporting'),
  ('board-advisory','corporate-governance')
) on conflict do nothing;
