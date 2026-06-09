import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';

/* Geographic dashboard — users & opportunities by location. Global from day one;
   Jersey is the first test market, nothing hardcoded for it.
   Visible to owner / director / marketplace_manager. */
export default async function GeographicDashboard() {
  await requirePlatform('geographic');
  const svc = createServiceClient();

  const [{ data: experts }, { data: opps }] = await Promise.all([
    svc.from('expert_profiles').select('based_country'),
    svc.from('opportunities').select('country'),
  ]);

  const tally = (rows: any[], key: string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const v = (r[key] || 'Unspecified') as string;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
  };

  const expertGeo = tally(experts ?? [], 'based_country');
  const oppGeo = tally(opps ?? [], 'country');
  const maxE = Math.max(1, ...expertGeo.map((x) => x.n));
  const maxO = Math.max(1, ...oppGeo.map((x) => x.n));

  return (
    <PlatformShell active="geographic">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Geographic</h1>
      <p className="text-muted mb-6">Where supply and demand are concentrated. Global from day one — Jersey first, then where the data points.</p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-serif text-xl mb-1">Experts by country</h2>
          <p className="text-muted text-sm mb-4">supply geography</p>
          {expertGeo.length === 0 ? <p className="text-muted text-sm">No expert location data yet.</p> : (
            <div className="space-y-2.5">
              {expertGeo.map((g) => (
                <div key={g.name}>
                  <div className="flex justify-between text-sm mb-1"><span>{g.name}</span><span className="text-muted">{g.n}</span></div>
                  <div className="h-2.5 rounded bg-paper-2"><div className="h-full rounded" style={{ width: `${(g.n / maxE) * 100}%`, background: 'var(--c-blue)' }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-serif text-xl mb-1">Opportunities by country</h2>
          <p className="text-muted text-sm mb-4">demand geography — where to expand</p>
          {oppGeo.length === 0 ? <p className="text-muted text-sm">No opportunity location data yet.</p> : (
            <div className="space-y-2.5">
              {oppGeo.map((g) => (
                <div key={g.name}>
                  <div className="flex justify-between text-sm mb-1"><span>{g.name}</span><span className="text-muted">{g.n}</span></div>
                  <div className="h-2.5 rounded bg-paper-2"><div className="h-full rounded" style={{ width: `${(g.n / maxO) * 100}%`, background: 'var(--c-gold)' }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted mt-4">A future iteration can add a map view and revenue-by-country once enough geographic data accrues.</p>
    </PlatformShell>
  );
}
