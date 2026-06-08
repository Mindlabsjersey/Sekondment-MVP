import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';
import { notify } from '@/lib/email/notify';

/**
 * POST /api/stripe/webhook
 * Source of truth for money state. We only mark a milestone "funded" (in escrow)
 * once Stripe confirms the payment succeeded — never optimistically on the
 * client. Signature is verified against STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const svc = createServiceClient();

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const { engagement_id, milestone_id, kind } = pi.metadata ?? {};
      if (kind === 'milestone_funding' && milestone_id) {
        // Idempotent: only move pending -> funded.
        await svc
          .from('milestones')
          .update({ status: 'funded', funded_at: new Date().toISOString() })
          .eq('id', milestone_id)
          .eq('status', 'pending');

        // Idempotent: Stripe can redeliver this event. The unique index on
        // (stripe_object_id, entry_type) backs ON CONFLICT DO NOTHING so a retry
        // never writes a duplicate 'fund' money row.
        await svc.from('ledger_entries').upsert({
          engagement_id,
          milestone_id,
          entry_type: 'fund',
          amount: pi.amount / 100,
          currency: pi.currency.toUpperCase(),
          stripe_object_id: pi.id,
        }, { onConflict: 'stripe_object_id,entry_type', ignoreDuplicates: true });

        await svc.from('activity_events').insert({
          engagement_id,
          event_type: 'milestone_funded',
          detail: { milestone_id, amount: pi.amount / 100 },
        });

        // Notify the expert funds are in escrow — they can begin work.
        try {
          const { data: eng } = await svc
            .from('engagements')
            .select('expert_profiles!inner(accounts!inner(email)), milestones!inner(title)')
            .eq('id', engagement_id).single();
          const expertEmail = (eng as any)?.expert_profiles?.accounts?.email;
          const msTitle = (eng as any)?.milestones?.find?.((m: any) => m.id === milestone_id)?.title ?? 'Milestone';
          if (expertEmail) await notify.milestoneFunded(expertEmail, msTitle, engagement_id);
        } catch (e) { console.error('[notify milestoneFunded]', (e as Error).message); }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const { milestone_id } = pi.metadata ?? {};
      if (milestone_id) {
        // leave as pending; surface the failure in the activity feed
        await svc.from('activity_events').insert({
          engagement_id: pi.metadata?.engagement_id,
          event_type: 'milestone_funding_failed',
          detail: { milestone_id, reason: pi.last_payment_error?.message ?? 'unknown' },
        });
      }
      break;
    }

    case 'account.updated': {
      // Reflect Connect onboarding completion back onto the account row.
      const acct = event.data.object as Stripe.Account;
      const done = acct.charges_enabled && acct.payouts_enabled;
      await svc
        .from('accounts')
        .update({ stripe_onboarding_done: !!done })
        .eq('stripe_account_id', acct.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
