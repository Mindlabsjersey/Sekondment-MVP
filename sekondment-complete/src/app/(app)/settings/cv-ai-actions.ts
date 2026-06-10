'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/* CV text → structured extraction via OpenAI (or any LLM you wire in).
   Returns a strongly-typed extraction result you can review before applying. */

export type Extraction = {
  headline?: string;
  summary?: string;
  skills?: string[];
  achievements?: string[];
  seniority?: string;
  industries?: string[];
  suggested_rate?: { min: number; max: number; currency: string } | null;
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-3-opus-20240229';

console.log('[CV AI] ANTHROPIC_API_KEY present?', !!ANTHROPIC_API_KEY, 'Length:', ANTHROPIC_API_KEY?.length);

export async function extractExpertiseFromText(text: string): Promise<
  { ok: true; extracted: Extraction; charCount: number } | { ok: false; error: string }
> {
  if (!ANTHROPIC_API_KEY) {
    console.error('[CV AI] Missing ANTHROPIC_API_KEY');
    return { ok: false, error: 'CV extraction is not configured (missing ANTHROPIC_API_KEY).' };
  }
  if (!text || text.trim().length < 20) {
    return { ok: false, error: 'Not enough text to extract from.' };
  }

  const prompt = `You are a CV parser for a fractional talent platform. Extract the following from the CV:

- headline: A concise professional title (e.g., "Fractional CTO", "ML Engineer")
- summary: 1-2 sentence professional summary
- skills: Array of technical/professional skills (max 20)
- achievements: Array of 3-5 concrete achievements with metrics
- seniority: One of [entry, mid, senior, lead, executive]
- industries: Array of industries worked in (max 5)
- suggested_rate: Object with min, max (in GBP), and currency, or null if unclear

Return ONLY valid JSON matching this structure:
{
  "headline": string | null,
  "summary": string | null,
  "skills": string[],
  "achievements": string[],
  "seniority": string | null,
  "industries": string[],
  "suggested_rate": { min: number, max: number, currency: string } | null
}

CV TEXT:
${text.slice(0, 8000)}
`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'No error body');
      console.error('[CV AI] API error:', res.status, errorBody);
      return { ok: false, error: `AI service error: ${res.status} - ${errorBody.slice(0, 200)}` };
    }

    const json = await res.json();
    const content = json?.content?.[0]?.text;
    if (!content) {
      return { ok: false, error: 'No extraction returned from AI.' };
    }

    const extracted = JSON.parse(content);
    return {
      ok: true,
      extracted: {
        headline: extracted.headline ?? undefined,
        summary: extracted.summary ?? undefined,
        skills: Array.isArray(extracted.skills) ? extracted.skills : [],
        achievements: Array.isArray(extracted.achievements) ? extracted.achievements : [],
        seniority: extracted.seniority ?? undefined,
        industries: Array.isArray(extracted.industries) ? extracted.industries : [],
        suggested_rate: extracted.suggested_rate ?? null,
      },
      charCount: text.length,
    };
  } catch (e) {
    return { ok: false, error: 'Failed to extract from CV. Try pasting text directly.' };
  }
}

/* Apply extracted fields to an expert profile.
   Preserves existing data unless explicitly overwritten by extraction. */
export async function enhanceProfileFromExtraction(
  expertId: string,
  extraction: Extraction
): Promise<{ ok: true } | { ok: false; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  // Verify ownership
  const { data: expert } = await supabase
    .from('expert_profiles')
    .select('id, skills, bio, headline, industries')
    .eq('id', expertId)
    .eq('account_id', user.id)
    .single();

  if (!expert) return { ok: false, error: 'Profile not found or not authorized.' };

  // Merge fields (extraction adds to existing, doesn't fully replace)
  const mergedSkills = Array.from(new Set([...(expert.skills ?? []), ...(extraction.skills ?? [])]));
  const mergedIndustries = Array.from(new Set([...(expert.industries ?? []), ...(extraction.industries ?? [])]));

  const { error } = await supabase
    .from('expert_profiles')
    .update({
      headline: extraction.headline ?? expert.headline ?? null,
      bio: extraction.summary ?? expert.bio ?? null,
      skills: mergedSkills,
      industries: mergedIndustries,
    })
    .eq('id', expertId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings');
  revalidatePath('/onboarding');
  return { ok: true };
}
