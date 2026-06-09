import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';

/* User Growth — signups over time + the activation funnel (where users drop off).
   Visible to owner / director / marketplace_manager. */
export default async function GrowthDashboard() {
  await requirePlatform('growth');
  const svc = createServiceClient();

  const count = async (table: string, filter?: (q: any) => any) => {
    let q = svc.from(table).select('id', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count: c } = await q;
    return c ?? 0;
  };

  // Funnel stages (each a count; later stages are subsets in spirit).
  const [signups, onboarded, withExpertise, proposals, engagements, funded, completed, reviews] = await Promise.all([
    count('accounts'),
    count('expert_profiles'),                       // has a profile = onboarded (proxy)
    count('profile_expertise'),                     // expertise added (rows, not distinct — proxy)
    count('proposals'),
    count('engagements'),
    count('milestones', (q: any) => q.in('status', ['funded', 'submitted', 'releasing', 'released'])),
    count('engagements', (q: any) => q.eq('status', 'completed')),
    count('reviews'),
  ]);

  // Signups by month (last 6).
  const { data: accts } = await svc.from('accounts').select('created_at, account_type');
  const rows = accts ?? [];
  const now = new Date();
  const months: { label: string; n: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i, 1); d.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setMonth(end.getMonth() + 1);
    const n = rows.filter((r) => { const t = new Date(r.created_at); return t >= d && t < end; }).length;
    months.push({ label: d.toLocaleString('en', { month: 'short' }), n });
  }
  const maxM = Math.max(1, ...months.map((m) => m.n));

  const funnel = [
    { stage: 'Signup', n: signups }, { stage: 'Onboarded (profile)', n: onboarded },
    { stage: 'Expertise added', n: withExpertise }, { stage: 'Proposal sent/received', n: proposals },
    { stage: 'Engagement created', n: engagements }, { stage: 'Milestone funded', n: funded },
    { stage: 'Completed', n: completed }, { stage: 'Review submitted', n: reviews },
  ];
  const maxF = Math.max(1, funnel[0].n);

  return (
    <PlatformShell active="growth">
      <h1 className="font-serif text-3xl tracking-tight mb-1">User growth</h1>
      <p className="text-muted mb-6">Are we growing, and where does the funnel leak?</p>

      <div className="card mb-6">
        <h2 className="font-serif text-xl mb-1">New users — last 6 months</h2>
        <p className="text-muted text-sm mb-4">signups per month</p>
        <div className="flex items-end gap-3" style={{ height: 160 }}>
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div className="w-full rounded-t-md" style={{ height: `${(m.n / maxM) * 130}px`, background: 'var(--c-blue)', minHeight: m.n ? 4 : 0 }} title={String(m.n)} />
              <span className="text-xs text-muted">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-serif text-xl mb-1">Activation funnel</h2>
        <p className="text-muted text-sm mb-4">where users drop off — fix the biggest leak first</p>
        <div className="space-y-2.5">
          {funnel.map((f, i) => {
            const pct = Math.round((f.n / maxF) * 100);
            return (
              <div key={f.stage}>
                <div className="flex justify-between text-sm mb-1"><span>{f.stage}</span><span className="text-muted">{f.n} · {pct}%</span></div>
                <div className="h-2.5 rounded bg-paper-2">
                  <div className="h-full rounded" style={{ width: `${pct}%`, background: i < 3 ? 'var(--c-blue)' : i < 6 ? 'var(--c-gold)' : '#2f8f6b' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted mt-4">Stages use count proxies; a future iteration can track distinct users per stage via the activity event stream.</p>
    </PlatformShell>
  );
}
