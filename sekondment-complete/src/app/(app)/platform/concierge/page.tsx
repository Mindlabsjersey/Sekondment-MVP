import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';

/* Concierge queue — businesses asking "find me experts". This is where the
   founder (or ops/marketplace staff) sources talent manually during the
   cold-start period. Visible to owner / director / marketplace / operations. */
export default async function ConciergeQueue() {
  await requirePlatform('marketplace');
  const svc = createServiceClient();

  const { data } = await svc
    .from('concierge_requests')
    .select('id, brief, status, target_response_by, candidate_notes, created_at, business_profiles(company_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  const reqs = data ?? [];
  const open = reqs.filter((r: any) => r.status === 'open' || r.status === 'sourcing');
  const statusColor: Record<string, string> = { open: '#a14b3d', sourcing: '#b8862f', candidates_sent: '#2f8f6b', closed: 'var(--muted)' };

  const overdue = (r: any) => r.target_response_by && new Date(r.target_response_by) < new Date() && r.status !== 'candidates_sent' && r.status !== 'closed';

  return (
    <PlatformShell active="marketplace">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Concierge queue</h1>
      <p className="text-muted mb-6">Businesses asking us to find experts for them. Source candidates and respond within the guarantee window — this is how you keep the marketplace feeling alive before it has scale.</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Metric label="Open requests" value={open.length} tone={open.length > 0 ? 'warn' : undefined} />
        <Metric label="Overdue" value={reqs.filter(overdue).length} tone={reqs.filter(overdue).length > 0 ? 'warn' : undefined} />
        <Metric label="Total" value={reqs.length} />
      </div>

      {reqs.length === 0 ? (
        <div className="card"><p className="text-muted text-sm">No concierge requests yet. When a business asks us to find talent, it appears here.</p></div>
      ) : (
        <div className="space-y-3">
          {reqs.map((r: any) => (
            <div key={r.id} className="card">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-medium">{r.business_profiles?.company_name || 'A business'}</p>
                  <p className="text-xs text-muted">Requested {new Date(r.created_at).toLocaleDateString()}{r.target_response_by && ` · respond by ${new Date(r.target_response_by).toLocaleString()}`}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded flex-none" style={{ background: (statusColor[r.status] ?? '#888') + '18', color: statusColor[r.status] ?? '#888' }}>
                  {overdue(r) ? 'OVERDUE' : r.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm">{r.brief}</p>
              {r.candidate_notes && <p className="text-xs text-muted mt-2">Notes: {r.candidate_notes}</p>}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted mt-4">Workflow: source experts (use Browse/Matching), message them or invite to the opportunity, then mark the request handled. Updating status from here is a planned addition.</p>
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
