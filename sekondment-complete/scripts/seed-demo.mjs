#!/usr/bin/env node
/**
 * Sekondment — DEMO DATA SEED
 * ---------------------------------------------------------------------------
 * Populates a live Supabase project with believable demo data so every dashboard
 * and the matching engine have something to show. Run AFTER migrations 0001->0028.
 *
 * Why Node (not pure SQL): accounts.id references auth.users(id), so we must create
 * real auth users first via the admin API, then insert profile/marketplace rows.
 *
 * USAGE:
 *   1. Have .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   2. npm i -D @supabase/supabase-js dotenv   (if not already)
 *   3. node scripts/seed-demo.mjs
 *
 * All demo users share the password below so you can log in and explore as any of them.
 * SAFE TO RE-RUN: it checks for existing demo users by email and skips creation.
 * To wipe: delete the auth users whose email ends @demo.sekondment.dev (cascades).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Minimal .env.local loader (no extra deps — matches apply-migrations.mjs).
try {
  const raw = readFileSync('.env.local', 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* ignore */ }

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing Supabase env vars in .env.local'); process.exit(1); }

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const PASSWORD = 'Demo!2026Sekondment';
const DOMAIN = 'demo.sekondment.dev';

// ── helper: create (or fetch) an auth user + accounts row ──────────────────
async function ensureUser(email, accountType, fullName) {
  // Try to find existing.
  const { data: list } = await db.auth.admin.listUsers();
  let user = list?.users?.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: fullName, account_type: accountType },
    });
    if (error) { console.error('createUser', email, error.message); return null; }
    user = data.user;
  }
  // Upsert the accounts row (a trigger may already create one).
  await db.from('accounts').upsert({
    id: user.id, account_type: accountType, email, full_name: fullName, email_verified: true,
  }, { onConflict: 'id' });
  return user.id;
}

async function taxId(slug) {
  const { data } = await db.from('expertise_taxonomy').select('id').eq('slug', slug).maybeSingle();
  return data?.id ?? null;
}

async function main() {
  console.log('▶ Seeding demo data…');

  // ── EXPERTS ───────────────────────────────────────────────────────────
  const experts = [
    { e: 'priya', name: 'Priya Nair', headline: 'Fractional payments architect',
      skills: ['Stripe Connect', 'API Integration', 'Cloud'], industries: ['Technology'],
      daily: 750, trust: 92, exp: ['stripe-connect-implementation', 'api-integration'] },
    { e: 'david', name: 'David Lewis', headline: 'AML / KYC compliance specialist',
      skills: ['AML', 'KYC', 'Due Diligence'], industries: ['Finance'],
      daily: 580, trust: 81, exp: ['aml-review', 'kyc-review'] },
    { e: 'maria', name: 'Maria Santos', headline: 'M365 & cloud migration specialist',
      skills: ['Microsoft 365', 'Azure'], industries: ['Technology'],
      daily: 600, trust: 78, exp: ['microsoft-365-migration'] },
    { e: 'aisha', name: 'Aisha Brahim', headline: 'Trust & fund administration',
      skills: ['Trust Administration', 'Fund Administration'], industries: ['Finance'],
      daily: 650, trust: 88, exp: ['trust-administration', 'fund-administration'] },
    { e: 'sofia', name: 'Sofia Marino', headline: 'Growth marketer — paid + lifecycle',
      skills: ['Meta Ads', 'Google Ads', 'HubSpot'], industries: ['Marketing'],
      daily: 520, trust: 76, exp: ['meta-ads-lead-generation', 'hubspot-automation'] },
    { e: 'marcus', name: 'Marcus Allen', headline: 'Fractional CFO — scale-ups',
      skills: ['Fractional CFO', 'Regulatory Reporting'], industries: ['Leadership'],
      daily: 950, trust: 94, exp: ['fractional-cfo'] },
    { e: 'tom', name: 'Tom Reed', headline: 'Security & compliance lead',
      skills: ['ISO27001', 'SOC2'], industries: ['Technology'],
      daily: 680, trust: 85, exp: ['iso27001-implementation'] },
    { e: 'helena', name: 'Helena Vos', headline: 'Transformation & change lead',
      skills: ['Business Transformation', 'Change Management'], industries: ['Operations'],
      daily: 820, trust: 90, exp: ['business-transformation'] },
  ];

  const expertIds = {};
  for (const x of experts) {
    const acc = await ensureUser(`${x.e}@${DOMAIN}`, 'expert', x.name);
    if (!acc) continue;
    const { data: prof } = await db.from('expert_profiles').upsert({
      account_id: acc, name: x.name, headline: x.headline, bio: `${x.headline}. Available for fractional and project work.`,
      skills: x.skills, industries: x.industries, daily_rate: x.daily, hourly_rate: Math.round(x.daily / 8),
      verification_status: x.trust > 85 ? 'verified' : 'pending', trust_score: x.trust, email_verified: true,
    }, { onConflict: 'account_id' }).select('id').single();
    expertIds[x.e] = prof?.id;
    // structured expertise
    for (const slug of x.exp) {
      const tid = await taxId(slug);
      if (tid && prof) await db.from('profile_expertise').upsert({
        profile_id: prof.id, profile_type: 'expert', expertise_id: tid,
        level: 5, verification_level: x.trust > 85 ? 'proven' : 'verified', years_experience: 6, project_count: 3,
      }, { onConflict: 'profile_id,profile_type,expertise_id' });
    }
  }
  console.log(`  ✓ ${Object.keys(expertIds).length} experts`);

  // ── BUSINESSES ────────────────────────────────────────────────────────
  const businesses = [
    { e: 'northbank', name: 'Northbank Capital', industry: 'Finance', loc: 'Jersey' },
    { e: 'lumio', name: 'Lumio SaaS', industry: 'Technology', loc: 'London, UK' },
    { e: 'meridian', name: 'Meridian Trust', industry: 'Finance', loc: 'Jersey' },
    { e: 'brightwave', name: 'Brightwave Retail', industry: 'Marketing', loc: 'Dublin, Ireland' },
  ];
  const bizIds = {};
  for (const b of businesses) {
    const acc = await ensureUser(`${b.e}@${DOMAIN}`, 'business', b.name);
    if (!acc) continue;
    const { data: prof } = await db.from('business_profiles').upsert({
      account_id: acc, company_name: b.name, industry: b.industry, location: b.loc,
      description: `${b.name} — ${b.industry}.`, verification_status: 'verified', trust_score: 80, email_verified: true,
    }, { onConflict: 'account_id' }).select('id').single();
    bizIds[b.e] = prof?.id;
  }
  console.log(`  ✓ ${Object.keys(bizIds).length} businesses`);

  // ── OPPORTUNITIES ───────────────────────────────────────────────────────
  // outcome must be a valid outcome_type enum; the sentence goes in description.
  const opps = [
    { biz: 'lumio', title: 'Implement Stripe Connect for our marketplace', industry: 'Technology',
      oc: 'launch_product', desc: 'Marketplace payments live with escrow + split payouts', min: 8000, max: 15000, mode: 'remote', exp: ['stripe-connect-implementation'] },
    { biz: 'northbank', title: 'AML review & KYC onboarding overhaul', industry: 'Finance',
      oc: 'improve_compliance', desc: 'Compliant AML/KYC process documented and implemented', min: 10000, max: 20000, mode: 'hybrid', exp: ['aml-review', 'kyc-review'] },
    { biz: 'meridian', title: 'Trust administration interim support', industry: 'Finance',
      oc: 'improve_operations', desc: 'Trust admin backlog cleared, processes documented', min: 6000, max: 12000, mode: 'on_site', exp: ['trust-administration'] },
    { biz: 'brightwave', title: 'Scale paid acquisition (Meta + Google)', industry: 'Marketing',
      oc: 'improve_marketing', desc: 'CAC down 20%, ROAS up across channels', min: 4000, max: 9000, mode: 'remote', exp: ['meta-ads-lead-generation'] },
    { biz: 'lumio', title: 'ISO27001 readiness', industry: 'Technology',
      oc: 'improve_compliance', desc: 'ISO27001 implementation plan + controls in place', min: 12000, max: 25000, mode: 'remote', exp: ['iso27001-implementation'] },
  ];
  const oppIds = [];
  for (const o of opps) {
    if (!bizIds[o.biz]) continue;
    const { data: opp, error: oppErr } = await db.from('opportunities').insert({
      business_id: bizIds[o.biz], title: o.title, description: o.desc, desired_outcome: o.oc,
      industry: o.industry, budget_min: o.min, budget_max: o.max, work_mode: o.mode, status: 'open',
    }).select('id').single();
    if (oppErr) console.error('  opportunity failed:', o.title, oppErr.message);
    if (opp) {
      oppIds.push(opp.id);
      for (const slug of o.exp) {
        const tid = await taxId(slug);
        if (tid) await db.from('project_expertise_requirements').insert({
          opportunity_id: opp.id, expertise_id: tid, importance: 'required', min_level: 3, min_verification: 'verified',
        }).then(() => {}, () => {});
      }
    }
  }
  console.log(`  ✓ ${oppIds.length} opportunities`);

  // ── A COMPLETED ENGAGEMENT (so money & reviews exist) ───────────────────
  if (bizIds.lumio && expertIds.priya) {
    const acc = (await db.from('expert_profiles').select('account_id').eq('id', expertIds.priya).single()).data?.account_id;
    const { data: eng } = await db.from('engagements').insert({
      opportunity_id: oppIds[0] ?? null, business_id: bizIds.lumio, expert_id: expertIds.priya,
      payee_type: 'expert', payee_account_id: acc, title: 'Stripe Connect implementation',
      total_amount: 12000, platform_fee_pct: 15, currency: 'GBP', status: 'active',
    }).select('id').single();
    if (eng) {
      const { data: ms } = await db.from('milestones').insert([
        { engagement_id: eng.id, sort_order: 1, title: 'Discovery & architecture', amount: 4000, status: 'released', funded_at: new Date(Date.now()-12*864e5).toISOString(), released_at: new Date(Date.now()-9*864e5).toISOString() },
        { engagement_id: eng.id, sort_order: 2, title: 'Build & integrate', amount: 5000, status: 'funded', funded_at: new Date(Date.now()-3*864e5).toISOString() },
        { engagement_id: eng.id, sort_order: 3, title: 'Testing & handover', amount: 3000, status: 'pending' },
      ]).select('id, amount, status');
      // ledger entries for the released milestone (fund + fee + transfer)
      const released = (ms ?? []).find((m) => m.status === 'released');
      const funded = (ms ?? []).find((m) => m.status === 'funded');
      const entries = [];
      if (released) {
        entries.push({ engagement_id: eng.id, milestone_id: released.id, entry_type: 'fund', amount: released.amount, currency: 'GBP', stripe_object_id: 'pi_demo_1' });
        entries.push({ engagement_id: eng.id, milestone_id: released.id, entry_type: 'fee', amount: released.amount * 0.15, currency: 'GBP', stripe_object_id: 'ch_demo_1' });
        entries.push({ engagement_id: eng.id, milestone_id: released.id, entry_type: 'transfer_expert', amount: released.amount * 0.85, currency: 'GBP', stripe_object_id: 'tr_demo_1' });
      }
      if (funded) entries.push({ engagement_id: eng.id, milestone_id: funded.id, entry_type: 'fund', amount: funded.amount, currency: 'GBP', stripe_object_id: 'pi_demo_2' });
      for (const en of entries) await db.from('ledger_entries').insert(en).then(() => {}, () => {});
      // a review
      await db.from('reviews').insert({
        engagement_id: eng.id, reviewer_id: (await db.from('business_profiles').select('account_id').eq('id', bizIds.lumio).single()).data?.account_id,
        reviewee_id: acc, r_expertise: 5, r_communication: 5, r_reliability: 4, r_outcome_achievement: 5, r_value_delivered: 5,
        comment: 'Outstanding — delivered ahead of schedule.',
      }).then(() => {}, () => {});
      console.log('  ✓ 1 engagement with milestones, ledger, review');
    }
  }

  // ── CRM leads (so the Ops Centre CRM has rows) ──────────────────────────
  await db.from('crm_leads').insert([
    { company_name: 'Channel Islands Bank', contact_name: 'R. Le Brun', country: 'Jersey', industry: 'Finance', stage: 'demo_booked', estimated_value: 25000, lead_source: 'referral' },
    { company_name: 'Dubai FinServ Group', contact_name: 'A. Hassan', country: 'UAE', industry: 'Finance', stage: 'contacted', estimated_value: 60000, lead_source: 'outbound' },
    { company_name: 'Galway Tech', contact_name: 'S. Walsh', country: 'Ireland', industry: 'Technology', stage: 'trial', estimated_value: 15000, lead_source: 'inbound' },
  ]).then(() => {}, () => {});
  console.log('  ✓ CRM leads');

  console.log('\n✅ Demo seed complete. Log in with any demo email + password:');
  console.log(`   e.g. lumio@${DOMAIN} (business) / priya@${DOMAIN} (expert)`);
  console.log(`   password: ${PASSWORD}`);
  console.log('   Then seed yourself as platform_owner to see the Ops Centre.');
}

main().catch((e) => { console.error(e); process.exit(1); });
