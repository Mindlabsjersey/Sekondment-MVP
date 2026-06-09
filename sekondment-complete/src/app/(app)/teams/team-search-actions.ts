'use server';

import { createServiceClient } from '@/lib/supabase/server';

/* Capability search — find TEAMS (employer partners + their deployed people) by the
   expertise they collectively hold. Complements expert search: a business can find a
   consultancy/employer that can field a whole capability, not just one freelancer.
   Read-only, no Stripe. */

export type TeamResult = {
  partnerId: string;
  company: string;
  industry: string | null;
  memberCount: number;
  expertise: { name: string; level: string }[];
  matchedCount: number;       // how many of the searched terms this team covers
};

export async function searchTeams(query: string): Promise<TeamResult[]> {
  const svc = createServiceClient();
  const q = query.trim().toLowerCase();

  // All employer partners.
  const { data: partners } = await svc
    .from('employer_partners')
    .select('id, company_name, industry');
  if (!partners?.length) return [];

  // Experts grouped by their employer_partner_id, with their structured expertise.
  const { data: experts } = await svc
    .from('expert_profiles')
    .select('id, employer_partner_id, profile_expertise(expertise_id, verification_level, expertise_taxonomy(name))');

  const results: TeamResult[] = [];
  for (const p of partners) {
    const members = (experts ?? []).filter((e: any) => e.employer_partner_id === p.id);
    if (!members.length) continue;

    // Union of expertise across the team (dedup by name, keep best level).
    const map = new Map<string, string>();
    const order: Record<string, number> = { declared: 1, verified: 2, proven: 3 };
    for (const m of members as any[]) {
      for (const pe of m.profile_expertise ?? []) {
        const name = pe.expertise_taxonomy?.name as string | undefined;
        if (!name) continue;
        const lvl = (pe.verification_level as string) || 'declared';
        const cur = map.get(name);
        if (!cur || (order[lvl] ?? 0) > (order[cur] ?? 0)) map.set(name, lvl);
      }
    }
    const expertise = [...map.entries()].map(([name, level]) => ({ name, level }));

    // How many search terms this team covers.
    const matched = q ? expertise.filter((x) => x.name.toLowerCase().includes(q)).length : 0;

    // If there's a query, only include teams that match it.
    if (q && matched === 0) continue;

    results.push({
      partnerId: p.id, company: p.company_name as string, industry: (p.industry as string) ?? null,
      memberCount: members.length, expertise, matchedCount: matched,
    });
  }

  // Best matches first, then biggest teams.
  return results.sort((a, b) => b.matchedCount - a.matchedCount || b.memberCount - a.memberCount);
}
