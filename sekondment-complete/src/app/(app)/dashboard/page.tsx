import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { formatMoney } from '@/lib/currency';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts')
    .select('account_type, full_name')
    .eq('id', user.id)
    .single();

  if (!account) redirect('/sign-in');
  if (account.account_type === 'employer_partner') redirect('/partner');
  if (account.account_type === 'admin') redirect('/admin/disputes');
  const isBusiness = account.account_type === 'business';

  // Gate: no profile row yet -> send to onboarding.
  const table = isBusiness ? 'business_profiles' : 'expert_profiles';
  const { data: profile } = await supabase
    .from(table)
    .select('id, trust_score, ' + (isBusiness ? 'company_name' : 'name'))
    .eq('account_id', user.id)
    .maybeSingle();

  if (!profile) redirect('/onboarding');

  const displayName = isBusiness
    ? (profile as { company_name: string }).company_name
    : (profile as { name: string }).name;

  const profileId = (profile as { id: string }).id;

  // Live counts for the dashboard tiles.
  let tiles;
  if (isBusiness) {
    const [{ count: openOpps }, { count: activeEng }] = await Promise.all([
      supabase.from('opportunities').select('id', { count: 'exact', head: true })
        .eq('business_id', profileId).eq('status', 'open'),
      supabase.from('engagements').select('id', { count: 'exact', head: true })
        .eq('business_id', profileId).eq('status', 'active'),
    ]);
    tiles = [
      { label: 'Open Opportunities', value: String(openOpps ?? 0), href: '/opportunities' },
      { label: 'Active Engagements', value: String(activeEng ?? 0), href: '/engagements' },
      { label: 'Find Experts', value: '→', href: '/experts' },
    ];
  } else {
    // Earnings: sum of released transfers to this expert across their engagements.
    const { data: engs } = await supabase
      .from('engagements').select('id').eq('expert_id', profileId);
    const engIds = (engs ?? []).map((e) => e.id);
    let earnings = 0;
    let activeCount = 0;
    if (engIds.length > 0) {
      const [{ data: ledger }, { count: active }] = await Promise.all([
        supabase.from('ledger_entries').select('amount, entry_type')
          .in('engagement_id', engIds).eq('entry_type', 'transfer_expert'),
        supabase.from('engagements').select('id', { count: 'exact', head: true })
          .eq('expert_id', profileId).eq('status', 'active'),
      ]);
      earnings = (ledger ?? []).reduce((a, l) => a + Number(l.amount), 0);
      activeCount = active ?? 0;
    }
    tiles = [
      { label: 'Open Opportunities', value: '→', href: '/opportunities' },
      { label: 'Active Engagements', value: String(activeCount), href: '/engagements' },
      { label: 'Earnings', value: formatMoney(Math.round(earnings)), href: '/engagements' },
    ];
  }

  return (
    <AppShell accountType={account.account_type}>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-muted text-sm mb-1">Welcome back</p>
          <h1 className="font-serif text-4xl tracking-tight">{displayName}</h1>
        </div>
        {isBusiness ? (
          <Link href="/opportunities/new" className="btn btn-primary">+ Create Opportunity</Link>
        ) : (
          <Link href="/opportunities" className="btn btn-primary">Browse Opportunities</Link>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card">
            <p className="text-muted text-sm mb-2">{t.label}</p>
            <p className="font-serif text-3xl">{t.value}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-[var(--line)] rounded-xl2 p-8 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif text-xl">Trust Score</h2>
          <span className="font-serif text-2xl">{(profile as { trust_score: number }).trust_score}/100</span>
        </div>
        <div className="h-2 rounded-full bg-paper-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-moss to-sand rounded-full"
            style={{ width: `${(profile as { trust_score: number }).trust_score}%` }} />
        </div>
        <p className="text-muted text-sm mt-3">
          Complete verification and finish engagements to raise your score.
        </p>
      </div>
    </AppShell>
  );
}
