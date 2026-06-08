/* ============================================================================
   Currency — global readiness. Sekondment is GBP-first (Jersey test market)
   but must support UK, Ireland, Dubai and beyond from day one. Every amount in
   the DB carries its own `currency` (char 3); never assume GBP at the UI layer.
   ========================================================================== */

export type CurrencyCode = 'GBP' | 'EUR' | 'USD' | 'AED' | 'CHF' | 'AUD' | 'CAD' | 'SGD';

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
];

const SYMBOLS: Record<string, string> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c.symbol])
);

/** Symbol for a currency code, falling back to the code itself. */
export function currencySymbol(code?: string | null): string {
  if (!code) return '£';
  return SYMBOLS[code.toUpperCase()] ?? code.toUpperCase() + ' ';
}

/**
 * Format an amount in its currency. Uses Intl for correct locale grouping and
 * symbol placement; falls back to a manual symbol if Intl lacks the currency.
 * `amount` is a major-unit number (e.g. 2000 = £2,000).
 */
export function formatMoney(
  amount: number | string | null | undefined,
  code: string = 'GBP',
  opts: { decimals?: boolean } = {}
): string {
  const n = Number(amount ?? 0);
  const cur = (code || 'GBP').toUpperCase();
  const fractionDigits = opts.decimals ? 2 : 0;
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(n);
  } catch {
    // Unknown currency code — manual fallback.
    return `${currencySymbol(cur)}${n.toLocaleString('en-GB', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}`;
  }
}
