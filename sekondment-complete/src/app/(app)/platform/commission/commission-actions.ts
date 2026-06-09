'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getPlatformRole, auditLog } from '@/lib/platform/access';
import { revalidatePath } from 'next/cache';

/* Owner-only: set the site-wide default platform fee. Audit-logged. */
export async function setSiteFee(pct: number): Promise<{ ok: boolean; error?: string }> {
  const role = await getPlatformRole();
  if (role !== 'platform_owner') return { ok: false, error: 'Only the platform owner can change the site-wide fee.' };
  if (!(pct >= 0 && pct <= 100)) return { ok: false, error: 'Fee must be between 0 and 100.' };

  const { data: { user } } = await (await createClient()).auth.getUser();
  const svc = createServiceClient();
  const { error } = await svc.from('platform_settings')
    .update({ default_fee_pct: pct, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) return { ok: false, error: error.message };

  await auditLog({ actorId: user?.id ?? null, actorRole: role, action: 'changed_site_fee', entityType: 'platform_settings', metadata: { default_fee_pct: pct } });
  revalidatePath('/platform/commission');
  return { ok: true };
}

/* Owner-only: set or clear a per-company fee override. */
export async function setCompanyFee(businessId: string, pct: number | null): Promise<{ ok: boolean; error?: string }> {
  const role = await getPlatformRole();
  if (role !== 'platform_owner') return { ok: false, error: 'Only the platform owner can override a company fee.' };
  if (pct != null && !(pct >= 0 && pct <= 100)) return { ok: false, error: 'Fee must be between 0 and 100.' };

  const { data: { user } } = await (await createClient()).auth.getUser();
  const svc = createServiceClient();
  const { error } = await svc.from('business_profiles').update({ fee_pct_override: pct }).eq('id', businessId);
  if (error) return { ok: false, error: error.message };

  await auditLog({ actorId: user?.id ?? null, actorRole: role, action: pct == null ? 'cleared_company_fee' : 'set_company_fee', entityType: 'business_profiles', entityId: businessId, metadata: { fee_pct_override: pct } });
  revalidatePath('/platform/commission');
  return { ok: true };
}
