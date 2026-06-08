'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { recomputeTrustScore } from '@/lib/trust/recompute';
import { revalidatePath } from 'next/cache';

/* ============================================================================
   Admin verification queue actions.
   Admins toggle the granular verification flags on expert / business profiles.
   Each change recomputes that account's Trust Score (verification is weighted).
   ========================================================================== */

type ExpertFlag = 'identity_verified' | 'linkedin_verified' | 'certification_verified' | 'email_verified';
type BusinessFlag = 'company_verified' | 'director_verified' | 'email_verified';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' as const };
  const svc = createServiceClient();
  const { data: me } = await svc.from('accounts').select('account_type').eq('id', user.id).single();
  if (me?.account_type !== 'admin') return { error: 'Admin only.' as const };
  return { svc, adminId: user.id };
}

export async function setExpertVerification(
  expertId: string,
  flag: ExpertFlag,
  value: boolean
) {
  const guard = await assertAdmin();
  if ('error' in guard) return guard;
  const { svc } = guard;

  const { data: expert } = await svc.from('expert_profiles').select('account_id').eq('id', expertId).single();
  if (!expert) return { error: 'Expert not found.' };

  const patch: Record<string, any> = { [flag]: value };
  // If any verification flag is on, mark status verified; if all off, unverified.
  await svc.from('expert_profiles').update(patch).eq('id', expertId);

  const { data: updated } = await svc
    .from('expert_profiles')
    .select('email_verified, identity_verified, linkedin_verified, certification_verified')
    .eq('id', expertId).single();
  const anyVerified = updated && Object.values(updated).some(Boolean);
  await svc.from('expert_profiles')
    .update({ verification_status: anyVerified ? 'verified' : 'unverified' })
    .eq('id', expertId);

  await recomputeTrustScore(expert.account_id);
  revalidatePath('/admin/verification');
  return { success: true };
}

export async function setBusinessVerification(
  businessId: string,
  flag: BusinessFlag,
  value: boolean
) {
  const guard = await assertAdmin();
  if ('error' in guard) return guard;
  const { svc } = guard;

  const { data: biz } = await svc.from('business_profiles').select('account_id').eq('id', businessId).single();
  if (!biz) return { error: 'Business not found.' };

  await svc.from('business_profiles').update({ [flag]: value }).eq('id', businessId);

  const { data: updated } = await svc
    .from('business_profiles')
    .select('email_verified, company_verified, director_verified')
    .eq('id', businessId).single();
  const anyVerified = updated && Object.values(updated).some(Boolean);
  await svc.from('business_profiles')
    .update({ verification_status: anyVerified ? 'verified' : 'unverified' })
    .eq('id', businessId);

  await recomputeTrustScore(biz.account_id);
  revalidatePath('/admin/verification');
  return { success: true };
}
