import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';

const LABELS: Record<string, string> = {
  identity_submitted: 'Identity submitted', business_verified: 'Business verified',
  expert_verified: 'Expert verified', right_to_work_noted: 'Right to work noted',
  contract_accepted: 'Contract accepted', nda_accepted: 'NDA accepted',
  secondment_approved: 'Secondment approved', milestone_funded: 'Milestone funded',
  payment_released: 'Payment released', dispute_raised: 'Dispute raised',
  dispute_resolved: 'Dispute resolved', off_platform_flag: 'Off-platform flag',
  account_warned: 'Account warned', account_suspended: 'Account suspended',
  employer_resource_approved: 'Employer resource approved',
  verification_document_uploaded: 'Verification doc uploaded',
  verification_document_rejected: 'Verification doc rejected',
};

const TONE: Record<string, string> = {
  off_platform_flag: 'text-[#a14b3d] bg-[#a14b3d]/10',
  account_suspended: 'text-[#a14b3d] bg-[#a14b3d]/10',
  account_warned: 'text-[#b8862f] bg-[#b8862f]/12',
  dispute_raised: 'text-[#b8862f] bg-[#b8862f]/12',
  payment_released: 'text-moss bg-moss/10',
  milestone_funded: 'text-moss bg-moss/10',
};

export default async function AdminCompliancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: account } = await supabase.from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'admin') redirect('/dashboard');

  const svc = createServiceClient();
  const { data: events } = await svc
    .from('compliance_events')
    .select('id, event_type, account_id, engagement_id, detail, created_at, accounts:account_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(300);

  const rows = events ?? [];

  return (
    <AppShell accountType="admin">
      <h1 className="font-serif text-4xl tracking-tight mb-1">Compliance history</h1>
      <p className="text-muted mb-8">Permanent audit trail of platform compliance events.</p>

      {rows.length === 0 ? (
        <div className="card text-center py-14 text-muted">No compliance events logged yet.</div>
      ) : (
        <div className="grid gap-2">
          {rows.map((e: any) => (
            <div key={e.id} className="bg-surface border border-[var(--line)] rounded-xl px-4 py-3 flex items-center gap-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded flex-none ${TONE[e.event_type] ?? 'text-muted bg-muted/10'}`}>
                {LABELS[e.event_type] ?? e.event_type}
              </span>
              <div className="flex-1 min-w-0">
                {e.accounts && <p className="text-sm truncate">{e.accounts.full_name || e.accounts.email}</p>}
                {e.engagement_id && <p className="text-xs text-muted">Engagement {e.engagement_id.slice(0, 8)}…</p>}
              </div>
              <p className="text-xs text-muted flex-none whitespace-nowrap">
                {new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
