import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';
import { CommissionForm } from './CommissionForm';

/* Commission settings — owner sets site-wide default + per-company overrides.
   Visible to owner / director / finance_manager (but only owner can save). */
export default async function CommissionDashboard() {
  const role = await requirePlatform('revenue'); // finance-visible module
  const svc = createServiceClient();

  const { data: settings } = await svc.from('platform_settings').select('default_fee_pct, updated_at').eq('id', 1).maybeSingle();
  const { data: companies } = await svc
    .from('business_profiles')
    .select('id, company_name, fee_pct_override')
    .order('company_name');

  const siteFee = Number(settings?.default_fee_pct ?? 15);
  const isOwner = role === 'platform_owner';

  return (
    <PlatformShell active="revenue">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Commission</h1>
      <p className="text-muted mb-6">The platform fee taken from each milestone. Default applies site-wide; you can override it per company. Rates lock onto each engagement when it starts, so changing them never affects deals already in flight.</p>

      <CommissionForm
        siteFee={siteFee}
        isOwner={isOwner}
        companies={(companies ?? []).map((c) => ({ id: c.id, name: c.company_name as string, override: c.fee_pct_override != null ? Number(c.fee_pct_override) : null }))}
      />

      <div className="card mt-6">
        <h2 className="font-serif text-lg mb-2">How the fee works</h2>
        <p className="text-sm text-muted mb-2">For every milestone released:</p>
        <ol className="text-sm space-y-1 list-decimal pl-5 text-muted">
          <li>The platform fee (this %) is taken off the top — that's platform revenue.</li>
          <li>The remainder goes to the expert; or, for a Company Resource, splits between the employer (bulk) and the individual (bonus).</li>
        </ol>
        <p className="text-sm text-muted mt-2">The fee is <strong className="text-ink">not</strong> split with anyone — it's purely your commission. The worker/employer split happens inside the remainder.</p>
      </div>
    </PlatformShell>
  );
}
