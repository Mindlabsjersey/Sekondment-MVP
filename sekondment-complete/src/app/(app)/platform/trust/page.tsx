import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';

/* Trust dashboard — Trust Score distribution, highest/lowest, accounts to review.
   Visible to owner / director / operations_manager / compliance_manager. */
export default async function TrustDashboard() {
  await requirePlatform('trust');
  const svc = createServiceClient();

  const { data: experts } = await svc
    .from('expert_profiles')
    .select('name, trust_score, verification_status')
    .order('trust_score', { ascending: false });

  const rows = experts ?? [];
  const scores = rows.map((r) => Number(r.trust_score ?? 0));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highest = rows.slice(0, 5);
  const lowest = [...rows].filter((r) => Number(r.trust_score) > 0).sort((a, b) => Number(a.trust_score) - Number(b.trust_score)).slice(0, 5);
  const needReview = rows.filter((r) => Number(r.trust_score) < 50 || r.verification_status === 'unverified');

  // Distribution buckets.
  const buckets = [
    { label: '0–24', lo: 0, hi: 24 }, { label: '25–49', lo: 25, hi: 49 },
    { label: '50–69', lo: 50, hi: 69 }, { label: '70–84', lo: 70, hi: 84 }, { label: '85–100', lo: 85, hi: 100 },
  ].map((b) => ({ ...b, n: scores.filter((s) => s >= b.lo && s <= b.hi).length }));
  const maxB = Math.max(1, ...buckets.map((b) => b.n));

  return (
    <PlatformShell active="trust">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Trust</h1>
      <p className="text-muted mb-6">Trust Score health across the marketplace, and who needs review.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="Average Trust Score" value={avg} big />
        <Metric label="Accounts to review" value={needReview.length} tone={needReview.length > 0 ? 'warn' : undefined} />
        <Metric label="Profiles scored" value={rows.length} />
        <Metric label="Top score" value={rows[0] ? Number(rows[0].trust_score) : 0} />
      </div>

      <div className="card mb-6">
        <h2 className="font-serif text-xl mb-1">Trust Score distribution</h2>
        <p className="text-muted text-sm mb-4">how trust is spread across the expert base</p>
        <div className="flex items-end gap-3" style={{ height: 150 }}>
          {buckets.map((b) => (
            <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-1">
              <span className="text-xs text-muted">{b.n}</span>
              <div className="w-full rounded-t-md" style={{ height: `${(b.n / maxB) * 110}px`, background: b.lo >= 70 ? 'var(--c-blue)' : b.lo >= 50 ? 'var(--c-gold)' : '#a14b3d', minHeight: b.n ? 4 : 0 }} />
              <span className="text-xs text-muted">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-serif text-lg mb-3">Highest trust</h2>
          {highest.length === 0 ? <p className="text-muted text-sm">No data yet.</p> : highest.map((r, i) => (
            <Row key={i} name={r.name} score={Number(r.trust_score)} />
          ))}
        </div>
        <div className="card">
          <h2 className="font-serif text-lg mb-3">Lowest trust (review)</h2>
          {lowest.length === 0 ? <p className="text-muted text-sm">No data yet.</p> : lowest.map((r, i) => (
            <Row key={i} name={r.name} score={Number(r.trust_score)} />
          ))}
        </div>
      </div>
    </PlatformShell>
  );
}

function Row({ name, score }: { name: string | null; score: number }) {
  const c = score >= 70 ? 'var(--c-blue)' : score >= 50 ? 'var(--c-gold)' : '#a14b3d';
  return (
    <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--line)] first:border-0">
      <span className="truncate">{name || 'Unnamed'}</span>
      <span className="font-serif px-2 py-0.5 rounded text-xs" style={{ background: c + '18', color: c }}>{score}</span>
    </div>
  );
}

function Metric({ label, value, big, tone }: { label: string; value: number; big?: boolean; tone?: 'warn' }) {
  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`font-serif ${big ? 'text-3xl' : 'text-2xl'} ${tone === 'warn' ? 'text-[#a14b3d]' : ''}`}>{value}</p>
    </div>
  );
}
