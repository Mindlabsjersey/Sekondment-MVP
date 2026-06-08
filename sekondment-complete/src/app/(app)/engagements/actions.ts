'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { notify } from '@/lib/email/notify';
import { createNotification } from '@/lib/notifications/create';

/* ============================================================================
   Accepting a proposal is where the payee model is resolved. This decides who
   gets paid for the resulting engagement:
     - normal expert            -> payee_type 'expert',  payee = expert's account
     - expert employed by a biz  -> payee_type 'business', payee = employer account
     - expert via employer partner -> payee_type 'employer_partner', payee = partner
   Company Resource also carries resource_split_to_expert so the individual can
   receive a cut at release time.
   ========================================================================== */

const DEFAULT_MILESTONE_PLAN = (total: number) => {
  const m1 = Math.round(total * 0.2);
  const m2 = Math.round(total * 0.5);
  return [
    { sort_order: 1, title: 'Discovery', amount: m1 },
    { sort_order: 2, title: 'Delivery', amount: m2 },
    { sort_order: 3, title: 'Completion', amount: total - m1 - m2 }, // remainder, no rounding leak
  ];
};

export async function acceptProposal(proposalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const svc = createServiceClient();

  // Load the proposal + opportunity, verify the caller owns the opportunity.
  const { data: proposal } = await svc
    .from('proposals')
    .select(`id, opportunity_id, expert_id, price, rate_type, status,
             opportunities!inner(business_id, title, business_profiles!inner(account_id))`)
    .eq('id', proposalId)
    .single();

  if (!proposal) return { error: 'Proposal not found.' };
  const opp = (proposal as any).opportunities;
  if (opp.business_profiles.account_id !== user.id) return { error: 'Not your opportunity.' };
  if (proposal.status === 'accepted') return { error: 'Already accepted.' };

  // Resolve the payee from the expert's employment situation.
  const { data: expert } = await svc
    .from('expert_profiles')
    .select('id, account_id, employing_business_id, employer_partner_id, name')
    .eq('id', proposal.expert_id)
    .single();
  if (!expert) return { error: 'Expert not found.' };

  let payeeType: 'expert' | 'business' | 'employer_partner' = 'expert';
  let payeeAccountId = expert.account_id;
  let resourceSplit: number | null = null;

  if (expert.employer_partner_id) {
    // Deployed via a registered Employer Partner.
    const { data: partner } = await svc
      .from('employer_partners')
      .select('account_id')
      .eq('id', expert.employer_partner_id)
      .single();
    const { data: link } = await svc
      .from('employer_employees')
      .select('commission_pct, approval_status')
      .eq('employer_id', expert.employer_partner_id)
      .eq('expert_id', expert.id)
      .single();
    // Guard: the partner must have approved this employee before deployment.
    if (!link || link.approval_status !== 'approved') {
      return { error: 'This expert is not yet approved by their employer for deployment.' };
    }
    if (partner) {
      payeeType = 'employer_partner';
      payeeAccountId = partner.account_id;
      // partner keeps commission; remainder splits to the individual
      resourceSplit = link.commission_pct != null ? 1 - Number(link.commission_pct) : null;
    }
  } else if (expert.employing_business_id) {
    // Deployed by a plain Business that employs them.
    const { data: biz } = await svc
      .from('business_profiles')
      .select('account_id')
      .eq('id', expert.employing_business_id)
      .single();
    if (biz) {
      payeeType = 'business';
      payeeAccountId = biz.account_id;
    }
  }

  const total = Number(proposal.price ?? 0);
  if (total <= 0) return { error: 'Proposal has no price set.' };

  // Create engagement + milestones (service client; money state is authoritative server-side).
  const { data: engagement, error: engErr } = await svc
    .from('engagements')
    .insert({
      opportunity_id: proposal.opportunity_id,
      business_id: opp.business_id,
      expert_id: expert.id,
      proposal_id: proposal.id,
      payee_type: payeeType,
      payee_account_id: payeeAccountId,
      resource_split_to_expert: resourceSplit,
      title: opp.title,
      total_amount: total,
      rate_type: proposal.rate_type,
      currency: 'GBP',
      status: 'active',
    })
    .select('id')
    .single();

  if (engErr || !engagement) return { error: engErr?.message ?? 'Could not create engagement.' };

  const milestones = DEFAULT_MILESTONE_PLAN(total).map((m) => ({ ...m, engagement_id: engagement.id }));
  await svc.from('milestones').insert(milestones);

  // Mark this proposal accepted, others on the opportunity rejected, opp in-engagement.
  await svc.from('proposals').update({ status: 'accepted' }).eq('id', proposal.id);
  await svc.from('proposals').update({ status: 'rejected' })
    .eq('opportunity_id', proposal.opportunity_id).neq('id', proposal.id).eq('status', 'submitted');
  await svc.from('opportunities').update({ status: 'in_engagement' }).eq('id', proposal.opportunity_id);

  await svc.from('activity_events').insert({
    engagement_id: engagement.id,
    actor_id: user.id,
    event_type: 'engagement_created',
    detail: { from_proposal: proposal.id, payee_type: payeeType },
  });

  // Notify the expert their proposal was accepted.
  try {
    const { data: exAcc } = await svc.from('accounts').select('email').eq('id', expert.account_id).single();
    if (exAcc?.email) {
      const { data: opp } = await svc.from('opportunities').select('title').eq('id', proposal.opportunity_id).single();
      await notify.proposalAccepted(exAcc.email, opp?.title ?? 'your opportunity', engagement.id);
      await createNotification({
        accountId: expert.account_id, type: 'proposal_accepted',
        title: 'Your proposal was accepted 🎉',
        body: `Your proposal for "${opp?.title ?? 'an opportunity'}" was accepted.`,
        link: `/engagements/${engagement.id}`,
      });
    }
  } catch (e) { console.error('[notify proposalAccepted]', (e as Error).message); }

  revalidatePath('/engagements');
  return { engagementId: engagement.id };
}
