'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { computeMatch, type Requirement, type CandidateSignals } from '@/lib/matching/engine';
import { revalidatePath } from 'next/cache';

/* Compute rule-based matches for an opportunity against listed experts who hold
   any of the required expertise. Caches results in match_recommendations. */

export async function computeMatchesForOpportunity(opportunityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const svc = createServiceClient();

  // Opportunity + its requirements.
  const { data: opp } = await svc
    .from('opportunities')
    .select('id, budget_max, work_mode, business_profiles!inner(account_id)')
    .eq('id', opportunityId).single();
  if (!opp) return { error: 'Opportunity not found.' };
  if ((opp as any).business_profiles.account_id !== user.id) return { error: 'Forbidden.' };

  const { data: reqRows } = await svc
    .from('project_expertise_requirements')
    .select('expertise_id, importance, required_level, required_verification_level, expertise_taxonomy(name)')
    .eq('opportunity_id', opportunityId);

  if (!reqRows || reqRows.length === 0) return { error: 'Add required expertise first.' };

  const requirements: Requirement[] = reqRows.map((r: any) => ({
    expertiseId: r.expertise_id,
    name: r.expertise_taxonomy?.name ?? 'Expertise',
    importance: r.importance,
    requiredLevel: r.required_level,
    requiredVerification: r.required_verification_level,
  }));
  const reqIds = requirements.map((r) => r.expertiseId);

  // Candidate experts: those holding any required expertise (listed only).
  const { data: holders } = await svc
    .from('profile_expertise')
    .select('profile_id, expertise_id, declared_level, verification_level')
    .in('expertise_id', reqIds)
    .eq('profile_type', 'expert');

  const byProfile = new Map<string, any[]>();
  (holders ?? []).forEach((h: any) => {
    if (!byProfile.has(h.profile_id)) byProfile.set(h.profile_id, []);
    byProfile.get(h.profile_id)!.push(h);
  });

  // Pull candidate signals.
  const profileIds = Array.from(byProfile.keys());
  if (profileIds.length === 0) return { success: true, matched: 0 };

  const { data: experts } = await svc
    .from('expert_profiles')
    .select('id, daily_rate, trust_score, verification_status, remote_available, visibility')
    .in('id', profileIds)
    .eq('visibility', 'listed');

  const results = [];
  for (const ex of experts ?? []) {
    const expertise = (byProfile.get(ex.id) ?? []).map((h: any) => ({
      expertiseId: h.expertise_id, declaredLevel: h.declared_level, verificationLevel: h.verification_level,
    }));
    const signals: CandidateSignals = {
      expertise,
      trustScore: ex.trust_score,
      verified: ex.verification_status === 'verified',
      rateWithinBudget: opp.budget_max ? Number(ex.daily_rate ?? 0) <= Number(opp.budget_max) : undefined,
      workModeOk: opp.work_mode === 'remote' ? ex.remote_available : undefined,
    };
    const m = computeMatch(requirements, signals);
    results.push({
      opportunity_id: opportunityId, profile_id: ex.id, profile_type: 'expert',
      score: m.score, reasons: m.reasons, missing: m.missing,
    });
  }

  // Cache (upsert).
  if (results.length > 0) {
    await svc.from('match_recommendations')
      .upsert(results, { onConflict: 'opportunity_id,profile_id,profile_type' });
  }

  // Refresh marketplace-intelligence demand stats for each required expertise.
  for (const r of reqIds) {
    await svc.rpc('refresh_expertise_demand', { exp_id: r });
  }

  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: true, matched: results.length };
}
