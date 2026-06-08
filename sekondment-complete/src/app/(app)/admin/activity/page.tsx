import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';

const LABEL: Record<string, string> = {
  engagement_created: 'Engagement created', milestone_funded: 'Milestone funded',
  milestone_submitted: 'Work submitted', milestone_released: 'Payment released',
  deliverable_added: 'Deliverable added', dispute_raised: 'Dispute raised',
  dispute_resolved: 'Dispute resolved', review_left: 'Review left',
};
const TONE: Record<string, string> = {
  dispute_raised: 'text-[#a14b3d] bg-[#a14b3d]/10',
  milestone_funded: 'text-[#b8862f] bg-[#b8862f]/12',
  milestone_released: 'text-moss bg-moss/10',
  engagement_created: 'text-moss bg-moss/8',
};

export default async function AdminActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: account } = await supabase.from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'admin') redirect('/dashboard');

  const svc = createServiceClient();
  const { data: events } = await svc
    .from('activity_events')
    .select('id, event_type, detail, created_at, engagement_id, accounts:actor_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(300);
  const rows = events ?? [];

  return (
    <AppShell accountType="admin">
      <h1 className="font-serif text-4xl tracking-tight mb-1">Activity</h1>
      <p className="text-muted mb-8">Engagement-level event stream across the platform.</p>

      {rows.length === 0 ? (
        <div className="card text-center py-14 text-muted">No activity yet.</div>
      ) : (
        <div className="grid gap-2">
          {rows.map((e: any) => (
            <div key={e.id} className="bg-surface border border-[var(--line)] rounded-xl px-4 py-3 flex items-center gap-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded flex-none ${TONE[e.event_type] ?? 'text-muted bg-muted/10'}`}>
                {LABEL[e.event_type] ?? e.event_type}
              </span>
              <div className="flex-1 min-w-0">
                {e.accounts && <span className="text-sm">{e.accounts.full_name || e.accounts.email}</span>}
                {e.engagement_id && <span className="text-xs text-muted ml-2">eng {e.engagement_id.slice(0, 8)}…</span>}
              </div>
              <span className="text-xs text-muted flex-none whitespace-nowrap">
                {new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
