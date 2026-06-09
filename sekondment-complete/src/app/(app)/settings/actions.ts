'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { recomputeTrustScore } from '@/lib/trust/recompute';

const splitList = (v: FormDataEntryValue | null) =>
  String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

// ─── UPDATE EXPERT PROFILE ──────────────────────────────────────────────────
export async function updateExpertProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const patch = {
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
    visibility: String(formData.get('visibility') || 'listed') === 'unlisted' ? 'unlisted' : 'listed',
  };
  if (!patch.name) return { error: 'Name is required.' };

  const { error } = await supabase.from('expert_profiles').update(patch).eq('account_id', user.id);
  if (error) return { error: error.message };

  await recomputeTrustScore(user.id);
  revalidatePath('/settings');
  return { success: true };
}

// ─── UPDATE BUSINESS PROFILE ────────────────────────────────────────────────
export async function updateBusinessProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const patch = {
    company_name: String(formData.get('company_name') || '').trim(),
    description: String(formData.get('description') || '') || null,
    website: String(formData.get('website') || '') || null,
    location: String(formData.get('location') || '') || null,
    industry: String(formData.get('industry') || '') || null,
    company_size: String(formData.get('company_size') || '') || null,
  };
  if (!patch.company_name) return { error: 'Company name is required.' };

  const { error } = await supabase.from('business_profiles').update(patch).eq('account_id', user.id);
  if (error) return { error: error.message };

  await recomputeTrustScore(user.id);
  revalidatePath('/settings');
  return { success: true };
}

// ─── UPDATE PARTNER PROFILE ─────────────────────────────────────────────────
export async function updatePartnerProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const commission = formData.get('default_commission_pct') ? Number(formData.get('default_commission_pct')) : 0;
  const patch = {
    company_name: String(formData.get('company_name') || '').trim(),
    industry: String(formData.get('industry') || '') || null,
    website: String(formData.get('website') || '') || null,
    description: String(formData.get('description') || '') || null,
    location: String(formData.get('location') || '') || null,
    company_size: String(formData.get('company_size') || '') || null,
    default_commission_pct: Math.max(0, Math.min(1, commission)),
  };
  if (!patch.company_name) return { error: 'Company name is required.' };

  const { error } = await supabase.from('employer_partners').update(patch).eq('account_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { success: true };
}

// ─── SAVE LOGO / PROFILE PHOTO URL ──────────────────────────────────────────
// Persists a public URL (uploaded client-side to the 'logos' bucket) onto the
// right column for the caller's account type.
export async function saveProfileImage(url: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  if (!/^https?:\/\//.test(url)) return { error: 'Invalid image URL.' };

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();

  let res;
  if (account?.account_type === 'expert') {
    res = await supabase.from('expert_profiles').update({ photo_url: url }).eq('account_id', user.id);
  } else if (account?.account_type === 'business') {
    res = await supabase.from('business_profiles').update({ logo_url: url }).eq('account_id', user.id);
  } else if (account?.account_type === 'employer_partner') {
    res = await supabase.from('employer_partners').update({ logo_url: url }).eq('account_id', user.id);
  } else {
    return { error: 'Unsupported account type.' };
  }
  if (res.error) return { error: res.error.message };

  revalidatePath('/settings');
  revalidatePath('/', 'layout');
  return { success: true };
}
