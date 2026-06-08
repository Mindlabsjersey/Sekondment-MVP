'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { refundMilestone, computeSplit, releaseMilestone } from '@/lib/stripe/escrow';
import { revalidatePath } from 'next/cache';
import { notify } from '@/lib/email/notify';
import { createNotification } from '@/lib/notifications/create';
import { logCompliance } from '@/lib/compliance/log';

/* ============================================================================
   Disputes — the escrow safety net.
   - Either party can RAISE a dispute on a milestone (typically funded/submitted).
   - The counterparty RESPONDS.
   - An ADMIN resolves: release (pay out), refund (return to business), or split.
   Resolution drives the real Stripe money movement.
   ========================================================================== */

async function getParty(engagementId: string, userId: string) {
  const svc = createServiceClient();
  const { data: eng } = await svc
    .from('engagements')
    .select(`id, currency, payee_type, payee_account_id, resource_split_to_expert, expert_id,
             business_profiles!inner(account_id),
             expert_profiles!inner(accounts!inner(id))`)
    .eq('id', engagementId).single();
  if (!eng) return null;
  const businessAccountId = (eng as any).business_profiles.account_id;
  const expertAccountId = (eng as any).expert_profiles.accounts.id;
  return {
    eng,
    isBusiness: userId === businessAccountId,
    isExpert: userId === expertAccountId,
    businessAccountId,
    expertAccountId,
  };
}

export async function raiseDispute(engagementId: string, milestoneId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  if (!reason.trim()) return { error: 'Please describe the issue.' };

  const party = await getParty(engagementId, user.id);
  if (!party || (!party.isBusiness && !party.isExpert)) return { error: 'You are not part of this engagement.' };

  const svc = createServiceClient();

  // Don't allow a second open dispute on the same milestone.
  const { data: existing } = await svc
    .from('disputes').select('id').eq('milestone_id', milestoneId)
    .in('status', ['open', 'under_review']).maybeSingle();
  if (existing) return { error: 'There is already an open dispute on this milestone.' };

  const { error } = await svc.from('disputes').insert({
    engagement_id: engagementId,
    milestone_id: milestoneId,
    raised_by: user.id,
    reason: reason.trim(),
    status: 'open',
  });
  if (error) return { error: error.message };

  // Flag the milestone + engagement as disputed so funds can't be released normally.
  await svc.from('milestones').update({ status: 'disputed' }).eq('id', milestoneId);
  await svc.from('engagements').update({ status: 'disputed' }).eq('id', engagementId);
  await svc.from('activity_events').insert({
    engagement_id: engagementId, actor_id: user.id,
    event_type: 'dispute_raised', detail: { milestone_id: milestoneId },
  });
  await logCompliance({ type: 'dispute_raised', engagementId, actorId: user.id, detail: { milestone_id: milestoneId } });

  // Notify the counterparty.
  try {
    const otherId = party.isBusiness ? party.expertAccountId : party.businessAccountId;
    const { data: other } = await svc.from('accounts').select('email').eq('id', otherId).single();
    if (other?.email) await notify.disputeRaised(other.email, engagementId);
    if (otherId) await createNotification({
      accountId: otherId, type: 'dispute_raised',
      title: 'A dispute needs your attention',
      body: 'A dispute was raised on one of your engagements.',
      link: `/engagements/${engagementId}`,
    });
  } catch (e) { console.error('[notify disputeRaised]', (e as Error).message); }

  revalidatePath(`/engagements/${engagementId}`);
  return { success: true };
}

export async function respondToDispute(disputeId: string, response: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  if (!response.trim()) return { error: 'Please enter a response.' };

  const svc = createServiceClient();
  const { data: dispute } = await svc
    .from('disputes').select('id, engagement_id, raised_by').eq('id', disputeId).single();
  if (!dispute) return { error: 'Dispute not found.' };

  const party = await getParty(dispute.engagement_id, user.id);
  if (!party || (!party.isBusiness && !party.isExpert)) return { error: 'Forbidden.' };
  if (dispute.raised_by === user.id) return { error: 'You raised this dispute; the other party responds.' };

  const { error } = await svc.from('disputes')
    .update({ expert_response: response.trim(), status: 'under_review' })
    .eq('id', disputeId);
  if (error) return { error: error.message };

  await svc.from('activity_events').insert({
    engagement_id: dispute.engagement_id, actor_id: user.id, event_type: 'dispute_responded',
  });
  revalidatePath(`/engagements/${dispute.engagement_id}`);
  return { success: true };
}

/**
 * ADMIN resolution. outcome: 'release' | 'refund' | 'split'.
 * Drives the real Stripe money movement and records the ledger.
 */
export async function resolveDispute(
  disputeId: string,
  outcome: 'release' | 'refund' | 'split',
  note: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const svc = createServiceClient();
  const { data: me } = await svc.from('accounts').select('account_type').eq('id', user.id).single();
  if (me?.account_type !== 'admin') return { error: 'Admin only.' };

  const { data: dispute } = await svc
    .from('disputes').select('id, engagement_id, milestone_id, status').eq('id', disputeId).single();
  if (!dispute || !dispute.milestone_id) return { error: 'Dispute or milestone missing.' };
  if (['resolved_release', 'resolved_refund', 'resolved_split'].includes(dispute.status)) {
    return { error: 'Already resolved.' };
  }

  const { data: eng } = await svc
    .from('engagements')
    .select('id, currency, payee_type, payee_account_id, resource_split_to_expert, expert_id')
    .eq('id', dispute.engagement_id).single();
  const { data: milestone } = await svc
    .from('milestones').select('id, amount, payment_intent_id').eq('id', dispute.milestone_id).single();
  if (!eng || !milestone) return { error: 'Engagement data missing.' };

  const currency = eng.currency ?? 'GBP';

  try {
    if (outcome === 'refund') {
      await refundMilestone(milestone.payment_intent_id!);
      await svc.from('ledger_entries').insert({
        engagement_id: eng.id, milestone_id: milestone.id, entry_type: 'refund',
        amount: Number(milestone.amount), currency, stripe_object_id: milestone.payment_intent_id,
      });
      await svc.from('milestones').update({ status: 'refunded' }).eq('id', milestone.id);
    } else {
      // release or split -> transfer to payee (and individual if split configured)
      const { data: payee } = await svc.from('accounts').select('stripe_account_id').eq('id', eng.payee_account_id).single();
      if (!payee?.stripe_account_id) return { error: 'Payee has not completed Stripe onboarding.' };

      let expertStripeAccount: string | null = null;
      if (outcome === 'split' && eng.resource_split_to_expert && eng.payee_type !== 'expert') {
        const { data: ex } = await svc.from('expert_profiles')
          .select('accounts!inner(stripe_account_id)').eq('id', eng.expert_id).single();
        expertStripeAccount = (ex as any)?.accounts?.stripe_account_id ?? null;
      }

      const pi = await stripe.paymentIntents.retrieve(milestone.payment_intent_id!, { expand: ['latest_charge'] });
      const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
      if (!chargeId) return { error: 'Funding charge not found.' };

      const split = computeSplit({
        amountPounds: Number(milestone.amount),
        payeeType: eng.payee_type,
        primaryStripeAccount: payee.stripe_account_id,
        resourceSplitToExpert: outcome === 'split' ? eng.resource_split_to_expert : null,
        expertStripeAccount,
      });
      const transfers = await releaseMilestone({ engagementId: eng.id, chargeId, currency, split });

      await svc.from('ledger_entries').insert([
        { engagement_id: eng.id, milestone_id: milestone.id, entry_type: 'fee', amount: split.feeMinor / 100, currency, stripe_object_id: chargeId },
        ...transfers.map((t) => ({
          engagement_id: eng.id, milestone_id: milestone.id,
          entry_type: t.role === 'resource_split' ? 'transfer_expert' : 'transfer_business',
          amount: t.amountMinor / 100, currency, stripe_object_id: t.id,
        })),
      ]);
      await svc.from('milestones').update({ status: 'released', released_at: new Date().toISOString() }).eq('id', milestone.id);
    }

    const statusMap = { release: 'resolved_release', refund: 'resolved_refund', split: 'resolved_split' } as const;
    await svc.from('disputes').update({
      status: statusMap[outcome], resolved_by: user.id,
      resolution_note: note || null, resolved_at: new Date().toISOString(),
    }).eq('id', disputeId);

    // engagement back to active unless every milestone is now terminal
    const { data: all } = await svc.from('milestones').select('status').eq('engagement_id', eng.id);
    const allDone = (all ?? []).every((m) => ['released', 'refunded'].includes(m.status));
    await svc.from('engagements').update({ status: allDone ? 'complete' : 'active' }).eq('id', eng.id);

    await svc.from('activity_events').insert({
      engagement_id: eng.id, actor_id: user.id,
      event_type: 'dispute_resolved', detail: { outcome },
    });
  } catch (e) {
    return { error: `Stripe error: ${(e as Error).message}` };
  }

  revalidatePath(`/engagements/${eng.id}`);
  revalidatePath('/admin/disputes');
  return { success: true };
}
