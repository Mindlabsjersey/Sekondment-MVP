import Stripe from 'stripe';

// Single Stripe client for all server-side calls. The API version is pinned so
// behaviour is stable across deploys; bump deliberately when upgrading.
//
// Constructed lazily via a Proxy: instantiating Stripe requires STRIPE_SECRET_KEY,
// which is absent during `next build` page-data collection. Deferring construction
// to first property access keeps all call sites (`stripe.paymentIntents…`) unchanged
// while avoiding a build-time crash.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
      appInfo: { name: 'Sekondment', version: '0.1.0' },
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe() as object, prop, receiver);
  },
});

export const PLATFORM_FEE_PCT = 15;

/** Pence helpers — Stripe works in the smallest currency unit. */
export const toMinor = (pounds: number) => Math.round(pounds * 100);
export const fromMinor = (pence: number) => pence / 100;
