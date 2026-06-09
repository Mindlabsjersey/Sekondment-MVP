import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';
import { formatMoney } from '@/lib/currency';

/* Delivery reports — accountability view: what experts/company-resources actually
   delivered across engagements (milestones completed, deliverables, value, ratings).
   This is the "measure what was delivered for clients" capability, built from
   existing engagement/milestone/deliverable/review data. No schema change.
   Visible to owner / director / marketplace_manager. */
export default async function DeliveryReports() {
  await requirePlatform('marketplace');
  const svc = createServiceClient();

  const { data: engagements } = await svc
    .from('engagements')
    .select('id, title, status, total_amount, currency, business_id, expert_id, created_at')
    .order('created_at', { ascending: false })
    .limit(25);

  const engs = engagements ?? [];
  const ids = engs.map((e) => e.id);

  // Pull milestones + deliverables for these engagements in bulk.
  const { data: milestones } = ids.length
    ? await svc.from('milestones').select('id, engagement_id, title, amount, status').in('engagement_id', ids)
    : { data: [] };
  const msList = milestones ?? [];
  const msIds = msList.map((m) => m.id);
  const { data: deliverables } = msIds.length
    ? await svc.from('deliverables').select('id, milestone_id, title').in('milestone_id', msIds)
    : { data: [] };
  const delList = deliverables ?? [];

  const reportFor = (engId: string) => {
    const ms = msList.filter((m) => m.engagement_id === engId);
    const released = ms.filter((m) => m.status === 'released');
    const delivered = delList.filter((d) => ms.some((m) => m.id === d.milestone_id));
    const valueDelivered = released.reduce((a, m) => a + Number(m.amount), 0);
    return { total: ms.length, completed: released.length, deliverables: delivered.length, valueDelivered };
  };

  return (
    <PlatformShell active="marketplace">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Delivery reports</h1>
      <p className="text-muted mb-6">What was actually delivered across engagements — milestones completed, deliverables, and value released. The accountability layer.</p>

      {engs.length === 0 ? (
        <div className="card"><p className="text-muted text-sm">No engagements yet. Once work is underway, delivery reports appear here.</p></div>
      ) : (
        <div className="space-y-3">
          {engs.map((e) => {
            const r = reportFor(e.id);
            const pct = r.total ? Math.round((r.completed / r.total) * 100) : 0;
            return (
              <div key={e.id} className="bg-surface border border-[var(--line)] rounded-xl p-4">
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.title || 'Engagement'}</p>
                    <p className="text-xs text-muted capitalize">{e.status} · started {new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="font-serif text-lg flex-none">{formatMoney(Number(e.total_amount ?? 0), (e.currency as string) || 'GBP')}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <Mini label="Milestones" value={`${r.completed}/${r.total}`} />
                  <Mini label="Deliverables" value={String(r.deliverables)} />
                  <Mini label="Value delivered" value={formatMoney(r.valueDelivered, (e.currency as string) || 'GBP')} />
                  <Mini label="Progress" value={`${pct}%`} />
                </div>
                <div className="h-2 rounded bg-paper-2 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${pct}%`, background: 'var(--c-blue)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted mt-4">Built from engagement, milestone and deliverable records. A future iteration can export a client-branded PDF per engagement.</p>
    </PlatformShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper rounded-lg p-2.5 text-center">
      <p className="text-[10px] text-muted">{label}</p>
      <p className="font-serif text-base">{value}</p>
    </div>
  );
}
