'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Approve or decline an employee who matched themselves to the caller's
 * Business. Authorisation + the status change happen inside the
 * respond_to_employee() SQL function (it verifies the caller owns the Business).
 */
export async function respondToEmployee(expertId: string, approve: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { error } = await supabase.rpc('respond_to_employee', {
    p_expert_id: expertId,
    p_approve: approve,
  });
  if (error) return { error: error.message };

  revalidatePath('/employees');
  return { ok: true };
}
