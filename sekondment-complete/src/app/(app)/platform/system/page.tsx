import PlatformShell, { requirePlatform } from '@/components/PlatformShell';
import { createServiceClient } from '@/lib/supabase/server';

/* System health — environment + integration status. Checks what's configured
   without exposing secrets. Visible to owner / director. */
export default async function SystemHealth() {
  await requirePlatform('system');

  // A live DB check: can we read a table?
  let dbOk = false;
  try {
    const svc = createServiceClient();
    const { error } = await svc.from('platform_settings').select('id', { head: true, count: 'exact' });
    dbOk = !error;
  } catch { dbOk = false; }

  // Integration config presence (booleans only — never expose values).
  const checks = [
    { name: 'Database (Supabase)', ok: dbOk, note: dbOk ? 'Connected' : 'Unreachable' },
    { name: 'Supabase URL', ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL, note: 'env configured' },
    { name: 'Service role key', ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY, note: 'env configured' },
    { name: 'Stripe (payments)', ok: !!process.env.STRIPE_SECRET_KEY, note: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured (optional)' },
    { name: 'Stripe webhook', ok: !!process.env.STRIPE_WEBHOOK_SECRET, note: process.env.STRIPE_WEBHOOK_SECRET ? 'configured' : 'not configured (optional)' },
    { name: 'Email (Resend)', ok: !!process.env.RESEND_API_KEY, note: process.env.RESEND_API_KEY ? 'configured' : 'no-op without key' },
    { name: 'Site URL', ok: !!process.env.NEXT_PUBLIC_SITE_URL, note: process.env.NEXT_PUBLIC_SITE_URL ? 'set' : 'using default' },
  ];

  return (
    <PlatformShell active="system">
      <h1 className="font-serif text-3xl tracking-tight mb-1">System health</h1>
      <p className="text-muted mb-6">Environment and integration status. Optional integrations (Stripe, email) won't block the app.</p>

      <div className="card">
        <div className="divide-y divide-[var(--line)]">
          {checks.map((c) => (
            <div key={c.name} className="flex items-center justify-between py-3 text-sm">
              <span className="font-medium">{c.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">{c.note}</span>
                <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: c.ok ? '#2f8f6b' : '#c9ad6a' }} title={c.ok ? 'OK' : 'Not configured'} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted mt-4">Green = configured/reachable. Amber = optional/not set (not an error). Secrets are never displayed — only presence is checked.</p>
    </PlatformShell>
  );
}
