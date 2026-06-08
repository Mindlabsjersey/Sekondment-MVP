import { stripe, PLATFORM_FEE_PCT, toMinor } from './client';
import type { PayeeType } from '@/lib/types/database';

/* ============================================================================
   Escrow service — the money engine.

   Model: separate charges & transfers.
   - FUND a milestone  -> PaymentIntent on the platform (money lands on the
     platform balance == escrow). Tagged with a transfer_group per engagement.
   - RELEASE a milestone -> one or more Transfers from the platform balance to
     the connected account(s), drawn from the funding charge via
     source_transaction. Platform fee is simply the amount NOT transferred.

   The split logic is the only place money is divided, so it can be audited and
   unit-tested in isolation.
   ========================================================================== */

export interface SplitInput {
  amountPounds: number;            // milestone amount
  payeeType: PayeeType;            // 'expert' | 'business' | 'employer_partner'
  /** Connected account that receives the primary payout. */
  primaryStripeAccount: string;
  /** For Company Resource: fraction (0..1) of post-fee paid to the individual. */
  resourceSplitToExpert?: number | null;
  /** Required when resourceSplitToExpert > 0: the individual's connected account. */
  expertStripeAccount?: string | null;
}

export interface SplitLine {
  destination: string;             // Stripe connected account id
  amountMinor: number;             // pence
  role: 'primary' | 'resource_split';
}

export interface SplitResult {
  grossMinor: number;
  feeMinor: number;
  netMinor: number;
  lines: SplitLine[];              // sums to netMinor
}

/**
 * Pure function: given a milestone amount and payee config, compute the fee and
 * the exact transfer lines. No Stripe calls — just arithmetic, so it is trivial
 * to test and reason about.
 */
export function computeSplit(input: SplitInput): SplitResult {
  const grossMinor = toMinor(input.amountPounds);
  const feeMinor = Math.round((grossMinor * PLATFORM_FEE_PCT) / 100);
  const netMinor = grossMinor - feeMinor;

  const lines: SplitLine[] = [];

  const split = input.resourceSplitToExpert ?? 0;
  const hasSplit =
    (input.payeeType === 'business' || input.payeeType === 'employer_partner') &&
    split > 0 &&
    !!input.expertStripeAccount;

  if (hasSplit) {
    const toExpert = Math.round(netMinor * split);
    const toPrimary = netMinor - toExpert; // remainder avoids rounding leak
    lines.push({ destination: input.primaryStripeAccount, amountMinor: toPrimary, role: 'primary' });
    lines.push({ destination: input.expertStripeAccount!, amountMinor: toExpert, role: 'resource_split' });
  } else {
    lines.push({ destination: input.primaryStripeAccount, amountMinor: netMinor, role: 'primary' });
  }

  return { grossMinor, feeMinor, netMinor, lines };
}

export const transferGroupFor = (engagementId: string) => `eng_${engagementId}`;

/**
 * FUND: create a PaymentIntent the business confirms to move the milestone
 * amount onto the platform balance (escrow). Returns client_secret for the
 * client-side confirmation step.
 */
export async function createFundingIntent(params: {
  engagementId: string;
  milestoneId: string;
  amountPounds: number;
  currency?: string;
  customerStripeId?: string;
}) {
  const intent = await stripe.paymentIntents.create({
    amount: toMinor(params.amountPounds),
    currency: (params.currency ?? 'gbp').toLowerCase(),
    transfer_group: transferGroupFor(params.engagementId),
    customer: params.customerStripeId,
    metadata: {
      engagement_id: params.engagementId,
      milestone_id: params.milestoneId,
      kind: 'milestone_funding',
    },
    automatic_payment_methods: { enabled: true },
  });
  return { id: intent.id, clientSecret: intent.client_secret };
}

/**
 * RELEASE: create the transfer(s) for an approved milestone, drawn from the
 * funding charge. Returns the created transfer ids + ledger-ready lines.
 */
export async function releaseMilestone(params: {
  engagementId: string;
  chargeId: string;               // latest_charge of the funding PaymentIntent
  currency?: string;
  split: SplitResult;
}) {
  const currency = (params.currency ?? 'gbp').toLowerCase();
  const group = transferGroupFor(params.engagementId);

  const transfers = [];
  for (const line of params.split.lines) {
    const tr = await stripe.transfers.create({
      amount: line.amountMinor,
      currency,
      destination: line.destination,
      transfer_group: group,
      source_transaction: params.chargeId,
      metadata: { engagement_id: params.engagementId, role: line.role },
    });
    transfers.push({ id: tr.id, destination: line.destination, amountMinor: line.amountMinor, role: line.role });
  }
  return transfers;
}

/** Refund a funded-but-not-released milestone (dispute resolution). */
export async function refundMilestone(paymentIntentId: string) {
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}
