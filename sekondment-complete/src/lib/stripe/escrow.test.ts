import { describe, it, expect } from 'vitest';
import { computeSplit, transferGroupFor } from './escrow';

// PLATFORM_FEE_PCT is 15. All amounts are in pence (minor units).
describe('computeSplit', () => {
  it('takes a 15% fee and pays the full net to a single expert', () => {
    const r = computeSplit({
      amountPounds: 100,
      payeeType: 'expert',
      primaryStripeAccount: 'acct_expert',
    });
    expect(r.grossMinor).toBe(10000);
    expect(r.feeMinor).toBe(1500);
    expect(r.netMinor).toBe(8500);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toEqual({ destination: 'acct_expert', amountMinor: 8500, role: 'primary' });
  });

  it('does NOT split for an expert payee even if a split fraction is passed', () => {
    const r = computeSplit({
      amountPounds: 100,
      payeeType: 'expert',
      primaryStripeAccount: 'acct_expert',
      resourceSplitToExpert: 0.5,
      expertStripeAccount: 'acct_individual',
    });
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].role).toBe('primary');
  });

  it('splits the NET (post-fee) between business and its resource', () => {
    const r = computeSplit({
      amountPounds: 100,
      payeeType: 'business',
      primaryStripeAccount: 'acct_business',
      resourceSplitToExpert: 0.5,
      expertStripeAccount: 'acct_individual',
    });
    expect(r.netMinor).toBe(8500);
    expect(r.lines).toHaveLength(2);
    const sum = r.lines.reduce((a, l) => a + l.amountMinor, 0);
    expect(sum).toBe(r.netMinor); // no money created or lost
    expect(r.lines.find((l) => l.role === 'resource_split')!.amountMinor).toBe(4250);
    expect(r.lines.find((l) => l.role === 'primary')!.amountMinor).toBe(4250);
  });

  it('never leaks pence on awkward split fractions (remainder goes to primary)', () => {
    const r = computeSplit({
      amountPounds: 99.99,
      payeeType: 'employer_partner',
      primaryStripeAccount: 'acct_partner',
      resourceSplitToExpert: 1 / 3,
      expertStripeAccount: 'acct_individual',
    });
    const sum = r.lines.reduce((a, l) => a + l.amountMinor, 0);
    expect(sum).toBe(r.netMinor);
    expect(r.feeMinor + r.netMinor).toBe(r.grossMinor);
  });

  it('does not split when no resource account is provided', () => {
    const r = computeSplit({
      amountPounds: 50,
      payeeType: 'business',
      primaryStripeAccount: 'acct_business',
      resourceSplitToExpert: 0.4,
      expertStripeAccount: null,
    });
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].amountMinor).toBe(r.netMinor);
  });

  it('fee + net always reconciles to gross', () => {
    for (const amt of [0.01, 1, 33.33, 100, 12345.67]) {
      const r = computeSplit({ amountPounds: amt, payeeType: 'expert', primaryStripeAccount: 'a' });
      expect(r.feeMinor + r.netMinor).toBe(r.grossMinor);
    }
  });
});

describe('transferGroupFor', () => {
  it('namespaces by engagement id', () => {
    expect(transferGroupFor('abc')).toBe('eng_abc');
  });
});
