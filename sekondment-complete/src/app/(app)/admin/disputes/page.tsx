import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import AdminDisputeCard from './AdminDisputeCard';

export default async function AdminDisputesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'admin') redirect('/dashboard');

  const { data: disputes } = await supabase
    .from('disputes')
    .select(`
      *,
      engagements(title, total_amount, currency),
      milestones(title, amount),
      accounts!disputes_raised_by_fkey(full_name, account_type)
    `)
    .order('created_at', { ascending: false });

  const open = (disputes ?? []).filter((d) => ['open', 'under_review'].includes(d.status));
  const resolved = (disputes ?? []).filter((d) => !['open', 'under_review'].includes(d.status));

  return (
    <AppShell accountType="admin">
      <h1 className="font-serif text-4xl tracking-tight mb-1">Dispute resolution</h1>
      <p className="text-muted mb-8">Review evidence from both parties and resolve. Resolution moves real funds.</p>

      <section className="mb-10">
        <h2 className="font-serif text-xl mb-4">Needs action ({open.length})</h2>
        {open.length === 0 ? (
          <div className="card text-center py-10 text-muted">No open disputes.</div>
        ) : (
          <div className="grid gap-4">
            {open.map((d) => <AdminDisputeCard key={d.id} dispute={d} />)}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section>
          <h2 className="font-serif text-xl mb-4">Resolved ({resolved.length})</h2>
          <div className="grid gap-3">
            {resolved.map((d) => (
              <div key={d.id} className="bg-white border border-[var(--line)] rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{(d as any).engagements?.title}</p>
                  <p className="text-xs text-muted mt-0.5">{(d as any).milestones?.title} · {d.reason.slice(0, 60)}{d.reason.length > 60 ? '…' : ''}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md text-moss bg-moss/10 capitalize">
                  {d.status.replace('resolved_', '')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
