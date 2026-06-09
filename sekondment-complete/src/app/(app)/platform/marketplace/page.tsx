import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';

/* Marketplace Health — funnel rates, supply/demand by expertise, gaps.
   Visible to owner / director / marketplace_manager / operations_manager. */
export default async function MarketplaceDashboard() {
  await requirePlatform('marketplace');
  const svc = createServiceClient();

  const count = async (table: string, filter?: (q: any) => any) => {
    let q = svc.from(table).select('id', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count: c } = await q;
    return c ?? 0;
  };

  const [opps, withProposals, proposals, accepted, engagements, completed, experts] = await Promise.all([
    count('opportunities'),
    count('opportunities', (q: any) => q.eq('status', 'open')),
    count('proposals'),
    count('proposals', (q: any) => q.eq('status', 'accepted')),
    count('engagements'),
    count('engagements', (q: any) => q.eq('status', 'completed')),
    count('expert_profiles'),
  ]);

  const proposalRate = opps ? (proposals / opps) : 0;          // proposals per opp
  const acceptanceRate = proposals ? (accepted / proposals) * 100 : 0;
  const conversionRate = opps ? (engagements / opps) * 100 : 0;
  const completionRate = engagements ? (completed / engagements) * 100 : 0;

  // Demand vs supply from the intelligence view (if present).
  const { data: intel } = await svc
    .from('expertise_intelligence')
    .select('name, times_requested, active_experts')
    .order('times_requested', { ascending: false })
    .limit(10);

  const demand = (intel ?? []).map((r: any) => ({
    name: r.name as string,
    req: Number(r.times_requested ?? 0),
    sup: Number(r.active_experts ?? 0),
    gap: Number(r.times_requested ?? 0) - Number(r.active_experts ?? 0),
  }));
  const gaps = [...demand].filter((d) => d.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 6);
  const maxReq = Math.max(1, ...demand.map((d) => d.req));

  return (
    <PlatformShell active="marketplace">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Marketplace health</h1>
      <p className="text-muted mb-6">Is the marketplace converting, and where are the supply gaps?</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="Proposals / opportunity" value={proposalRate.toFixed(1)} />
        <Metric label="Acceptance rate" value={`${acceptanceRate.toFixed(0)}%`} />
        <Metric label="Conversion to engagement" value={`${conversionRate.toFixed(0)}%`} />
        <Metric label="Completion rate" value={`${completionRate.toFixed(0)}%`} />
        <Metric label="Open opportunities" value={String(withProposals)} />
        <Metric label="Total opportunities" value={String(opps)} />
        <Metric label="Active experts" value={String(experts)} />
        <Metric label="Engagements" value={String(engagements)} />
      </div>

      <div className="card mb-6">
        <h2 className="font-serif text-xl mb-1">Demand vs supply by expertise</h2>
        <p className="text-muted text-sm mb-4">Requested (blue) vs available experts (gold). Tall blue + short gold = recruit here.</p>
        {demand.length === 0 ? (
          <p className="text-muted text-sm">No demand data yet — run some matches to populate the intelligence view.</p>
        ) : (
          <div className="space-y-2.5">
            {demand.map((d) => (
              <div key={d.name}>
                <div className="flex justify-between text-sm mb-1"><span className="truncate">{d.name}</span><span className="text-muted flex-none ml-2">{d.req} req · {d.sup} experts</span></div>
                <div className="flex gap-1 items-center">
                  <div className="rounded h-2.5" style={{ width: `${(d.req / maxReq) * 100}%`, background: 'var(--c-blue)', minWidth: 4 }} />
                  <div className="rounded h-2.5" style={{ width: `${(d.sup / maxReq) * 100}%`, background: 'var(--c-gold)', minWidth: d.sup ? 4 : 0 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-serif text-xl mb-1">Priority supply gaps</h2>
        <p className="text-muted text-sm mb-3">Biggest shortfalls — what to recruit next.</p>
        {gaps.length === 0 ? (
          <p className="text-muted text-sm">No gaps detected (or no demand data yet).</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {gaps.map((d) => (
              <div key={d.name} className="flex items-center justify-between py-2.5 text-sm">
                <span className="truncate">{d.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded flex-none" style={{ background: '#a14b3d18', color: '#a14b3d' }}>gap {d.gap}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="font-serif text-2xl">{value}</p>
    </div>
  );
}
