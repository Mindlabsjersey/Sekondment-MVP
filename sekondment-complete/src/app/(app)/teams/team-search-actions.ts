'use server';

import { createServiceClient } from '@/lib/supabase/server';

/* Capability search — find TEAMS (businesses + their deployed employees) by the
   expertise they collectively hold. Complements expert search: a business can find a
   partner company that can field a whole capability, not just one freelancer.
   Read-only, no Stripe. */

export type TeamResult = {
  businessId: string;
  company: string;
  industry: string | null;
  logoUrl: string | null;
  memberCount: number;
  expertise: { name: string; level: string }[];
  matchedCount: number;       // how many of the searched terms this team covers
};

export async function searchTeams(query: string): Promise<TeamResult[]> {
  const svc = createServiceClient();
  const q = query.trim().toLowerCase();

  // Businesses that have deployed employees (company resources).
  const { data: businesses } = await svc
    .from('business_profiles')
    .select('id, company_name, industry, logo_url');
  if (!businesses?.length) return [];

  // Employee experts deployed to businesses, with their structured expertise.
  const { data: employees } = await svc
    .from('expert_profiles')
    .select('id, employing_business_id, employment_status, profile_expertise(expertise_id, verification_level, expertise_taxonomy(name))')
    .eq('employment_status', 'approved'); // Only approved employees count as team members

  const results: TeamResult[] = [];
  for (const b of businesses) {
    const members = (employees ?? []).filter((e: any) => e.employing_business_id === b.id);
    if (!members.length) continue; // Only show businesses with active employees

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
      businessId: b.id,
      company: b.company_name as string,
      industry: (b.industry as string) ?? null,
      logoUrl: (b.logo_url as string) ?? null,
      memberCount: members.length,
      expertise,
      matchedCount: matched,
    });
  }

  // Best matches first, then biggest teams.
  return results.sort((a, b) => b.matchedCount - a.matchedCount || b.memberCount - a.memberCount);
}
