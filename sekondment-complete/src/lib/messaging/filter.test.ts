import { describe, it, expect } from 'vitest';
import { screenMessage } from './filter';

describe('screenMessage', () => {
  it('flags email addresses', () => {
    const r = screenMessage('reach me at jane.doe@example.co.uk please');
    expect(r.flagged).toBe(true);
    expect(r.reason).toBe('email address');
  });

  it('flags phone numbers', () => {
    expect(screenMessage('call +44 7700 900123 tonight').flagged).toBe(true);
    expect(screenMessage('my cell is (212) 555-0199').flagged).toBe(true);
  });

  it('flags off-platform payment handles', () => {
    expect(screenMessage('just paypal me the deposit').reason).toBe('off-platform payment');
    expect(screenMessage('send via Revolut instead').reason).toBe('off-platform payment');
  });

  it('flags messaging apps', () => {
    expect(screenMessage('add me on WhatsApp').reason).toBe('messaging app');
    expect(screenMessage('lets move to telegram').reason).toBe('messaging app');
  });

  it('flags explicit fee-avoidance language', () => {
    expect(screenMessage('we can work off-platform to avoid the fee').flagged).toBe(true);
  });

  it('does NOT flag legitimate project messages', () => {
    const clean = [
      'Happy to start the discovery milestone next Monday.',
      'The scope looks good — I will submit the deliverable for review.',
      'Can you clarify the budget range for phase 2?',
    ];
    for (const m of clean) {
      expect(screenMessage(m).flagged).toBe(false);
    }
  });

  it('returns a null reason when not flagged', () => {
    expect(screenMessage('Looking forward to working together.')).toEqual({ flagged: false, reason: null });
  });
});
