'use server';

import { createClient } from '@/lib/supabase/server';

/* ============================================================================
   AI Project Builder — FOUNDATION (rule-based, no AI dependency yet).
   Business types a plain-language need; we suggest a structured project by
   matching keywords to the expertise taxonomy + sensible defaults. Real AI can
   replace the suggestion core later without changing the interface.
   ========================================================================== */

export async function buildProjectSuggestion(need: string) {
  const supabase = await createClient();
  const text = need.toLowerCase();

  // Match taxonomy + aliases mentioned in the need.
  const { data: taxonomy } = await supabase
    .from('expertise_taxonomy')
    .select('id, name, slug, type, commercial_value_score')
    .eq('is_active', true);
  const { data: aliases } = await supabase
    .from('expertise_aliases').select('alias, expertise_id');

  const matched = new Map<string, any>();
  for (const t of taxonomy ?? []) {
    if (text.includes(t.name.toLowerCase())) matched.set(t.id, t);
  }
  for (const a of aliases ?? []) {
    if (text.includes(a.alias.toLowerCase())) {
      const t = (taxonomy ?? []).find((x) => x.id === a.expertise_id);
      if (t) matched.set(t.id, t);
    }
  }
  const expertise = Array.from(matched.values());

  // Heuristic scope: short sprint vs longer engagement.
  const isSprint = /sprint|quick|week|short|urgent|small/.test(text);
  const isImplementation = /implement|migrat|build|deploy|setup|set up|integrat/.test(text);

  const primary = expertise[0]?.name ?? 'specialist support';
  const title = isImplementation
    ? `${expertise[0]?.name ?? 'Implementation'} project`
    : `${primary} engagement`;

  const milestones = isSprint
    ? ['Discovery & plan', 'Delivery', 'Handover']
    : ['Discovery & scoping', 'Phase 1 delivery', 'Phase 2 delivery', 'Review & handover'];

  const estHours = isSprint ? 40 : 120;
  const dayRate = 600;
  const budgetLow = Math.round((estHours / 8) * dayRate * 0.8);
  const budgetHigh = Math.round((estHours / 8) * dayRate * 1.2);

  return {
    title,
    description: `Engagement to deliver: ${need.trim()}.`,
    scope: isImplementation
      ? 'Plan, implement and hand over the solution with documentation.'
      : 'Advise and deliver against the stated need with clear checkpoints.',
    deliverables: milestones.map((m) => `${m} output`),
    requiredExpertise: expertise.slice(0, 5).map((e) => ({ id: e.id, name: e.name })),
    suggestedMilestones: milestones,
    estimatedHours: estHours,
    suggestedBudget: { low: budgetLow, high: budgetHigh, currency: 'GBP' },
    risks: [
      'Scope creep if deliverables are not fixed up front',
      'Availability of the right verified expertise',
      isImplementation ? 'Dependency on client systems/access' : 'Clarity of decision-making',
    ],
  };
}
