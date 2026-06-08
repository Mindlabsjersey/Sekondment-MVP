'use server';

import { createServiceClient } from '@/lib/supabase/server';
import {
  computeTrustScore,
  expertProfileCompleteness,
  businessProfileCompleteness,
  type TrustFactors,
} from '@/lib/trust/score';

/* ============================================================================
   Recomputes and persists the Trust Score for any account.
   Called from:
     - review-actions.ts (after a review is submitted)
     - onboarding actions (after profile saved)
     - verification updates (after admin verifies)
   Uses the service client because it reads across multiple tables; RLS would
   block cross-table reads from the user's own session.
   ========================================================================== */

export async function recomputeTrustScore(accountId: string): Promise<number> {
  const svc = createServiceClient();

  // Determine account type to know which profile table to hit.
  const { data: account } = await svc
    .from('accounts').select('account_type').eq('id', accountId).single();
  if (!account) return 0;

  const isExpert = account.account_type === 'expert';
  const isBusiness = account.account_type === 'business';
  if (!isExpert && !isBusiness) return 0;

  // ── Verification & profile fields ────────────────────────────────────────
  let verification = { email: false, identity: false, linkedin: false, cert: false };
  let completeness = 0;
  let profileId = '';

  if (isExpert) {
    const { data: p } = await svc.from('expert_profiles').select('*').eq('account_id', accountId).single();
    if (!p) return 0;
    profileId = p.id;
    verification = { email: p.email_verified, identity: p.identity_verified, linkedin: p.linkedin_verified, cert: p.certification_verified };
    completeness = expertProfileCompleteness(p);
  } else {
    const { data: p } = await svc.from('business_profiles').select('*').eq('account_id', accountId).single();
    if (!p) return 0;
    profileId = p.id;
    verification = { email: p.email_verified, identity: false, linkedin: false, cert: false };
    completeness = businessProfileCompleteness(p);
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  const { data: reviews } = await svc
    .from('reviews')
    .select('r_expertise,r_communication,r_reliability,r_outcome_achievement,r_value_delivered,r_payment_reliability,r_professionalism,r_scope_clarity,r_responsiveness')
    .eq('reviewee_id', accountId);

  let avgReview = 0;
  const reviewCount = reviews?.length ?? 0;
  if (reviewCount > 0) {
    let sum = 0, count = 0;
    for (const r of reviews!) {
      for (const v of Object.values(r)) {
        if (typeof v === 'number') { sum += v; count++; }
      }
    }
    avgReview = count > 0 ? sum / count : 0;
  }

  // ── Engagement stats ──────────────────────────────────────────────────────
  const col = isExpert ? 'expert_id' : 'business_id';
  const { data: engagements } = await svc
    .from('engagements')
    .select('id, status, ' + (isExpert ? 'business_id' : 'expert_id'))
    .eq(col, profileId);

  const total = engagements?.length ?? 0;
  const completed = engagements?.filter((e) => e.status === 'complete').length ?? 0;

  // Count distinct counterparties who engaged more than once (repeat engagement metric).
  const counterpartyField = isExpert ? 'business_id' : 'expert_id';
  const counterpartyCounts: Record<string, number> = {};
  for (const e of engagements ?? []) {
    const cp = (e as any)[counterpartyField];
    counterpartyCounts[cp] = (counterpartyCounts[cp] ?? 0) + 1;
  }
  const repeatEngagements = Object.values(counterpartyCounts).filter((n) => n > 1).length;

  // ── Disputes raised AGAINST this account, resolved unfavourably ───────────
  const { count: disputesAgainst } = await svc
    .from('disputes')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'resolved_refund') // refund means the dispute was upheld against payee
    .not('raised_by', 'eq', accountId);

  // ── Compute ──────────────────────────────────────────────────────────────
  const factors: TrustFactors = {
    emailVerified: verification.email,
    identityVerified: verification.identity,
    linkedinVerified: verification.linkedin,
    certificationVerified: verification.cert,
    profileCompleteness: completeness,
    completedEngagements: completed,
    totalAcceptedEngagements: total,
    repeatEngagements,
    avgReview,
    reviewCount,
    disputesAgainst: disputesAgainst ?? 0,
  };

  const { score } = computeTrustScore(factors);

  // ── Persist ───────────────────────────────────────────────────────────────
  await svc.from('trust_score_factors').upsert({
    account_id: accountId,
    verification_level: [verification.email, verification.identity, verification.linkedin, verification.cert].filter(Boolean).length,
    avg_review: avgReview,
    completion_rate: total > 0 ? (completed / total) * 100 : 0,
    repeat_engagements: repeatEngagements,
    dispute_count: disputesAgainst ?? 0,
    profile_completeness: completeness * 100,
    computed_at: new Date().toISOString(),
  }, { onConflict: 'account_id' });

  // Update the score on the profile row itself (what gets displayed everywhere).
  const table = isExpert ? 'expert_profiles' : 'business_profiles';
  await svc.from(table).update({ trust_score: score }).eq('account_id', accountId);

  return score;
}
