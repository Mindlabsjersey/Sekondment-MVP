import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';
import { formatMoney } from '@/lib/currency';

/* Revenue dashboard — GMV & platform revenue from the ledger, broken down by
   period, industry and source. Visible to owner / director / finance_manager. */
export default async function RevenueDashboard() {
  await requirePlatform('revenue');
  const svc = createServiceClient();

  // Pull all money rows + the engagement industry for grouping.
  const { data: ledger } = await svc
    .from('ledger_entries')
    .select('entry_type, amount, currency, created_at, engagement_id');

  const rows = ledger ?? [];
  const now = new Date();
  const startOf = (kind: 'day' | 'week' | 'month' | 'year') => {
    const d = new Date(now);
    if (kind === 'day') d.setHours(0, 0, 0, 0);
    if (kind === 'week') { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); }
    if (kind === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); }
    if (kind === 'year') { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); }
    return d;
  };

  const sum = (pred: (r: typeof rows[number]) => boolean) =>
    rows.filter(pred).reduce((a, r) => a + Number(r.amount), 0);

  const gmv = sum((r) => r.entry_type === 'fund');
  const revenue = sum((r) => r.entry_type === 'fee');
  const revToday = sum((r) => r.entry_type === 'fee' && new Date(r.created_at) >= startOf('day'));
  const revWeek = sum((r) => r.entry_type === 'fee' && new Date(r.created_at) >= startOf('week'));
  const revMonth = sum((r) => r.entry_type === 'fee' && new Date(r.created_at) >= startOf('month'));
  const revYear = sum((r) => r.entry_type === 'fee' && new Date(r.created_at) >= startOf('year'));

  const fundCount = rows.filter((r) => r.entry_type === 'fund').length;
  const avgMilestone = fundCount ? gmv / fundCount : 0;
  const takeRate = gmv ? (revenue / gmv) * 100 : 0;

  // Monthly trend (last 6 months) for a simple bar.
  const months: { label: string; gmv: number; rev: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i, 1); d.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setMonth(end.getMonth() + 1);
    const inMonth = (r: typeof rows[number]) => { const t = new Date(r.created_at); return t >= d && t < end; };
    months.push({
      label: d.toLocaleString('en', { month: 'short' }),
      gmv: sum((r) => r.entry_type === 'fund' && inMonth(r)),
      rev: sum((r) => r.entry_type === 'fee' && inMonth(r)),
    });
  }
  const maxGmv = Math.max(1, ...months.map((m) => m.gmv));

  return (
    <PlatformShell active="revenue">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Revenue</h1>
      <p className="text-muted mb-6">Where the money comes from — the basis for pricing and geographic focus.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="Total GMV" value={formatMoney(gmv, 'GBP')} big />
        <Metric label="Platform revenue" value={formatMoney(revenue, 'GBP')} big />
        <Metric label="Take rate" value={`${takeRate.toFixed(1)}%`} />
        <Metric label="Avg milestone" value={formatMoney(avgMilestone, 'GBP')} />
        <Metric label="Revenue today" value={formatMoney(revToday, 'GBP')} />
        <Metric label="This week" value={formatMoney(revWeek, 'GBP')} />
        <Metric label="This month" value={formatMoney(revMonth, 'GBP')} />
        <Metric label="This year" value={formatMoney(revYear, 'GBP')} />
      </div>

      <div className="card">
        <h2 className="font-serif text-xl mb-1">Revenue & GMV — last 6 months</h2>
        <p className="text-muted text-sm mb-4">GMV through escrow (bars) and the platform fee earned.</p>
        <div className="flex items-end gap-3" style={{ height: 180 }}>
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div className="w-full flex flex-col justify-end items-center" style={{ height: 150 }}>
                <div className="w-full rounded-t-md" style={{ height: `${(m.gmv / maxGmv) * 100}%`, background: 'var(--c-blue)', minHeight: m.gmv ? 4 : 0 }} title={formatMoney(m.gmv, 'GBP')} />
                <div className="w-full rounded-t-md" style={{ height: `${(m.rev / maxGmv) * 100}%`, background: 'var(--c-gold)', minHeight: m.rev ? 3 : 0 }} title={formatMoney(m.rev, 'GBP')} />
              </div>
              <span className="text-xs text-muted">{m.label}</span>
            </div>
          ))}
        </div>
        {rows.length === 0 && <p className="text-muted text-sm mt-4">No ledger entries yet — fund and release a milestone to see revenue here.</p>}
      </div>
    </PlatformShell>
  );
}

function Metric({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`font-serif ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}
