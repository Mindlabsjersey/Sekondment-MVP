import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';
import { formatMoney } from '@/lib/currency';

export default async function ExecutiveDashboard() {
  await requirePlatform('executive');
  const svc = createServiceClient();

  // Counts (head:true count queries are cheap).
  const count = async (table: string, filter?: (q: any) => any) => {
    let q = svc.from(table).select('id', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count: c } = await q;
    return c ?? 0;
  };

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);

  const [
    totalUsers, businesses, experts, partners,
    newToday, newMonth, verifiedUsers,
    totalOpps, activeOpps, activeEngagements, completedEngagements,
    openDisputes, verifBacklog, activeExperts, capacityListings,
  ] = await Promise.all([
    count('accounts'),
    count('accounts', (q) => q.eq('account_type', 'business')),
    count('accounts', (q) => q.eq('account_type', 'expert')),
    count('accounts', (q) => q.eq('account_type', 'employer_partner')),
    count('accounts', (q) => q.gte('created_at', dayStart.toISOString())),
    count('accounts', (q) => q.gte('created_at', monthStart.toISOString())),
    count('expert_profiles', (q) => q.eq('verification_status', 'verified')),
    count('opportunities'),
    count('opportunities', (q) => q.eq('status', 'open')),
    count('engagements', (q) => q.eq('status', 'active')),
    count('engagements', (q) => q.eq('status', 'completed')),
    count('disputes', (q) => q.in('status', ['open', 'under_review'])),
    count('verification_documents', (q) => q.eq('status', 'submitted')),
    count('expert_profiles', (q) => q.eq('visibility', 'listed')),
    count('capacity_profiles', (q) => q.eq('visibility', 'public')),
  ]);

  // GMV + revenue from the ledger.
  const { data: ledger } = await svc.from('ledger_entries').select('entry_type, amount, currency');
  let gmv = 0, revenue = 0;
  for (const l of ledger ?? []) {
    if (l.entry_type === 'fund') gmv += Number(l.amount);
    if (l.entry_type === 'fee') revenue += Number(l.amount);
  }

  // ── Marketplace Liquidity Score (starts simple; tune over time) ───────────
  // Balance of supply (experts + capacity) vs demand (open opps), plus activity.
  const supply = activeExperts + capacityListings;
  const demand = activeOpps;
  const balance = supply + demand === 0 ? 0 : 1 - Math.abs(supply - demand) / (supply + demand);
  const activityFactor = Math.min(1, (activeEngagements + completedEngagements) / 20);
  const supplyFactor = Math.min(1, supply / 20);
  const demandFactor = Math.min(1, demand / 20);
  const liquidity = Math.round((balance * 0.4 + activityFactor * 0.3 + supplyFactor * 0.15 + demandFactor * 0.15) * 100);

  const diagnosis =
    supply < 5 ? 'Need more experts / capacity'
    : demand < 5 ? 'Need more business demand'
    : balance < 0.4 ? (supply > demand ? 'Oversupplied — drive demand' : 'Undersupplied — recruit experts')
    : activityFactor < 0.3 ? 'Supply & demand exist — improve matching/conversion'
    : 'Healthy marketplace';

  const riskStatus = openDisputes > 5 || verifBacklog > 10 ? 'Elevated' : openDisputes > 0 || verifBacklog > 0 ? 'Watch' : 'Low';

  return (
    <PlatformShell active="executive">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Executive overview</h1>
      <p className="text-muted mb-8">Real-time platform health, growth, monetisation and liquidity.</p>

      {/* Liquidity score — headline */}
      <div className="card mb-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-none text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center font-serif text-3xl font-semibold text-white"
            style={{ background: liquidity >= 70 ? 'var(--c-blue)' : liquidity >= 40 ? 'var(--c-gold)' : '#a14b3d' }}>
            {liquidity}
          </div>
          <p className="text-xs text-muted mt-2">Liquidity / 100</p>
        </div>
        <div className="flex-1">
          <h2 className="font-serif text-xl mb-1">Marketplace Liquidity Score</h2>
          <p className="text-muted text-sm mb-2">Diagnosis: <span className="text-ink font-medium">{diagnosis}</span></p>
          <p className="text-sm">Supply {supply} · Demand {demand} · Active engagements {activeEngagements} · Platform risk <span className={riskStatus === 'Low' ? 'text-moss' : riskStatus === 'Watch' ? 'text-[#b8862f]' : 'text-[#a14b3d]'}>{riskStatus}</span></p>
        </div>
      </div>

      {/* Money */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Metric big label="Total GMV" value={formatMoney(gmv, 'GBP')} />
        <Metric big label="Platform revenue" value={formatMoney(revenue, 'GBP')} />
      </div>

      {/* Grid of metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Total users" value={totalUsers} />
        <Metric label="Businesses" value={businesses} />
        <Metric label="Experts" value={experts} />
        <Metric label="Employer partners" value={partners} />
        <Metric label="New today" value={newToday} />
        <Metric label="New this month" value={newMonth} />
        <Metric label="Verified experts" value={verifiedUsers} />
        <Metric label="Listed experts" value={activeExperts} />
        <Metric label="Total opportunities" value={totalOpps} />
        <Metric label="Active opportunities" value={activeOpps} />
        <Metric label="Active engagements" value={activeEngagements} />
        <Metric label="Completed engagements" value={completedEngagements} />
        <Metric label="Public capacity" value={capacityListings} />
        <Metric label="Open disputes" value={openDisputes} tone={openDisputes > 0 ? 'warn' : undefined} />
        <Metric label="Verification backlog" value={verifBacklog} tone={verifBacklog > 0 ? 'warn' : undefined} />
        <Metric label="Platform risk" value={riskStatus} tone={riskStatus !== 'Low' ? 'warn' : undefined} />
      </div>
    </PlatformShell>
  );
}

function Metric({ label, value, big, tone }: { label: string; value: string | number; big?: boolean; tone?: 'warn' }) {
  return (
    <div className={`bg-surface border border-[var(--line)] rounded-xl p-4 ${big ? 'sm:p-5' : ''}`}>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`font-serif ${big ? 'text-3xl' : 'text-2xl'} ${tone === 'warn' ? 'text-[#a14b3d]' : ''}`}>{value}</p>
    </div>
  );
}
