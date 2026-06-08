/* ============================================================================
   Industry theming. Maps a free-text industry/expertise string to one of the
   eight accent themes defined in globals.css (data-industry="..."). Each theme
   exposes --c-industry and --c-industry-tint, which adapt for light/dark mode.
   Use: <div data-industry={industryKey(name)}> … then className with
   text-industry / bg-[var(--c-industry-tint)] etc.
   ========================================================================== */

export type IndustryKey =
  | 'technology' | 'finance' | 'marketing' | 'legal'
  | 'creative' | 'operations' | 'healthcare' | 'people';

export const INDUSTRY_LABELS: Record<IndustryKey, string> = {
  technology: 'Technology',
  finance: 'Finance',
  marketing: 'Marketing',
  legal: 'Legal',
  creative: 'Creative',
  operations: 'Operations',
  healthcare: 'Healthcare',
  people: 'People & HR',
};

// Keyword buckets — generous matching so messy free-text still themes sensibly.
const RULES: [IndustryKey, RegExp][] = [
  ['technology', /tech|software|engineer|developer|cloud|data|ai|ml|devops|saas|platform|cyber|it\b/i],
  ['finance', /financ|account|fp&a|cfo|fund|invest|bank|tax|audit|treasur/i],
  ['marketing', /market|brand|growth|demand|seo|content|social|advert|pr\b|comms/i],
  ['legal', /legal|law|counsel|contract|compliance|ip\b|gdpr|regulat/i],
  ['creative', /design|creativ|ux|ui|product design|art|video|graphic|brand design/i],
  ['operations', /operation|ops\b|supply|logistic|process|lean|project manage|programme|pmo/i],
  ['healthcare', /health|medic|clinic|pharma|care|biotech|nhs/i],
  ['people', /\bhr\b|people|talent|recruit|culture|l&d|learning/i],
];

/** Resolve an industry name (or list) to a theme key. Falls back to brand blue. */
export function industryKey(input?: string | string[] | null): IndustryKey | undefined {
  if (!input) return undefined;
  const text = Array.isArray(input) ? input.join(' ') : input;
  if (!text.trim()) return undefined;
  for (const [key, re] of RULES) {
    if (re.test(text)) return key;
  }
  return undefined; // undefined -> CSS falls back to --c-blue
}

/** The label to display for a resolved key, or the original text if no match. */
export function industryLabel(input?: string | string[] | null): string | null {
  const key = industryKey(input);
  if (key) return INDUSTRY_LABELS[key];
  if (!input) return null;
  const text = Array.isArray(input) ? input[0] : input;
  return text?.trim() || null;
}
