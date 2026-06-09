import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';

/* Compliance dashboard — verification states, disputes, contract acceptance,
   compliance events, and an overall risk level.
   Visible to owner / director / compliance_manager / operations_manager. */
export default async function ComplianceDashboard() {
  await requirePlatform('compliance');
  const svc = createServiceClient();

  const count = async (table: string, filter?: (q: any) => any) => {
    let q = svc.from(table).select('id', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count: c } = await q;
    return c ?? 0;
  };

  const [
    verifSubmitted, verifApproved, verifRejected,
    disputesOpen, disputesResolved, suspended, complianceEvents,
    docAcceptances,
  ] = await Promise.all([
    count('verification_documents', (q: any) => q.eq('status', 'submitted')),
    count('verification_documents', (q: any) => q.eq('status', 'approved')),
    count('verification_documents', (q: any) => q.eq('status', 'rejected')),
    count('disputes', (q: any) => q.in('status', ['open', 'under_review'])),
    count('disputes', (q: any) => q.eq('status', 'resolved')),
    count('accounts', (q: any) => q.eq('status', 'suspended')),
    count('compliance_events'),
    count('document_acceptances'),
  ]);

  // Risk level heuristic.
  const risk = verifSubmitted > 10 || disputesOpen > 5 ? 'High'
    : verifSubmitted > 0 || disputesOpen > 0 ? 'Medium' : 'Low';
  const riskColor = risk === 'High' ? '#a14b3d' : risk === 'Medium' ? '#b8862f' : '#2f8f6b';

  return (
    <PlatformShell active="compliance">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Compliance</h1>
      <p className="text-muted mb-6">Platform risk and the compliance workload at a glance.</p>

      <div className="card mb-6 flex items-center gap-5">
        <div className="text-center flex-none">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-serif text-lg" style={{ background: riskColor }}>{risk}</div>
          <p className="text-xs text-muted mt-2">Risk level</p>
        </div>
        <div>
          <h2 className="font-serif text-xl mb-1">Overall compliance risk</h2>
          <p className="text-muted text-sm">Driven by verification backlog ({verifSubmitted}) and open disputes ({disputesOpen}). Clear the backlog to lower risk.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Verification pending" value={verifSubmitted} tone={verifSubmitted > 0 ? 'warn' : undefined} />
        <Metric label="Verification approved" value={verifApproved} />
        <Metric label="Verification rejected" value={verifRejected} />
        <Metric label="Open disputes" value={disputesOpen} tone={disputesOpen > 0 ? 'warn' : undefined} />
        <Metric label="Disputes resolved" value={disputesResolved} />
        <Metric label="Suspended accounts" value={suspended} tone={suspended > 0 ? 'warn' : undefined} />
        <Metric label="Compliance events" value={complianceEvents} />
        <Metric label="Document acceptances" value={docAcceptances} />
      </div>
    </PlatformShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`font-serif text-2xl ${tone === 'warn' ? 'text-[#a14b3d]' : ''}`}>{value}</p>
    </div>
  );
}
