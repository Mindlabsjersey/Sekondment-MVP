import { stripe } from './client';

/* ============================================================================
   Connect onboarding — gives a payee (expert, business, or employer partner)
   a connected account so the platform can transfer escrow funds to them.
   Uses Express accounts (Stripe-hosted onboarding + lightweight dashboard).
   ========================================================================== */

/** Create an Express connected account for a payee, if they don't have one. */
export async function createConnectedAccount(params: {
  email: string;
  country?: string;            // ISO; Jersey/UK sellers default to GB
  businessType?: 'individual' | 'company';
}) {
  const account = await stripe.accounts.create({
    type: 'express',
    email: params.email,
    country: params.country ?? 'GB',
    business_type: params.businessType,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { platform: 'sekondment' },
  });
  return account.id;
}

/**
 * Create a one-time onboarding link. The account_id must already exist.
 * refresh_url is hit if the link expires; return_url after completion.
 */
export async function createAccountLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  const link = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: 'account_onboarding',
  });
  return link.url;
}

/** Fetch onboarding status to reflect on our side. */
export async function getAccountStatus(accountId: string) {
  const a = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: a.charges_enabled,
    payoutsEnabled: a.payouts_enabled,
    detailsSubmitted: a.details_submitted,
    onboardingComplete: a.charges_enabled && a.payouts_enabled,
  };
}

/** Express dashboard login link for an onboarded account. */
export async function createDashboardLink(accountId: string) {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}
