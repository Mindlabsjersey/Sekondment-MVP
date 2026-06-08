'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { logCompliance } from '@/lib/compliance/log';

/* ============================================================================
   Employer Partner actions.
   A partner registers a company profile, then invites employees (existing
   expert profiles) and approves them before they can be deployed.
   ========================================================================== */

// ─── SAVE PARTNER PROFILE (onboarding) ──────────────────────────────────────
export async function savePartnerProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const commission = formData.get('default_commission_pct')
    ? Number(formData.get('default_commission_pct'))
    : 0;

  const payload = {
    account_id: user.id,
    company_name: String(formData.get('company_name') || '').trim(),
    industry: String(formData.get('industry') || '') || null,
    website: String(formData.get('website') || '') || null,
    description: String(formData.get('description') || '') || null,
    location: String(formData.get('location') || '') || null,
    company_size: String(formData.get('company_size') || '') || null,
    default_commission_pct: Math.max(0, Math.min(1, commission)),
  };

  if (!payload.company_name) return { error: 'Company name is required.' };

  const { error } = await supabase
    .from('employer_partners')
    .upsert(payload, { onConflict: 'account_id' });

  if (error) return { error: error.message };
  revalidatePath('/partner');
  redirect('/partner');
}

// ─── INVITE EMPLOYEE ─────────────────────────────────────────────────────────
/**
 * Invites an existing expert (by their account email) to be deployable via this
 * partner. Creates the employer_employees link in 'pending' status.
 */
export async function inviteEmployee(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: partner } = await supabase
    .from('employer_partners').select('id, default_commission_pct').eq('account_id', user.id).single();
  if (!partner) return { error: 'Complete your partner profile first.' };

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const commissionOverride = formData.get('commission_pct')
    ? Number(formData.get('commission_pct'))
    : null;
  if (!email) return { error: 'Employee email is required.' };

  const svc = createServiceClient();

  // Find the expert by their account email.
  const { data: account } = await svc
    .from('accounts').select('id, account_type').eq('email', email).maybeSingle();
  if (!account) return { error: 'No Sekondment account found for that email. Ask them to sign up as an expert first.' };
  if (account.account_type !== 'expert') return { error: 'That account is not an expert account.' };

  const { data: expert } = await svc
    .from('expert_profiles').select('id').eq('account_id', account.id).single();
  if (!expert) return { error: 'That expert has not completed their profile yet.' };

  const { data: newLink, error } = await svc.from('employer_employees').insert({
    employer_id: partner.id,
    expert_id: expert.id,
    approval_status: 'pending',
    commission_pct: commissionOverride,
  }).select('id').single();
  if (error) {
    if (error.code === '23505') return { error: 'That expert is already registered with you.' };
    return { error: error.message };
  }
  await svc.from('employer_employee_events').insert({
    employer_id: partner.id, employee_id: newLink?.id ?? null, event_type: 'invited', actor_id: user.id,
  });

  revalidatePath('/partner');
  return { success: true };
}

// ─── APPROVE / SUSPEND / REVOKE ──────────────────────────────────────────────
export async function setEmployeeStatus(
  linkId: string,
  status: 'approved' | 'suspended' | 'revoked'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: partner } = await supabase
    .from('employer_partners').select('id').eq('account_id', user.id).single();
  if (!partner) return { error: 'Forbidden.' };

  const svc = createServiceClient();
  // Confirm the link belongs to this partner.
  const { data: link } = await svc
    .from('employer_employees').select('id, employer_id, expert_id').eq('id', linkId).single();
  if (!link || link.employer_id !== partner.id) return { error: 'Forbidden.' };

  const patch: Record<string, any> = { approval_status: status };
  if (status === 'approved') {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = user.id;
  }
  const { error } = await svc.from('employer_employees').update(patch).eq('id', linkId);
  if (error) return { error: error.message };

  // When approved, link the expert profile to this partner so payee resolution
  // routes payment to the employer. When revoked, unlink.
  if (status === 'approved') {
    await svc.from('expert_profiles').update({ employer_partner_id: partner.id }).eq('id', link.expert_id);
  } else if (status === 'revoked') {
    await svc.from('expert_profiles').update({ employer_partner_id: null }).eq('id', link.expert_id);
  }

  // Audit: employer↔employee event + compliance trail.
  const evtType = status === 'approved' ? 'approved' : status === 'suspended' ? 'suspended' : 'revoked';
  await svc.from('employer_employee_events').insert({
    employer_id: partner.id, employee_id: linkId, event_type: evtType, actor_id: user.id,
  });
  if (status === 'approved') {
    await logCompliance({ type: 'employer_resource_approved', actorId: user.id, detail: { link_id: linkId } });
  }

  revalidatePath('/partner');
  return { success: true };
}
