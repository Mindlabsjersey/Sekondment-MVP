'use server';

import { createClient } from '@/lib/supabase/server';

/* ============================================================================
   CV / profile extraction — FOUNDATION (keyword-based, no AI dependency).
   Takes pasted CV or LinkedIn text and suggests structured expertise by matching
   taxonomy names + aliases. The prompt explicitly allows starting keyword-based;
   a real AI extractor can replace the core later behind the same interface.
   ========================================================================== */

export async function extractExpertiseFromText(text: string) {
  const supabase = await createClient();
  const lower = ` ${text.toLowerCase()} `;
  if (lower.trim().length < 20) return { suggestions: [], yearsHint: null };

  const { data: taxonomy } = await supabase
    .from('expertise_taxonomy')
    .select('id, name, slug, type')
    .eq('is_active', true);
  const { data: aliases } = await supabase
    .from('expertise_aliases').select('alias, expertise_id');

  // Match on whole-word-ish containment to reduce false positives.
  const hit = (needle: string) => {
    const n = needle.toLowerCase();
    return n.length >= 3 && lower.includes(` ${n} `) ||
           lower.includes(` ${n},`) || lower.includes(` ${n}.`) ||
           lower.includes(`(${n})`) || lower.includes(` ${n}\n`);
  };

  const matched = new Map<string, any>();
  for (const t of taxonomy ?? []) {
    if (lower.includes(t.name.toLowerCase())) matched.set(t.id, { ...t, via: 'name' });
  }
  for (const a of aliases ?? []) {
    if (hit(a.alias)) {
      const t = (taxonomy ?? []).find((x) => x.id === a.expertise_id);
      if (t && !matched.has(t.id)) matched.set(t.id, { ...t, via: `alias: ${a.alias}` });
    }
  }

  // Rough years-of-experience hint from the text.
  const yearsMatch = text.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
  const yearsHint = yearsMatch ? Number(yearsMatch[1]) : null;

  // Seniority hint.
  let seniority: string | null = null;
  if (/\b(chief|c-level|cxo|ceo|cfo|coo|cto|director|head of|vp|vice president)\b/i.test(text)) seniority = 'exec';
  else if (/\b(lead|principal|head)\b/i.test(text)) seniority = 'lead';
  else if (/\b(senior|sr\.)\b/i.test(text)) seniority = 'senior';
  else if (/\b(junior|graduate|trainee|jr\.)\b/i.test(text)) seniority = 'junior';

  // Jurisdictions mentioned (matched against jurisdiction taxonomy names).
  const jurisdictions = (taxonomy ?? [])
    .filter((t: any) => t.type === 'jurisdiction')
    .map((t: any) => t.name.replace(/ \(jurisdiction\)$/, ''))
    .filter((name: string) => lower.includes(name.toLowerCase()));

  // Languages (simple common-language scan).
  const LANGS = ['English', 'French', 'German', 'Spanish', 'Portuguese', 'Italian', 'Dutch', 'Mandarin', 'Arabic', 'Russian', 'Polish'];
  const languages = LANGS.filter((l) => lower.includes(l.toLowerCase()));

  return {
    suggestions: Array.from(matched.values()).slice(0, 15).map((m) => ({
      id: m.id, name: m.name, type: m.type, via: m.via,
    })),
    yearsHint,
    seniority,
    jurisdictions,
    languages,
  };
}
