import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createFundingIntent } from '@/lib/stripe/escrow';

/**
 * POST /api/engagements/[id]/milestones/[mid]/fund
 * Business funds a milestone. Creates a PaymentIntent; the client confirms it.
 * The ledger is NOT written here — it is written by the webhook on
 * payment_intent.succeeded, so escrow state always reflects real money.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const { id, mid } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify the caller is the funding business on this engagement, and load the milestone.
  const { data: eng } = await supabase
    .from('engagements')
    .select('id, currency, business_id, business_profiles!inner(account_id)')
    .eq('id', id)
    .single();

  if (!eng || (eng as any).business_profiles.account_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: milestone } = await supabase
    .from('milestones')
    .select('id, amount, status')
    .eq('id', mid)
    .eq('engagement_id', id)
    .single();

  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  if (milestone.status !== 'pending') {
    return NextResponse.json({ error: `Milestone is already ${milestone.status}` }, { status: 409 });
  }

  const intent = await createFundingIntent({
    engagementId: id,
    milestoneId: mid,
    amountPounds: Number(milestone.amount),
    currency: eng.currency ?? 'gbp',
  });

  // Stash the intent id so the release route can recover the funding charge.
  // Must use the service client: milestones has no RLS write policy for clients,
  // so a user-scoped update here is silently denied (leaving payment_intent_id
  // null and breaking release). The caller was already authorised as the funding
  // business above.
  const svc = createServiceClient();
  await svc.from('milestones').update({ payment_intent_id: intent.id }).eq('id', mid);

  return NextResponse.json({ clientSecret: intent.clientSecret, paymentIntentId: intent.id });
}
