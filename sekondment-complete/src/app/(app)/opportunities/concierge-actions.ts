'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/platform/access';
import { revalidatePath } from 'next/cache';

/* A business asks the platform to find experts for them (cold-start solver).
   Guarantees a response within the target window; staff source candidates. */
export async function requestConcierge(input: { brief: string; opportunityId?: string }): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Please sign in.' };
  if (!input.brief?.trim() || input.brief.trim().length < 8) return { ok: false, error: 'Tell us a little more about what you need.' };

  const { data: biz } = await supabase.from('business_profiles').select('id').eq('account_id', user.id).maybeSingle();
  if (!biz) return { ok: false, error: 'Business profile not found.' };

  const target = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h guarantee
  const svc = createServiceClient();
  const { error } = await svc.from('concierge_requests').insert({
    business_id: biz.id,
    opportunity_id: input.opportunityId ?? null,
    brief: input.brief.trim(),
    target_response_by: target.toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  // Notify staff (audit trail; a real notification/email hook can attach here).
  await auditLog({ actorId: user.id, action: 'concierge_requested', entityType: 'concierge_requests', metadata: { brief: input.brief.slice(0, 80) } });
  revalidatePath('/dashboard');
  return { ok: true };
}
