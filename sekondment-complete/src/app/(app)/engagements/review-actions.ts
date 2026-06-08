'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { recomputeTrustScore } from '@/lib/trust/recompute';

/* ============================================================================
   Two-sided reviews. The reviewer's account_type determines which rating
   columns apply:
     business -> expert : expertise, communication, reliability,
                          outcome_achievement, value_delivered
     expert -> business : communication (mapped), payment_reliability,
                          professionalism, scope_clarity, responsiveness
   Only allowed once an engagement is complete, and once per reviewer.
   ========================================================================== */

export async function submitReview(engagementId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  // Load engagement + both parties' account ids; confirm caller is a party.
  const { data: eng } = await supabase
    .from('engagements')
    .select(`
      id, status,
      business_profiles!inner(account_id),
      expert_profiles!inner(accounts!inner(id))
    `)
    .eq('id', engagementId)
    .single();

  if (!eng) return { error: 'Engagement not found.' };

  const businessAccountId = (eng as any).business_profiles.account_id;
  const expertAccountId = (eng as any).expert_profiles.accounts.id;

  const isBusinessReviewer = user.id === businessAccountId;
  const isExpertReviewer = user.id === expertAccountId;
  if (!isBusinessReviewer && !isExpertReviewer) return { error: 'You are not part of this engagement.' };

  if (eng.status !== 'complete') {
    return { error: 'You can review once all milestones are released.' };
  }

  const revieweeId = isBusinessReviewer ? expertAccountId : businessAccountId;
  const num = (k: string) => {
    const v = formData.get(k);
    return v ? Number(v) : null;
  };

  // Build the row with only the relevant direction's columns populated.
  const base = {
    engagement_id: engagementId,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    comment: String(formData.get('comment') || '') || null,
  };

  const ratings = isBusinessReviewer
    ? {
        r_expertise: num('r_expertise'),
        r_communication: num('r_communication'),
        r_reliability: num('r_reliability'),
        r_outcome_achievement: num('r_outcome_achievement'),
        r_value_delivered: num('r_value_delivered'),
      }
    : {
        r_communication: num('r_communication'),
        r_payment_reliability: num('r_payment_reliability'),
        r_professionalism: num('r_professionalism'),
        r_scope_clarity: num('r_scope_clarity'),
        r_responsiveness: num('r_responsiveness'),
      };

  const svc = createServiceClient();
  const { error } = await svc.from('reviews').insert({ ...base, ...ratings });
  if (error) {
    if (error.code === '23505') return { error: 'You have already reviewed this engagement.' };
    return { error: error.message };
  }

  // Recompute the full Trust Score for both parties (not just the avg).
  await recomputeTrustScore(revieweeId);
  // Also recompute reviewer's score (completing engagements + reviewing improves it).
  await recomputeTrustScore(user.id);

  await svc.from('activity_events').insert({
    engagement_id: engagementId,
    actor_id: user.id,
    event_type: 'review_submitted',
    detail: { reviewee_id: revieweeId },
  });

  revalidatePath(`/engagements/${engagementId}`);
  return { success: true };
}
