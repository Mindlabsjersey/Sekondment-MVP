'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { recomputeTrustScore } from '@/lib/trust/recompute';
import { logCompliance } from '@/lib/compliance/log';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' as const };
  const { data: me } = await supabase.from('accounts').select('account_type').eq('id', user.id).single();
  if (me?.account_type !== 'admin') return { error: 'Admin only.' as const };
  return { svc: createServiceClient() };
}

export async function setAccountStatus(accountId: string, status: 'active' | 'warned' | 'suspended') {
  const g = await assertAdmin();
  if ('error' in g) return g;
  const now = new Date().toISOString();
  const patch: Record<string, any> = { status };
  if (status === 'warned') patch.warned_at = now;
  if (status === 'suspended') patch.suspended_at = now;
  const { error } = await g.svc.from('accounts').update(patch).eq('id', accountId);
  if (error) return { error: error.message };
  if (status === 'warned') await logCompliance({ type: 'account_warned', accountId });
  if (status === 'suspended') await logCompliance({ type: 'account_suspended', accountId });
  revalidatePath('/admin/users');
  return { success: true };
}

export async function saveAdminNotes(accountId: string, notes: string) {
  const g = await assertAdmin();
  if ('error' in g) return g;
  const { error } = await g.svc.from('accounts').update({ admin_notes: notes }).eq('id', accountId);
  if (error) return { error: error.message };
  revalidatePath('/admin/users');
  return { success: true };
}

export async function adminRecomputeTrust(accountId: string) {
  const g = await assertAdmin();
  if ('error' in g) return g;
  await recomputeTrustScore(accountId);
  revalidatePath('/admin/users');
  return { success: true };
}
