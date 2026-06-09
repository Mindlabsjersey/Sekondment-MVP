import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';

/* Internal Team — roster of platform staff + their roles, and task workload.
   Visible to owner / director. */
const ROLE_LABEL: Record<string, string> = {
  platform_owner: 'Owner', platform_director: 'Director', operations_manager: 'Operations',
  compliance_manager: 'Compliance', finance_manager: 'Finance', marketplace_manager: 'Marketplace', support_team: 'Support',
};

export default async function TeamDashboard() {
  await requirePlatform('team');
  const svc = createServiceClient();

  const [{ data: members }, { data: tasks }] = await Promise.all([
    svc.from('platform_team_members').select('role, is_active, account_id, created_at, accounts(full_name, email)'),
    svc.from('team_tasks').select('status, assigned_to'),
  ]);

  const team = members ?? [];
  const allTasks = tasks ?? [];
  const openTasks = allTasks.filter((t) => t.status !== 'done').length;
  const doneTasks = allTasks.filter((t) => t.status === 'done').length;

  return (
    <PlatformShell active="team">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Internal team</h1>
      <p className="text-muted mb-6">Who runs the platform, their roles, and workload.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="Team members" value={team.filter((t) => t.is_active).length} big />
        <Metric label="Open tasks" value={openTasks} />
        <Metric label="Completed tasks" value={doneTasks} />
        <Metric label="Roles in use" value={new Set(team.map((t) => t.role)).size} />
      </div>

      <div className="card">
        <h2 className="font-serif text-xl mb-3">Team roster</h2>
        {team.length === 0 ? (
          <p className="text-muted text-sm">No team members yet. Seed the first owner, then invite staff. (Inviting staff from the UI is a future addition.)</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {team.map((m: any, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{m.accounts?.full_name || m.accounts?.email || 'Member'}</span>
                  {!m.is_active && <span className="text-xs text-muted ml-2">(inactive)</span>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-moss/10 text-moss flex-none">{ROLE_LABEL[m.role] ?? m.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted mt-4">Inviting staff and assigning roles from the UI is a planned addition. For now, manage via the platform_team_members table.</p>
    </PlatformShell>
  );
}

function Metric({ label, value, big }: { label: string; value: number; big?: boolean }) {
  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`font-serif ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}
