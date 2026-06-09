import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';

/* Audit logs — every sensitive internal action, newest first.
   Visible to owner / director / compliance_manager. */
export default async function AuditLogs() {
  await requirePlatform('audit');
  const svc = createServiceClient();

  const { data } = await svc
    .from('audit_logs')
    .select('action, actor_role, entity_type, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const logs = data ?? [];
  const label = (a: string) => a.replace(/_/g, ' ');

  return (
    <PlatformShell active="audit">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Audit logs</h1>
      <p className="text-muted mb-6">Every sensitive internal action, who did it, and when. Append-only.</p>

      {logs.length === 0 ? (
        <div className="card"><p className="text-muted text-sm">No audited actions yet. Changing commission, suspending users, or exporting data will appear here.</p></div>
      ) : (
        <div className="card">
          <div className="divide-y divide-[var(--line)]">
            {logs.map((l, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium capitalize">{label(l.action)}</span>
                  {l.entity_type && <span className="text-muted"> · {l.entity_type}</span>}
                  {l.metadata && <div className="text-xs text-muted font-mono truncate">{JSON.stringify(l.metadata)}</div>}
                </div>
                <div className="text-right flex-none">
                  {l.actor_role && <div className="text-xs px-2 py-0.5 rounded bg-moss/10 text-moss capitalize">{label(l.actor_role)}</div>}
                  <div className="text-xs text-muted mt-1">{new Date(l.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PlatformShell>
  );
}
