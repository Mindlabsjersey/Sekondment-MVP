import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createConnectedAccount, createAccountLink, getAccountStatus } from '@/lib/stripe/connect';

/**
 * POST /api/stripe/connect
 * Starts or resumes Stripe Connect onboarding for the signed-in payee.
 * Returns a hosted onboarding URL to redirect to.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClient();
  const { data: account } = await svc
    .from('accounts')
    .select('stripe_account_id, email, account_type')
    .eq('id', user.id)
    .single();
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  // Create the connected account on first run; reuse it afterwards.
  let accountId = account.stripe_account_id;
  if (!accountId) {
    accountId = await createConnectedAccount({
      email: account.email,
      businessType: account.account_type === 'expert' ? 'individual' : 'company',
    });
    await svc.from('accounts').update({ stripe_account_id: accountId }).eq('id', user.id);
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL;
  const url = await createAccountLink({
    accountId,
    refreshUrl: `${base}/settings/payments?refresh=1`,
    returnUrl: `${base}/settings/payments?done=1`,
  });

  return NextResponse.json({ url });
}

/** GET — current onboarding status for the signed-in payee. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClient();
  const { data: account } = await svc
    .from('accounts').select('stripe_account_id, stripe_onboarding_done').eq('id', user.id).single();

  if (!account?.stripe_account_id) {
    return NextResponse.json({ connected: false, onboardingComplete: false });
  }

  const status = await getAccountStatus(account.stripe_account_id);
  // Keep our cached flag in sync (webhook also does this).
  if (status.onboardingComplete !== account.stripe_onboarding_done) {
    await svc.from('accounts').update({ stripe_onboarding_done: status.onboardingComplete }).eq('id', user.id);
  }
  return NextResponse.json({ connected: true, ...status });
}
