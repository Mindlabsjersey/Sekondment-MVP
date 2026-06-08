import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default async function AdminFlaggedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'admin') redirect('/dashboard');

  // Admin-gated: use service client to read flagged messages across all convos.
  const svc = createServiceClient();
  const { data: flagged } = await svc
    .from('messages')
    .select('id, body, flag_reason, created_at, sender_id, conversation_id, accounts:sender_id(full_name, account_type)')
    .eq('flagged', true)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = flagged ?? [];

  return (
    <AppShell accountType="admin">
      <h1 className="font-serif text-4xl tracking-tight mb-1">Flagged messages</h1>
      <p className="text-muted mb-8">
        Messages caught by the anti-circumvention filter (off-platform contact or payment).
        Review for policy violations — messages are flagged, not blocked.
      </p>

      {rows.length === 0 ? (
        <div className="card text-center py-14 text-muted">
          <p className="font-serif text-xl text-ink mb-2">Nothing flagged</p>
          <p className="text-sm">No messages have tripped the anti-circumvention filter.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((m: any) => (
            <div key={m.id} className="bg-surface border border-[var(--line)] rounded-xl p-5"
              style={{ borderLeft: '4px solid #a14b3d' }}>
              <div className="flex justify-between items-start gap-4 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{m.accounts?.full_name ?? 'User'}</span>
                  <span className="text-xs text-muted capitalize">({m.accounts?.account_type})</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded text-[#a14b3d] bg-[#a14b3d]/10">
                  {m.flag_reason ?? 'flagged'}
                </span>
              </div>
              <p className="text-sm bg-paper-2 rounded-lg px-3 py-2">{m.body}</p>
              <p className="text-xs text-muted mt-2">
                {new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
