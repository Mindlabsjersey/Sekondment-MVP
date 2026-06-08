import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import ExpertFilters from './ExpertFilters';
import { CATEGORY_LABELS } from '@/lib/types/database';
import type { ExpertCategory } from '@/lib/types/database';
import { industryKey, industryLabel } from '@/lib/industry';
import SaveExpertButton from './SaveExpertButton';
import { formatMoney } from '@/lib/currency';

const AVAIL_LABELS: Record<string, string> = {
  available_now: 'Available now',
  available_from: 'Available soon',
  fractional_only: 'Fractional only',
  advisory_only: 'Advisory only',
  project_only: 'Project only',
};

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/browse/experts');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (!account) redirect('/sign-in');

  // For businesses, load which experts they've already saved (for the ☆ state).
  const savedIds = new Set<string>();
  if (account.account_type === 'business') {
    const { data: biz } = await supabase.from('business_profiles').select('id').eq('account_id', user.id).single();
    if (biz) {
      const { data: rows } = await supabase.from('saved_experts').select('expert_id').eq('business_id', biz.id);
      (rows ?? []).forEach((r: any) => savedIds.add(r.expert_id));
    }
  }
  const isBusiness = account.account_type === 'business';

  // ── Build the query from search params ──────────────────────────────────
  let query = supabase
    .from('expert_profiles')
    .select(`
      id, name, headline, photo_url, skills, expertise_areas, categories, industries,
      hourly_rate, daily_rate, trust_score, verification_status, remote_available, onsite_available, based_country,
      employing_business_id, employer_partner_id,
      expert_availability(availability_type, work_modes, hours_per_week),
      business_profiles(company_name),
      employer_partners(company_name)
    `)
    .eq('visibility', 'listed')
    .order('trust_score', { ascending: false });

  // Keyword search across name, headline, skills.
  const q = sp.q?.trim();
  if (q) {
    query = query.or(`name.ilike.%${q}%,headline.ilike.%${q}%`);
  }

  // Min trust score filter.
  if (sp.min_trust) {
    query = query.gte('trust_score', Number(sp.min_trust));
  }

  // Max daily rate filter.
  if (sp.max_daily) {
    query = query.lte('daily_rate', Number(sp.max_daily));
  }

  // Verified only.
  if (sp.verified === '1') {
    query = query.eq('verification_status', 'verified');
  }

  if (sp.remote === '1') {
    query = query.eq('remote_available', true);
  }

  if (sp.onsite === '1') {
    query = query.eq('onsite_available', true);
  }

  if (sp.country) {
    query = query.ilike('based_country', `%${sp.country}%`);
  }

  // Category filter (stored as array — use @> overlap).
  if (sp.category) {
    query = query.contains('categories', [sp.category as ExpertCategory]);
  }

  const { data: experts } = await query;

  // Post-filter by availability (joined 1:1, can't filter in Postgres easily via RLS layer).
  const avail = sp.avail;
  const filtered = (experts ?? []).filter((e) => {
    if (!avail) return true;
    return (e as any).expert_availability?.availability_type === avail;
  });

  return (
    <AppShell accountType={account.account_type}>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Find expertise</h1>
          <p className="text-muted mt-1">Browse verified experts, advisors and company resources.</p>
        </div>
        <span className="text-sm text-muted">{filtered.length} expert{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8 items-start">
        {/* sidebar filters — client component for interactivity */}
        <ExpertFilters current={sp} />

        {/* results */}
        <div className="grid gap-4">
          {filtered.length === 0 && (
            <div className="card text-center py-14 text-muted">
              <p className="font-serif text-xl text-ink mb-2">No experts match these filters</p>
              <p className="text-sm">Try widening your search or clearing a filter.</p>
            </div>
          )}
          {filtered.map((e: any) => {
            const avail = e.expert_availability;
            const isResource = !!e.employing_business_id || !!e.employer_partner_id;
            const companyName = e.employer_partners?.company_name ?? e.business_profiles?.company_name;
            const indKey = industryKey(e.industries);
            const indName = industryLabel(e.industries);

            return (
              <Link key={e.id} href={`/experts/${e.id}`} data-industry={indKey}
                className="bg-surface border border-[var(--line)] rounded-xl p-5 flex gap-4 items-start hover:shadow-soft hover:-translate-y-0.5 transition-all"
                style={{ borderLeft: '4px solid var(--c-industry, var(--c-blue))' }}>
                {/* avatar — industry tinted */}
                <div className="w-12 h-12 rounded-xl text-white flex items-center justify-center font-serif font-semibold text-base flex-none"
                  style={{ background: 'linear-gradient(135deg, var(--c-industry, var(--c-blue)), var(--c-industry, var(--c-blue)))' }}>
                  {e.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-semibold text-lg">{e.name}</span>
                    {e.verification_status === 'verified' && (
                      <span className="badge-verified text-[10px]">✓ VERIFIED</span>
                    )}
                    {isResource && companyName && (
                      <span className="text-xs font-semibold text-sand">via {companyName}</span>
                    )}
                  </div>
                  {e.headline && <p className="text-muted text-sm mt-0.5 mb-2">{e.headline}</p>}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {indName && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md"
                        style={{ color: 'var(--c-industry, var(--c-blue))', background: 'var(--c-industry-tint, var(--c-surface2))' }}>
                        {indName}
                      </span>
                    )}
                    {(e.skills as string[]).slice(0, 3).map((s) => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-md bg-paper-2 font-medium">{s}</span>
                    ))}
                    {(e.skills as string[]).length > 3 && (
                      <span className="text-xs px-2.5 py-1 rounded-md bg-paper-2 text-muted">
                        +{(e.skills as string[]).length - 3} more
                      </span>
                    )}
                  </div>
                  {e.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(e.categories as ExpertCategory[]).slice(0, 3).map((c) => (
                        <span key={c} className="text-xs text-moss font-medium">{CATEGORY_LABELS[c]}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right flex-none space-y-1">
                  {isBusiness && (
                    <div className="flex justify-end mb-1">
                      <SaveExpertButton expertId={e.id} initialSaved={savedIds.has(e.id)} />
                    </div>
                  )}
                  {/* trust score */}
                  <div>
                    <span className="font-serif font-semibold text-lg">{e.trust_score}</span>
                    <span className="text-xs text-muted block">Trust</span>
                  </div>
                  {/* rate */}
                  {e.daily_rate && (
                    <div className="text-sm font-semibold">
                      {formatMoney(Number(e.daily_rate))}
                      <span className="text-xs text-muted font-normal">/day</span>
                    </div>
                  )}
                  {/* availability */}
                  {avail && (
                    <div className={`text-xs font-medium ${
                      avail.availability_type === 'available_now' ? 'text-moss' : 'text-muted'
                    }`}>
                      {AVAIL_LABELS[avail.availability_type] ?? avail.availability_type}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
