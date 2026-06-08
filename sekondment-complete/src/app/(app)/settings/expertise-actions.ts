'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/* ============================================================================
   Expertise intelligence — server actions.
   Search is alias-aware: a query matches taxonomy names AND their aliases.
   ========================================================================== */

/** Alias-aware expertise search for the picker. Returns taxonomy rows. */
export async function searchExpertise(query: string) {
  const supabase = await createClient();
  const q = query.trim();
  if (!q) return [];

  // Direct name/slug matches.
  const { data: byName } = await supabase
    .from('expertise_taxonomy')
    .select('id, name, slug, type, commercial_value_score, ai_resistance_score')
    .eq('is_active', true)
    .ilike('name', `%${q}%`)
    .limit(10);

  // Alias matches -> resolve to taxonomy.
  const { data: aliasHits } = await supabase
    .from('expertise_aliases')
    .select('expertise_id, alias, expertise_taxonomy(id, name, slug, type, commercial_value_score, ai_resistance_score)')
    .ilike('alias', `%${q}%`)
    .limit(10);

  const map = new Map<string, any>();
  (byName ?? []).forEach((r) => map.set(r.id, r));
  (aliasHits ?? []).forEach((a: any) => { if (a.expertise_taxonomy) map.set(a.expertise_taxonomy.id, a.expertise_taxonomy); });
  return Array.from(map.values()).slice(0, 12);
}

/** Add (or update) a structured expertise on the current expert's profile. */
export async function addProfileExpertise(expertiseId: string, level = 3, years?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: expert } = await supabase
    .from('expert_profiles').select('id').eq('account_id', user.id).single();
  if (!expert) return { error: 'Only experts can add expertise.' };

  const { error } = await supabase.from('profile_expertise').upsert({
    profile_id: expert.id,
    profile_type: 'expert',
    expertise_id: expertiseId,
    declared_level: level,
    years_experience: years ?? null,
    verification_level: 'declared',
  }, { onConflict: 'profile_id,profile_type,expertise_id' });
  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { success: true };
}

export async function removeProfileExpertise(expertiseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  const { data: expert } = await supabase.from('expert_profiles').select('id').eq('account_id', user.id).single();
  if (!expert) return { error: 'Forbidden.' };

  await supabase.from('profile_expertise')
    .delete().eq('profile_id', expert.id).eq('profile_type', 'expert').eq('expertise_id', expertiseId);
  revalidatePath('/settings');
  return { success: true };
}

/** Business defines a required expertise on an opportunity. */
export async function addOpportunityRequirement(
  opportunityId: string, expertiseId: string,
  importance: 'required' | 'preferred' | 'optional' = 'required', level = 3
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { error } = await supabase.from('project_expertise_requirements').upsert({
    opportunity_id: opportunityId,
    expertise_id: expertiseId,
    importance,
    required_level: level,
  }, { onConflict: 'opportunity_id,expertise_id' });
  if (error) return { error: error.message };

  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: true };
}

export async function removeOpportunityRequirement(opportunityId: string, expertiseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  await supabase.from('project_expertise_requirements')
    .delete().eq('opportunity_id', opportunityId).eq('expertise_id', expertiseId);
  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: true };
}
