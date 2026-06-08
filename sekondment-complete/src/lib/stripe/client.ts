import Stripe from 'stripe';

// Single Stripe client for all server-side calls. The API version is pinned so
// behaviour is stable across deploys; bump deliberately when upgrading.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
  typescript: true,
  appInfo: { name: 'Sekondment', version: '0.1.0' },
});

export const PLATFORM_FEE_PCT = 15;

/** Pence helpers — Stripe works in the smallest currency unit. */
export const toMinor = (pounds: number) => Math.round(pounds * 100);
export const fromMinor = (pence: number) => pence / 100;
