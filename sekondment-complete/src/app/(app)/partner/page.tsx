import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import EmployeeRow from './employees/EmployeeRow';
import CapacityManager from './CapacityManager';
import InviteEmployee from './employees/InviteEmployee';
import { formatMoney } from '@/lib/currency';

export default async function PartnerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'employer_partner') redirect('/dashboard');

  // No profile yet -> onboarding.
  const { data: partner } = await supabase
    .from('employer_partners')
    .select('id, company_name, default_commission_pct')
    .eq('account_id', user.id)
    .maybeSingle();
  if (!partner) redirect('/onboarding');

  // Employees + their expert profile + completed engagement earnings.
  const { data: employees } = await supabase
    .from('employer_employees')
    .select(`
      id, approval_status, commission_pct, invited_at, approved_at,
      expert_profiles(id, name, headline, skills, trust_score)
    `)
    .eq('employer_id', partner.id)
    .order('invited_at', { ascending: false });

  const rows = employees ?? [];
  const pending = rows.filter((e) => e.approval_status === 'pending');
  const approved = rows.filter((e) => e.approval_status === 'approved');

  // Earnings: sum released ledger transfers routed to this partner's engagements.
  const expertIds = rows.map((e) => (e.expert_profiles as any)?.id).filter(Boolean);
  let totalDeployments = 0;
  let commissionEarned = 0;
  if (expertIds.length > 0) {
    const { data: engs } = await supabase
      .from('engagements')
      .select('id, payee_type, expert_id, status')
      .in('expert_id', expertIds)
      .eq('payee_type', 'employer_partner');
    totalDeployments = engs?.length ?? 0;
    // Commission earned = sum of transfer_business ledger entries on those engagements.
    if (engs && engs.length > 0) {
      const { data: ledger } = await supabase
        .from('ledger_entries')
        .select('amount, entry_type, engagement_id')
        .in('engagement_id', engs.map((e) => e.id))
        .eq('entry_type', 'transfer_business');
      commissionEarned = (ledger ?? []).reduce((a, l) => a + Number(l.amount), 0);
    }
  }

  // Capacity listings owned by this partner.
  const { data: capacityListings } = await supabase
    .from('capacity_profiles')
    .select('id, title, available_hours_per_week, work_mode, day_rate, visibility, approval_status')
    .eq('employer_partner_id', partner.id)
    .order('created_at', { ascending: false });

  return (
    <AppShell accountType="employer_partner">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <p className="text-muted text-sm mb-1">Partner dashboard</p>
          <h1 className="font-serif text-4xl tracking-tight">{partner.company_name}</h1>
        </div>
        <InviteEmployee defaultCommission={Number(partner.default_commission_pct)} />
      </div>

      {/* stat tiles */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <Tile label="Active employees" value={String(approved.length)} sub={`${rows.length} registered`} />
        <Tile label="Deployments" value={String(totalDeployments)} sub="all time" />
        <Tile label="Pending approval" value={String(pending.length)} sub="needs action" />
        <Tile label="Commission earned" value={formatMoney(Math.round(commissionEarned))} sub="routed to you" accent />
      </div>

      {/* approval queue callout */}
      {pending.length > 0 && (
        <div className="bg-[#b8862f]/8 border border-[#b8862f]/30 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-[#b8862f]/15 text-[#b8862f] font-bold flex items-center justify-center flex-none">
            {pending.length}
          </span>
          <span className="text-sm">
            <strong>{pending.length} employee{pending.length > 1 ? 's' : ''}</strong> awaiting approval before they can be deployed.
          </span>
        </div>
      )}

      {/* employees */}
      {rows.length === 0 ? (
        <div className="card text-center py-14 text-muted">
          <p className="font-serif text-xl text-ink mb-2">No employees registered yet</p>
          <p className="text-sm">Invite an employee (by their expert account email) to deploy them through Sekondment.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((e) => (
            <EmployeeRow
              key={e.id}
              link={{
                id: e.id,
                approval_status: e.approval_status,
                commission_pct: e.commission_pct,
                defaultCommission: Number(partner.default_commission_pct),
              }}
              expert={e.expert_profiles as any}
            />
          ))}
        </div>
      )}

      <CapacityManager listings={capacityListings} />

      {/* commission explainer */}
      <div className="mt-7 bg-[#1e3a8a] text-[#f6f3ec] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute right-[-40px] top-[-40px] w-40 h-40 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(201,168,106,.25),transparent 70%)' }} />
        <h3 className="font-serif font-semibold text-lg mb-2 relative">How your commission works</h3>
        <p className="text-sm leading-relaxed text-[rgba(246,243,236,.8)] max-w-2xl relative">
          When an approved employee is engaged, the client pays into escrow. Sekondment takes its 15%
          platform fee, then funds route to you as the employer. You keep your commission and pass the
          remainder to your employee — all on-platform, all tracked. Your employee stays on your payroll throughout.
        </p>
      </div>
    </AppShell>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${accent ? 'bg-moss text-white border-moss' : 'bg-white border-[var(--line)]'}`}>
      <p className={`text-xs font-medium ${accent ? 'text-[rgba(246,243,236,.7)]' : 'text-muted'}`}>{label}</p>
      <p className="font-serif font-semibold text-2xl mt-1.5 mb-0.5 tracking-tight">{value}</p>
      <p className={`text-xs ${accent ? 'text-[rgba(246,243,236,.6)]' : 'text-muted'}`}>{sub}</p>
    </div>
  );
}
