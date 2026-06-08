'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { RateType, WorkMode } from '@/lib/types/database';
import { notify } from '@/lib/email/notify';
import { createNotification } from '@/lib/notifications/create';

// ─── CREATE OPPORTUNITY ────────────────────────────────────────────────────
export async function createOpportunity(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: biz } = await supabase
    .from('business_profiles').select('id').eq('account_id', user.id).single();
  if (!biz) return { error: 'Complete your business profile first.' };

  const expertise = String(formData.get('required_expertise') || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  const { data, error } = await supabase.from('opportunities').insert({
    business_id: biz.id,
    title: String(formData.get('title')),
    description: String(formData.get('description') || ''),
    desired_outcome: String(formData.get('desired_outcome') || '') as any,
    required_expertise: expertise,
    industry: String(formData.get('industry') || '') || null,
    budget_min: formData.get('budget_min') ? Number(formData.get('budget_min')) : null,
    budget_max: formData.get('budget_max') ? Number(formData.get('budget_max')) : null,
    duration: String(formData.get('duration') || '') || null,
    start_date: String(formData.get('start_date') || '') || null,
    work_mode: String(formData.get('work_mode') || 'remote') as WorkMode,
    location: String(formData.get('location') || '') || null,
    rate_type: String(formData.get('rate_type') || 'fixed') as RateType,
    visibility: String(formData.get('visibility') || 'public') === 'private' ? 'private' : 'public',
    currency: String(formData.get('currency') || 'GBP').toUpperCase().slice(0, 3),
    engagement_kind: String(formData.get('engagement_kind') || 'freelancer'),
    country: String(formData.get('country') || '').trim() || null,
    jurisdiction: String(formData.get('country') || '').trim() || null,
    local_knowledge_required: formData.get('local_knowledge_required') === 'true',
    timezone_overlap: String(formData.get('timezone_overlap') || '').trim() || null,
    status: 'open',
  }).select('id').single();

  if (error) return { error: error.message };
  revalidatePath('/opportunities');
  redirect(`/opportunities/${data.id}`);
}

// ─── SUBMIT PROPOSAL ──────────────────────────────────────────────────────
export async function submitProposal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: expert } = await supabase
    .from('expert_profiles').select('id, employing_business_id, employer_partner_id')
    .eq('account_id', user.id).single();
  if (!expert) return { error: 'Complete your expert profile first.' };

  // Resolve payee type from employment status — mirrors acceptProposal logic.
  let payeeType: 'expert' | 'business' | 'employer_partner' = 'expert';
  if (expert.employer_partner_id) payeeType = 'employer_partner';
  else if (expert.employing_business_id) payeeType = 'business';

  const oppId = String(formData.get('opportunity_id'));
  const { error } = await supabase.from('proposals').upsert({
    opportunity_id: oppId,
    expert_id: expert.id,
    cover_message: String(formData.get('cover_message') || '') || null,
    rate_type: String(formData.get('rate_type') || 'fixed') as RateType,
    price: formData.get('price') ? Number(formData.get('price')) : null,
    est_units: formData.get('est_units') ? Number(formData.get('est_units')) : null,
    timeline: String(formData.get('timeline') || '') || null,
    proposed_start: String(formData.get('proposed_start') || '') || null,
    payee_type: payeeType,
    status: 'submitted',
  }, { onConflict: 'opportunity_id,expert_id' });

  if (error) return { error: error.message };

  // Notify the business owner that a proposal arrived.
  try {
    const svc = createServiceClient();
    const { data: opp } = await svc
      .from('opportunities')
      .select('title, business_profiles!inner(account_id)')
      .eq('id', oppId).single();
    const ownerId = (opp as any)?.business_profiles?.account_id;
    if (ownerId) {
      const { data: owner } = await svc.from('accounts').select('email').eq('id', ownerId).single();
      if (owner?.email) await notify.proposalReceived(owner.email, (opp as any).title, oppId);
      if (ownerId) await createNotification({
        accountId: ownerId, type: 'proposal_received',
        title: 'New proposal received',
        body: `A new proposal was submitted for "${(opp as any).title}".`,
        link: `/opportunities/${oppId}`,
      });
    }
  } catch (e) { console.error('[notify proposalReceived]', (e as Error).message); }

  revalidatePath(`/opportunities/${oppId}`);
  return { success: true };
}

// ─── SHORTLIST / REJECT PROPOSAL (business) ───────────────────────────────
export async function updateProposalStatus(
  proposalId: string,
  status: 'shortlisted' | 'rejected'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  // Verify caller owns the opportunity this proposal belongs to.
  const { data: proposal } = await supabase
    .from('proposals')
    .select('opportunity_id, opportunities!inner(business_profiles!inner(account_id))')
    .eq('id', proposalId).single();

  const ownerAccountId = (proposal as any)?.opportunities?.business_profiles?.account_id;
  if (ownerAccountId !== user.id) return { error: 'Forbidden.' };

  const { error } = await supabase.from('proposals').update({ status }).eq('id', proposalId);
  if (error) return { error: error.message };
  revalidatePath('/opportunities');
  return { success: true };
}
