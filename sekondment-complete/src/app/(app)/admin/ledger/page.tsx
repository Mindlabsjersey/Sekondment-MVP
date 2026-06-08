import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { formatMoney } from '@/lib/currency';

const TYPE_META: Record<string, { label: string; cls: string }> = {
  fund: { label: 'Funded', cls: 'text-[#b8862f] bg-[#b8862f]/12' },
  fee: { label: 'Platform fee', cls: 'text-muted bg-muted/12' },
  transfer_expert: { label: 'Payout · expert', cls: 'text-moss bg-moss/10' },
  transfer_business: { label: 'Payout · payee', cls: 'text-moss bg-moss/10' },
  refund: { label: 'Refund', cls: 'text-[#a14b3d] bg-[#a14b3d]/10' },
};

export default async function AdminLedgerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: account } = await supabase.from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'admin') redirect('/dashboard');

  const svc = createServiceClient();
  const { data: entries } = await svc
    .from('ledger_entries')
    .select('id, entry_type, amount, currency, stripe_object_id, created_at, engagement_id, engagements(title)')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = entries ?? [];

  // Totals by type (note: mixed-currency sums shown in GBP-equivalent label only).
  const sum = (t: string) => rows.filter((r: any) => r.entry_type === t).reduce((a: number, r: any) => a + Number(r.amount), 0);
  const gmv = sum('fund');
  const fees = sum('fee');
  const refunds = sum('refund');

  return (
    <AppShell accountType="admin">
      <h1 className="font-serif text-4xl tracking-tight mb-1">Payment ledger</h1>
      <p className="text-muted mb-8">Every money movement, append-only, with Stripe references.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card"><p className="text-xs text-muted">Funded (GMV)</p><p className="font-serif font-semibold text-2xl mt-1">{formatMoney(gmv)}</p></div>
        <div className="card"><p className="text-xs text-muted">Platform fees</p><p className="font-serif font-semibold text-2xl mt-1 text-sand">{formatMoney(fees)}</p></div>
        <div className="card"><p className="text-xs text-muted">Refunds</p><p className="font-serif font-semibold text-2xl mt-1 text-[#a14b3d]">{formatMoney(refunds)}</p></div>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center py-14 text-muted">No ledger entries yet.</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl2" style={{ borderColor: 'var(--line)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b" style={{ borderColor: 'var(--line)' }}>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Engagement</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Stripe ref</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const m = TYPE_META[r.entry_type] ?? { label: r.entry_type, cls: 'text-muted bg-muted/10' };
                return (
                  <tr key={r.id} className="border-b last:border-0" style={{ borderColor: 'var(--line)' }}>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span></td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{r.engagements?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(r.amount, r.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{r.stripe_object_id ?? '—'}</td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
