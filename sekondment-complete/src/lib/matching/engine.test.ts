import { describe, it, expect } from 'vitest';
import { computeMatch, type Requirement, type CandidateSignals } from './engine';

const req = (over: Partial<Requirement> = {}): Requirement => ({
  expertiseId: 'e1',
  name: 'Tax Law',
  importance: 'required',
  requiredLevel: 3,
  requiredVerification: 'verified',
  ...over,
});

describe('computeMatch', () => {
  it('scores 0-100 and rewards a fully-qualified, high-quality candidate', () => {
    const c: CandidateSignals = {
      expertise: [{ expertiseId: 'e1', declaredLevel: 5, verificationLevel: 'proven' }],
      trustScore: 90,
      completedProjects: 10,
      reviewScore: 5,
      availabilityOk: true,
      rateWithinBudget: true,
      workModeOk: true,
      timezoneOk: true,
      verified: true,
    };
    const r = computeMatch([req()], c);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.missing).toHaveLength(0);
  });

  it('flags a required expertise the candidate does not hold', () => {
    const r = computeMatch([req()], { expertise: [] });
    expect(r.missing.some((m) => m.name === 'Tax Law' && /not held/i.test(m.detail))).toBe(true);
  });

  it('gives partial credit when expertise is held but below required verification', () => {
    const full = computeMatch([req()], {
      expertise: [{ expertiseId: 'e1', declaredLevel: 5, verificationLevel: 'proven' }],
    });
    const partial = computeMatch([req()], {
      expertise: [{ expertiseId: 'e1', declaredLevel: 5, verificationLevel: 'declared' }],
    });
    expect(partial.score).toBeLessThan(full.score);
    expect(partial.missing.some((m) => /needs verified/i.test(m.detail))).toBe(true);
  });

  it('gives related-expertise partial credit', () => {
    const none = computeMatch([req()], { expertise: [] });
    const related = computeMatch([req()], { expertise: [], relatedExpertiseIds: ['e1'] });
    expect(related.score).toBeGreaterThan(none.score);
    expect(related.reasons.some((x) => x.factor === 'related')).toBe(true);
  });

  it('penalises prior disputes and never drops below 0', () => {
    const clean = computeMatch([req()], {
      expertise: [{ expertiseId: 'e1', declaredLevel: 5, verificationLevel: 'proven' }],
    });
    const disputed = computeMatch([req()], {
      expertise: [{ expertiseId: 'e1', declaredLevel: 5, verificationLevel: 'proven' }],
      disputeCount: 3,
    });
    expect(disputed.score).toBeLessThan(clean.score);
    expect(disputed.score).toBeGreaterThanOrEqual(0);
  });

  it('records over-budget and unavailability as missing', () => {
    const r = computeMatch([req()], {
      expertise: [{ expertiseId: 'e1', declaredLevel: 5, verificationLevel: 'proven' }],
      rateWithinBudget: false,
      availabilityOk: false,
    });
    expect(r.missing.some((m) => m.name === 'Budget')).toBe(true);
    expect(r.missing.some((m) => m.name === 'Availability')).toBe(true);
  });
});
