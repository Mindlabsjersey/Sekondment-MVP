'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ExpertCategory } from '@/lib/types/database';
import { recomputeTrustScore } from '@/lib/trust/recompute';

function splitList(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Persist global-readiness fields onto the user's account row. */
async function saveAccountGlobalFields(supabase: any, userId: string, formData: FormData) {
  const patch: Record<string, any> = {};
  const country = String(formData.get('country') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const timezone = String(formData.get('timezone') || '').trim();
  const cur = String(formData.get('preferred_currency') || '').trim().toUpperCase().slice(0, 3);
  if (country) patch.country = country;
  if (city) patch.city = city;
  if (timezone) patch.timezone = timezone;
  if (cur) patch.preferred_currency = cur;
  patch.open_to_international = formData.get('open_to_international') === 'true';
  if (Object.keys(patch).length > 0) {
    await supabase.from('accounts').update(patch).eq('id', userId);
  }
}

export async function saveBusinessProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const payload = {
    account_id: user.id,
    company_name: String(formData.get('company_name') || '').trim(),
    industry: String(formData.get('industry') || '') || null,
    website: String(formData.get('website') || '') || null,
    description: String(formData.get('description') || '') || null,
    location: String(formData.get('location') || '') || null,
    company_size: String(formData.get('company_size') || '') || null,
  };

  if (!payload.company_name) return { error: 'Company name is required.' };

  // upsert on account_id (unique) so re-running onboarding edits the same row
  const { error } = await supabase
    .from('business_profiles')
    .upsert(payload, { onConflict: 'account_id' });

  if (error) return { error: error.message };

  // Record platform terms acceptance (idempotent) now the account exists.
  try {
    const { data: doc } = await supabase.from('legal_documents')
      .select('id').eq('kind', 'platform_terms').eq('is_current', true).eq('jurisdiction', 'global')
      .order('effective_at', { ascending: false }).limit(1).maybeSingle();
    if (doc) await supabase.from('document_acceptances')
      .insert({ account_id: user.id, document_id: doc.id });
  } catch {}
  await saveAccountGlobalFields(supabase, user.id, formData);
  await recomputeTrustScore(user.id);
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function saveExpertProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const categories = splitList(formData.get('categories')) as ExpertCategory[];

  const payload = {
    account_id: user.id,
    name: String(formData.get('name') || '').trim(),
    headline: String(formData.get('headline') || '') || null,
    bio: String(formData.get('bio') || '') || null,
    skills: splitList(formData.get('skills')),
    expertise_areas: splitList(formData.get('expertise_areas')),
    industries: splitList(formData.get('industries')),
    linkedin_url: String(formData.get('linkedin_url') || '') || null,
    website: String(formData.get('website') || '') || null,
    daily_rate: formData.get('daily_rate') ? Number(formData.get('daily_rate')) : null,
    hourly_rate: formData.get('hourly_rate') ? Number(formData.get('hourly_rate')) : null,
    categories,
    visibility: String(formData.get('visibility') || 'listed') === 'unlisted' ? 'unlisted' : 'listed',
    remote_available: formData.get('remote_available') === 'true',
    onsite_available: formData.get('onsite_available') === 'true',
    hybrid_available: formData.get('hybrid_available') === 'true',
    travel_available: formData.get('travel_available') === 'true',
    countries_served: splitList(formData.get('countries_served')),
    based_country: String(formData.get('country') || '').trim() || null,
    based_city: String(formData.get('city') || '').trim() || null,
    timezone: String(formData.get('timezone') || '').trim() || null,
  };

  if (!payload.name) return { error: 'Your name is required.' };

  const { data: profile, error } = await supabase
    .from('expert_profiles')
    .upsert(payload, { onConflict: 'account_id' })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // availability is a 1:1 companion row — seed it so filters work immediately
  const workModes = splitList(formData.get('work_modes'));
  await supabase.from('expert_availability').upsert(
    {
      expert_id: profile.id,
      availability_type: String(formData.get('availability_type') || 'available_now'),
      hours_per_week: formData.get('hours_per_week') ? Number(formData.get('hours_per_week')) : null,
      work_modes: workModes,
    },
    { onConflict: 'expert_id' }
  );


  // Record platform terms acceptance (idempotent) now the account exists.
  try {
    const { data: doc } = await supabase.from('legal_documents')
      .select('id').eq('kind', 'platform_terms').eq('is_current', true).eq('jurisdiction', 'global')
      .order('effective_at', { ascending: false }).limit(1).maybeSingle();
    if (doc) await supabase.from('document_acceptances')
      .insert({ account_id: user.id, document_id: doc.id });
  } catch {}
  await saveAccountGlobalFields(supabase, user.id, formData);
  await recomputeTrustScore(user.id);
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
