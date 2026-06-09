import { NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { notify } from '@/lib/email/notify';
import { logCompliance } from '@/lib/compliance/log';
import { upgradeExpertiseOnCompletion } from '@/lib/matching/upgrade';
import { computeSplit, releaseMilestone } from '@/lib/stripe/escrow';

/**
 * POST /api/engagements/[id]/milestones/[mid]/release
 * Business approves a submitted milestone -> transfers funds out of escrow with
 * the correct split (handles Company Resource multi-payee). Writes ledger rows.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const { id, mid } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load engagement + payee config. Service client for the writes below.
  const svc = createServiceClient();

  const { data: eng } = await supabase
    .from('engagements')
    .select(`id, currency, payee_type, payee_account_id, resource_split_to_expert, platform_fee_pct,
             business_id, expert_id, business_profiles!inner(account_id)`)
    .eq('id', id)
    .single();

  if (!eng || (eng as any).business_profiles.account_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: milestone } = await supabase
    .from('milestones')
    .select('id, amount, status, payment_intent_id')
    .eq('id', mid)
    .eq('engagement_id', id)
    .single();

  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  if (milestone.status !== 'submitted') {
    return NextResponse.json({ error: `Cannot release a milestone that is ${milestone.status}` }, { status: 409 });
  }

  // ── Idempotency claim: atomically move submitted -> releasing. Only ONE
  // concurrent request can win this conditional update; if zero rows change,
  // another request already claimed it, so we abort before any Stripe transfer.
  const { data: claimed } = await svc
    .from('milestones')
    .update({ status: 'releasing' })
    .eq('id', mid)
    .eq('status', 'submitted')
    .select('id');
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'Release already in progress or completed.' }, { status: 409 });
  }

  // Resolve the connected account(s) that receive money.
  const { data: payee } = await svc
    .from('accounts').select('stripe_account_id').eq('id', eng.payee_account_id).single();
  if (!payee?.stripe_account_id) {
    return NextResponse.json({ error: 'Payee has not completed Stripe onboarding' }, { status: 409 });
  }

  // For a resource split, resolve the individual expert's connected account.
  let expertStripeAccount: string | null = null;
  if (eng.resource_split_to_expert && eng.payee_type !== 'expert') {
    const { data: ex } = await svc
      .from('expert_profiles')
      .select('accounts!inner(stripe_account_id)')
      .eq('id', eng.expert_id).single();
    expertStripeAccount = (ex as any)?.accounts?.stripe_account_id ?? null;
  }

  // Recover the charge that funded this milestone (source_transaction for transfers).
  let transfers, split, chargeId: string | undefined;
  try {
    const pi = await stripe.paymentIntents.retrieve(milestone.payment_intent_id!, { expand: ['latest_charge'] });
    chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
    if (!chargeId) throw new Error('Funding charge not found');

    split = computeSplit({
      amountPounds: Number(milestone.amount),
      payeeType: eng.payee_type,
      primaryStripeAccount: payee.stripe_account_id,
      resourceSplitToExpert: eng.resource_split_to_expert,
      expertStripeAccount,
      feePct: eng.platform_fee_pct != null ? Number(eng.platform_fee_pct) : undefined,
    });

    transfers = await releaseMilestone({
      engagementId: id,
      chargeId,
      currency: eng.currency ?? 'gbp',
      split,
    });
  } catch (e) {
    // Stripe failed — revert the claim so the release can be retried.
    await svc.from('milestones').update({ status: 'submitted' }).eq('id', mid);
    return NextResponse.json({ error: `Release failed: ${(e as Error).message}` }, { status: 502 });
  }

  // Ledger: fee + each transfer. Append-only.
  const rows = [
    { engagement_id: id, milestone_id: mid, entry_type: 'fee', amount: split.feeMinor / 100, currency: eng.currency ?? 'GBP', stripe_object_id: chargeId },
    ...transfers.map((t) => ({
      engagement_id: id, milestone_id: mid,
      entry_type: t.role === 'resource_split' ? 'transfer_expert' : 'transfer_business',
      amount: t.amountMinor / 100, currency: eng.currency ?? 'GBP',
      destination_account_id: null, stripe_object_id: t.id,
    })),
  ];
  await svc.from('ledger_entries').insert(rows);
  await svc.from('milestones').update({ status: 'released', released_at: new Date().toISOString() }).eq('id', mid);
  await logCompliance({ type: 'payment_released', engagementId: id, detail: { milestone_id: mid } });

  // Completed paid work upgrades the expert's relevant expertise to 'proven'.
  await upgradeExpertiseOnCompletion(id);

  // Notify the payee (expert or employer) that funds have been released.
  try {
    const { data: payeeAcc } = await svc.from('accounts').select('email').eq('id', eng.payee_account_id).single();
    const { data: ms } = await svc.from('milestones').select('title').eq('id', mid).single();
    if (payeeAcc?.email) await notify.fundsReleased(payeeAcc.email, (ms as any)?.title ?? 'Milestone', id);
  } catch (e) { console.error('[notify fundsReleased]', (e as Error).message); }

  return NextResponse.json({ released: true, transfers, fee: split.feeMinor / 100 });
}

// ──  this line intentionally left to trigger a re-read — see str_replace below
