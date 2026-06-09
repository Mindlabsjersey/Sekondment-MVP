import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';
import { formatMoney } from '@/lib/currency';

/* Payments dashboard — escrow state: funded/released/held, refunds, Stripe refs.
   Visible to owner / director / finance_manager. */
export default async function PaymentsDashboard() {
  await requirePlatform('payments');
  const svc = createServiceClient();

  const [{ data: ledger }, { data: milestones }] = await Promise.all([
    svc.from('ledger_entries').select('entry_type, amount, currency, stripe_object_id, created_at, engagement_id, milestone_id'),
    svc.from('milestones').select('status, amount'),
  ]);

  const rows = ledger ?? [];
  const ms = milestones ?? [];
  const sum = (pred: (r: typeof rows[number]) => boolean) => rows.filter(pred).reduce((a, r) => a + Number(r.amount), 0);
  const msSum = (status: string) => ms.filter((m) => m.status === status).reduce((a, m) => a + Number(m.amount), 0);

  const funded = sum((r) => r.entry_type === 'fund');
  const released = sum((r) => r.entry_type === 'transfer_expert' || r.entry_type === 'transfer_business');
  const fees = sum((r) => r.entry_type === 'fee');
  const refunds = sum((r) => r.entry_type === 'refund');
  const held = msSum('funded') + msSum('submitted') + msSum('releasing'); // funded but not released
  const pendingRelease = msSum('submitted') + msSum('releasing');

  const recent = [...rows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 12);
  const typeLabel: Record<string, string> = {
    fund: 'Funded', fee: 'Platform fee', transfer_expert: 'To expert', transfer_business: 'To business', refund: 'Refund',
  };
  const typeColor: Record<string, string> = {
    fund: 'var(--c-blue)', fee: '#a14b3d', transfer_expert: '#2f8f6b', transfer_business: '#2f8f6b', refund: '#b8862f',
  };

  return (
    <PlatformShell active="payments">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Payments</h1>
      <p className="text-muted mb-6">Escrow flow, funds held, releases and Stripe references.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="Total funded" value={formatMoney(funded, 'GBP')} big />
        <Metric label="Funds held (escrow)" value={formatMoney(held, 'GBP')} big />
        <Metric label="Released to parties" value={formatMoney(released, 'GBP')} />
        <Metric label="Platform fees" value={formatMoney(fees, 'GBP')} />
        <Metric label="Pending release" value={formatMoney(pendingRelease, 'GBP')} />
        <Metric label="Refunds" value={formatMoney(refunds, 'GBP')} />
        <Metric label="Ledger entries" value={String(rows.length)} />
        <Metric label="Milestones" value={String(ms.length)} />
      </div>

      <div className="card">
        <h2 className="font-serif text-xl mb-3">Recent ledger activity</h2>
        {recent.length === 0 ? (
          <p className="text-muted text-sm">No payments yet — fund a milestone to see entries here.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {recent.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: (typeColor[r.entry_type] ?? '#888') + '18', color: typeColor[r.entry_type] ?? '#888' }}>
                    {typeLabel[r.entry_type] ?? r.entry_type}
                  </span>
                  {r.stripe_object_id && <span className="text-xs text-muted font-mono truncate">{r.stripe_object_id}</span>}
                </div>
                <div className="flex items-center gap-4 flex-none">
                  <span className="font-serif">{formatMoney(Number(r.amount), (r.currency as string) || 'GBP')}</span>
                  <span className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted mt-4">Escrow-style: funds are held until the business approves each milestone. The platform facilitates payment; it does not hold regulated escrow.</p>
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
