import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';

/* Workforce Capacity — listed capacity, bookings, utilisation, by work mode.
   Visible to owner / director / marketplace_manager / operations_manager. */
export default async function CapacityDashboard() {
  await requirePlatform('capacity');
  const svc = createServiceClient();

  const [{ data: profiles }, { data: bookings }] = await Promise.all([
    svc.from('capacity_profiles').select('available_hours_per_week, work_mode, visibility, approval_status, day_rate'),
    svc.from('capacity_bookings').select('hours_booked, status'),
  ]);

  const profs = profiles ?? [];
  const books = bookings ?? [];

  const listed = profs.filter((p) => p.visibility === 'public').length;
  const pendingApproval = profs.filter((p) => p.approval_status === 'pending').length;
  const hoursAvailable = profs.reduce((a, p) => a + Number(p.available_hours_per_week ?? 0), 0);
  const hoursBooked = books.filter((b) => b.status !== 'cancelled').reduce((a, b) => a + Number(b.hours_booked ?? 0), 0);
  const utilisation = hoursAvailable ? Math.round((hoursBooked / (hoursAvailable + hoursBooked)) * 100) : 0;

  // By work mode.
  const modes = new Map<string, number>();
  for (const p of profs) { const m = (p.work_mode || 'unspecified') as string; modes.set(m, (modes.get(m) ?? 0) + 1); }
  const modeRows = [...modes.entries()].map(([name, n]) => ({ name, n }));
  const maxMode = Math.max(1, ...modeRows.map((m) => m.n));

  return (
    <PlatformShell active="capacity">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Workforce capacity</h1>
      <p className="text-muted mb-6">Is employer capacity being listed and booked — the Company Resource engine.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="Capacity listed" value={listed} big />
        <Metric label="Utilisation" value={`${utilisation}%`} big />
        <Metric label="Hours available / wk" value={hoursAvailable} />
        <Metric label="Hours booked" value={hoursBooked} />
        <Metric label="Pending approval" value={pendingApproval} tone={pendingApproval > 0 ? 'warn' : undefined} />
        <Metric label="Total bookings" value={books.length} />
        <Metric label="Profiles total" value={profs.length} />
        <Metric label="Active bookings" value={books.filter((b) => b.status === 'active').length} />
      </div>

      <div className="card">
        <h2 className="font-serif text-xl mb-1">Capacity by work mode</h2>
        <p className="text-muted text-sm mb-4">remote / hybrid / on-site distribution</p>
        {modeRows.length === 0 ? <p className="text-muted text-sm">No capacity profiles yet.</p> : (
          <div className="space-y-2.5">
            {modeRows.map((m) => (
              <div key={m.name}>
                <div className="flex justify-between text-sm mb-1 capitalize"><span>{m.name}</span><span className="text-muted">{m.n}</span></div>
                <div className="h-2.5 rounded bg-paper-2"><div className="h-full rounded" style={{ width: `${(m.n / maxMode) * 100}%`, background: 'var(--c-blue)' }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}

function Metric({ label, value, big, tone }: { label: string; value: number | string; big?: boolean; tone?: 'warn' }) {
  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`font-serif ${big ? 'text-3xl' : 'text-2xl'} ${tone === 'warn' ? 'text-[#a14b3d]' : ''}`}>{value}</p>
    </div>
  );
}
