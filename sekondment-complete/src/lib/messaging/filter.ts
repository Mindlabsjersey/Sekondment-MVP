/* ============================================================================
   Anti-circumvention filter.
   Detects attempts to move a conversation off-platform (sharing emails, phone
   numbers, external payment handles). Messages are NOT blocked or edited — they
   are flagged for admin review, per the spec — so legitimate edge cases aren't
   silently destroyed. Pure function: easy to test.
   ========================================================================== */

export interface FlagResult {
  flagged: boolean;
  reason: string | null;
}

// Patterns that suggest circumvention. Kept conservative to limit false positives.
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'email address', re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  // phone: 8+ digits allowing spaces, dashes, parens, leading +
  { name: 'phone number', re: /(?:\+?\d[\d\s().-]{7,}\d)/ },
  { name: 'off-platform payment', re: /\b(paypal|venmo|cash\s?app|revolut|wise|bank\s+transfer|iban|sort\s?code|bitcoin|btc|crypto\s+wallet)\b/i },
  { name: 'messaging app', re: /\b(whatsapp|telegram|signal|wechat|skype|dm\s+me|text\s+me\s+at)\b/i },
  { name: 'work around fees', re: /\b(off\s?-?platform|avoid\s+the\s+fee|outside\s+(the\s+)?(app|platform)|directly\s+instead)\b/i },
];

export function screenMessage(body: string): FlagResult {
  for (const p of PATTERNS) {
    if (p.re.test(body)) {
      return { flagged: true, reason: p.name };
    }
  }
  return { flagged: false, reason: null };
}
