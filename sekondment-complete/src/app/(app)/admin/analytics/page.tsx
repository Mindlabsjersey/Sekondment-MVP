import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'admin') redirect('/dashboard');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  // ── Core counts ──────────────────────────────────────────────────────────
  const [
    { count: totalUsers },
    { count: newUsers30d },
    { count: totalExperts },
    { count: totalBusinesses },
    { count: openOpps },
    { count: totalEngagements },
    { count: activeEngagements },
    { count: completedEngagements },
    { count: openDisputes },
    { count: totalDisputes },
  ] = await Promise.all([
    supabase.from('accounts').select('id', { count: 'exact', head: true }),
    supabase.from('accounts').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('expert_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('business_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('engagements').select('id', { count: 'exact', head: true }),
    supabase.from('engagements').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('engagements').select('id', { count: 'exact', head: true }).eq('status', 'complete'),
    supabase.from('disputes').select('id', { count: 'exact', head: true }).in('status', ['open', 'under_review']),
    supabase.from('disputes').select('id', { count: 'exact', head: true }),
  ]);

  // ── Revenue: sum all released transfers ──────────────────────────────────
  const { data: ledger } = await supabase
    .from('ledger_entries')
    .select('amount, entry_type');

  const gmv = (ledger ?? []).filter(l => l.entry_type === 'fund')
    .reduce((a, l) => a + Number(l.amount), 0);
  const revenue = (ledger ?? []).filter(l => l.entry_type === 'fee')
    .reduce((a, l) => a + Number(l.amount), 0);
  const released = (ledger ?? []).filter(l => ['transfer_business', 'transfer_expert'].includes(l.entry_type))
    .reduce((a, l) => a + Number(l.amount), 0);

  // ── Previous 30d for trend arrows ────────────────────────────────────────
  const { count: prevUsers } = await supabase
    .from('accounts').select('id', { count: 'exact', head: true })
    .gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo);

  const trend = (curr: number, prev: number) => {
    if (!prev) return null;
    const pct = Math.round(((curr - prev) / prev) * 100);
    return { pct, up: pct >= 0 };
  };

  const userTrend = trend(newUsers30d ?? 0, prevUsers ?? 0);
  const disputeRate = totalEngagements ? Math.round(((totalDisputes ?? 0) / totalEngagements) * 100) : 0;

  // ── Recent signups ────────────────────────────────────────────────────────
  const { data: recentUsers } = await supabase
    .from('accounts')
    .select('id, full_name, email, account_type, created_at')
    .order('created_at', { ascending: false })
    .limit(8);

  // ── Recent engagements ────────────────────────────────────────────────────
  const { data: recentEngs } = await supabase
    .from('engagements')
    .select('id, title, status, total_amount, currency, created_at')
    .order('created_at', { ascending: false })
    .limit(6);

  const ROLE_LABEL: Record<string, string> = {
    business: 'Business', expert: 'Expert',
    employer_partner: 'Employer', admin: 'Admin',
  };
  const ENG_STATUS: Record<string, { l: string; c: string }> = {
    active: { l: 'Active', c: 'text-[#b8862f] bg-[#b8862f]/12' },
    complete: { l: 'Complete', c: 'text-moss bg-moss/10' },
    disputed: { l: 'Disputed', c: 'text-[#a14b3d] bg-[#a14b3d]/10' },
    cancelled: { l: 'Cancelled', c: 'text-muted bg-muted/10' },
  };

  return (
    <AppShell accountType="admin">
      <h1 className="font-serif text-4xl tracking-tight mb-1">Analytics</h1>
      <p className="text-muted mb-8">Platform health and revenue at a glance.</p>

      {/* Revenue strip */}
      <div className="text-[#f2f4f8] rounded-xl2 p-6 mb-6 relative overflow-hidden" style={{ background: 'var(--c-blue-deep)' }}>
        <div className="absolute right-[-50px] top-[-50px] w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(200,162,74,.25),transparent 70%)' }} />
        <p className="text-xs font-semibold tracking-wider uppercase text-[rgba(242,244,248,.55)] mb-4">Revenue overview (all time)</p>
        <div className="grid grid-cols-3 gap-6 relative">
          <RevStat label="Gross Marketplace Value" value={`£${Math.round(gmv).toLocaleString()}`} />
          <RevStat label="Platform Revenue (15%)" value={`£${Math.round(revenue).toLocaleString()}`} gold />
          <RevStat label="Paid out to experts" value={`£${Math.round(released).toLocaleString()}`} />
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI label="Total users" value={totalUsers ?? 0}
          sub={`+${newUsers30d ?? 0} this month`}
          trend={userTrend} />
        <KPI label="Experts / Businesses" value={`${totalExperts ?? 0} / ${totalBusinesses ?? 0}`}
          sub="registered profiles" />
        <KPI label="Open opportunities" value={openOpps ?? 0}
          sub="currently live" />
        <KPI label="Dispute rate" value={`${disputeRate}%`}
          sub={`${openDisputes ?? 0} open, ${totalDisputes ?? 0} total`}
          warn={(disputeRate ?? 0) > 5} />
      </div>

      {/* Engagement breakdown */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <EngTile label="Active" value={activeEngagements ?? 0} color="text-[#b8862f]" />
        <EngTile label="Completed" value={completedEngagements ?? 0} color="text-moss" />
        <EngTile label="Total ever" value={totalEngagements ?? 0} color="text-muted" />
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="font-serif text-xl mb-3">Recent signups</h2>
          <div className="grid gap-2.5">
            {(recentUsers ?? []).map((u: any) => (
              <div key={u.id} className="bg-surface border border-[var(--line)] rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-moss to-moss-2 text-white flex items-center justify-center font-serif font-semibold text-sm flex-none">
                  {(u.full_name || u.email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted">{ROLE_LABEL[u.account_type] ?? u.account_type}</p>
                </div>
                <p className="text-xs text-muted flex-none">
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-serif text-xl mb-3">Recent engagements</h2>
          <div className="grid gap-2.5">
            {(recentEngs ?? []).map((e: any) => {
              const sm = ENG_STATUS[e.status] ?? ENG_STATUS.active;
              return (
                <div key={e.id} className="bg-surface border border-[var(--line)] rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{e.title}</p>
                    <p className="text-xs text-muted">£{Number(e.total_amount).toLocaleString()}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sm.c} flex-none`}>{sm.l}</span>
                </div>
              );
            })}
            {(!recentEngs || recentEngs.length === 0) && (
              <div className="bg-surface border border-[var(--line)] rounded-xl px-4 py-6 text-center text-muted text-sm">
                No engagements yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function RevStat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[rgba(242,244,248,.5)] mb-1">{label}</p>
      <p className={`font-serif font-semibold text-2xl tracking-tight ${gold ? 'text-sand' : 'text-[#f2f4f8]'}`}>{value}</p>
    </div>
  );
}

function KPI({ label, value, sub, trend, warn }: { label: string; value: string | number; sub: string; trend?: { pct: number; up: boolean } | null; warn?: boolean }) {
  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl p-5">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`font-serif font-semibold text-3xl tracking-tight mb-0.5 ${warn ? 'text-[#a14b3d]' : 'text-ink'}`}>{value}</p>
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted">{sub}</p>
        {trend && (
          <span className={`text-xs font-semibold ${trend.up ? 'text-moss' : 'text-[#a14b3d]'}`}>
            {trend.up ? '↑' : '↓'}{Math.abs(trend.pct)}%
          </span>
        )}
      </div>
    </div>
  );
}

function EngTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl p-5 text-center">
      <p className={`font-serif font-semibold text-4xl tracking-tight ${color}`}>{value}</p>
      <p className="text-sm text-muted mt-1">{label}</p>
    </div>
  );
}
