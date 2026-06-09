import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';

/* Expertise intelligence — most requested, highest value, most AI-resistant,
   biggest supply gaps. The strategic recruit/promote/monetise layer.
   Visible to owner / director / marketplace_manager. */
export default async function ExpertiseIntelligence() {
  await requirePlatform('expertise');
  const svc = createServiceClient();

  // The intelligence view joins taxonomy + demand stats.
  const { data } = await svc
    .from('expertise_intelligence')
    .select('name, commercial_value_score, ai_resistance_score, demand_weight, times_requested, active_experts')
    .limit(200);

  const rows = (data ?? []).map((r: any) => ({
    name: r.name as string,
    value: Number(r.commercial_value_score ?? 0),
    ai: Number(r.ai_resistance_score ?? 0),
    demand: Number(r.demand_weight ?? 0),
    req: Number(r.times_requested ?? 0),
    sup: Number(r.active_experts ?? 0),
  }));

  const topBy = (key: 'demand' | 'value' | 'ai' | 'req', n = 8) =>
    [...rows].sort((a, b) => b[key] - a[key]).slice(0, n).filter((r) => r[key] > 0);
  const gaps = [...rows].map((r) => ({ ...r, gap: r.req - r.sup })).filter((r) => r.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 8);

  return (
    <PlatformShell active="expertise">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Expertise intelligence</h1>
      <p className="text-muted mb-6">What to recruit, promote, verify and monetise — the strategic layer.</p>

      {rows.length === 0 ? (
        <div className="card"><p className="text-muted text-sm">No expertise data yet. Apply the taxonomy seed (0030) and run some matches to populate this.</p></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <List title="Highest demand" sub="market is asking for these" rows={topBy('demand')} render={(r) => `${r.demand}`} />
          <List title="Highest commercial value" sub="premium rates" rows={topBy('value')} render={(r) => `${r.value}`} />
          <List title="Most AI-resistant" sub="defensible, future-proof" rows={topBy('ai')} render={(r) => `${r.ai}`} />
          <List title="Priority supply gaps" sub="requested but undersupplied — recruit here" rows={gaps} render={(r: any) => `gap ${r.gap}`} warn />
        </div>
      )}
    </PlatformShell>
  );
}

function List({ title, sub, rows, render, warn }: { title: string; sub: string; rows: any[]; render: (r: any) => string; warn?: boolean }) {
  return (
    <div className="card">
      <h2 className="font-serif text-lg mb-1">{title}</h2>
      <p className="text-muted text-xs mb-3">{sub}</p>
      {rows.length === 0 ? <p className="text-muted text-sm">No data.</p> : (
        <div className="divide-y divide-[var(--line)]">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="truncate">{i + 1}. {r.name}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded flex-none" style={{ background: warn ? '#a14b3d18' : '#1d4ed818', color: warn ? '#a14b3d' : '#1d4ed8' }}>{render(r)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
