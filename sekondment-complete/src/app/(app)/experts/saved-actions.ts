'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/* Save / unsave an expert to a business's shortlist. Businesses only. */

async function myBusinessId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('business_profiles').select('id').eq('account_id', userId).single();
  return data?.id ?? null;
}

export async function toggleSavedExpert(expertId: string, currentlySaved: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const businessId = await myBusinessId(supabase, user.id);
  if (!businessId) return { error: 'Only businesses can save experts.' };

  if (currentlySaved) {
    const { error } = await supabase
      .from('saved_experts')
      .delete()
      .eq('business_id', businessId)
      .eq('expert_id', expertId)
      .eq('shortlist', '');
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('saved_experts')
      .insert({ business_id: businessId, expert_id: expertId, shortlist: '' });
    if (error && error.code !== '23505') return { error: error.message };
  }

  revalidatePath('/experts');
  revalidatePath('/saved');
  return { success: true, saved: !currentlySaved };
}

// ─── SAVED OPPORTUNITIES (experts) ──────────────────────────────────────────
export async function toggleSavedOpportunity(opportunityId: string, currentlySaved: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: expert } = await supabase
    .from('expert_profiles').select('id').eq('account_id', user.id).single();
  if (!expert) return { error: 'Only experts can save opportunities.' };

  if (currentlySaved) {
    const { error } = await supabase.from('saved_opportunities')
      .delete().eq('expert_id', expert.id).eq('opportunity_id', opportunityId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('saved_opportunities')
      .insert({ expert_id: expert.id, opportunity_id: opportunityId });
    if (error && error.code !== '23505') return { error: error.message };
  }

  revalidatePath('/opportunities');
  revalidatePath('/saved');
  return { success: true, saved: !currentlySaved };
}
