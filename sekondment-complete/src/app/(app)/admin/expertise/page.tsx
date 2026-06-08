import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default async function ExpertiseIntelligencePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: account } = await supabase.from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'admin') redirect('/dashboard');

  const svc = createServiceClient();
  // Read the marketplace-intelligence view (joins taxonomy + demand stats).
  const { data: rows } = await svc
    .from('expertise_intelligence')
    .select('*')
    .order('times_requested', { ascending: false })
    .limit(500);

  const all = rows ?? [];
  const mostRequested = [...all].sort((a, b) => b.times_requested - a.times_requested).slice(0, 10);
  const mostSupplied = [...all].sort((a, b) => b.active_experts - a.active_experts).slice(0, 10);
  const highestValue = [...all].sort((a, b) => b.commercial_value_score - a.commercial_value_score).slice(0, 10);
  const mostProven = [...all].sort((a, b) => b.proven_experts - a.proven_experts).slice(0, 10);

  // Supply/demand gap: requested but few experts.
  const gaps = [...all]
    .filter((r) => r.times_requested > 0)
    .map((r) => ({ ...r, gap: r.times_requested - r.active_experts }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10);

  return (
    <AppShell accountType="admin">
      <h1 className="font-serif text-4xl tracking-tight mb-1">Expertise intelligence</h1>
      <p className="text-muted mb-8">
        Marketplace signals from the Expertise Graph — {all.length} expertise records tracked.
        This data is structured for future AI (pricing, forecasting, skill-gap analysis) without schema changes.
      </p>

      <div className="grid sm:grid-cols-2 gap-6">
        <Panel title="Most requested" rows={mostRequested} metric={(r) => `${r.times_requested} req`} />
        <Panel title="Supply / demand gaps" rows={gaps} metric={(r) => `gap ${r.gap}`} tone="warn" />
        <Panel title="Most supplied" rows={mostSupplied} metric={(r) => `${r.active_experts} experts`} />
        <Panel title="Most proven" rows={mostProven} metric={(r) => `${r.proven_experts} proven`} />
        <Panel title="Highest commercial value" rows={highestValue} metric={(r) => `${r.commercial_value_score}/100`} />
        <Panel title="Highest AI-resistance" rows={[...all].sort((a, b) => b.ai_resistance_score - a.ai_resistance_score).slice(0, 10)} metric={(r) => `${r.ai_resistance_score}/100`} />
      </div>

      {all.length > 0 && all.every((r) => r.times_requested === 0) && (
        <p className="text-sm text-muted mt-8">
          Demand stats populate as opportunities define requirements and matches run.
          Trigger <code>refresh_expertise_demand()</code> or recompute matches to populate.
        </p>
      )}
    </AppShell>
  );
}

function Panel({ title, rows, metric, tone }: { title: string; rows: any[]; metric: (r: any) => string; tone?: 'warn' }) {
  return (
    <div className="card">
      <h2 className="font-serif text-lg mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No data yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center justify-between text-sm">
              <span className="truncate"><span className="text-muted mr-2">{i + 1}.</span>{r.name}</span>
              <span className={`text-xs flex-none ml-2 ${tone === 'warn' ? 'text-[#a14b3d]' : 'text-muted'}`}>{metric(r)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
