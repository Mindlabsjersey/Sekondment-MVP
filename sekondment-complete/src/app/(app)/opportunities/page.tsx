import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import type { Opportunity } from '@/lib/types/database';
import { industryKey, industryLabel } from '@/lib/industry';
import { formatMoney } from '@/lib/currency';
import SaveOpportunityButton from './SaveOpportunityButton';

export default async function OpportunitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/browse/opportunities');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (!account) redirect('/sign-in');

  const isB = account.account_type === 'business';

  // Businesses see their own; experts see all open ones.
  let query = supabase.from('opportunities')
    .select(`*, business_profiles(company_name)`)
    .order('created_at', { ascending: false });

  if (isB) {
    const { data: biz } = await supabase
      .from('business_profiles').select('id').eq('account_id', user.id).single();
    if (biz) query = query.eq('business_id', biz.id);
  } else {
    query = query.eq('status', 'open');
  }

  const { data: opps } = await query;

  // For experts, load which opportunities they've saved (for the ☆ state).
  const savedOppIds = new Set<string>();
  if (!isB) {
    const { data: expert } = await supabase.from('expert_profiles').select('id').eq('account_id', user.id).single();
    if (expert) {
      const { data: rows } = await supabase.from('saved_opportunities').select('opportunity_id').eq('expert_id', expert.id);
      (rows ?? []).forEach((r: any) => savedOppIds.add(r.opportunity_id));
    }
  }

  return (
    <AppShell accountType={account.account_type}>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">
            {isB ? 'Your opportunities' : 'Open opportunities'}
          </h1>
          <p className="text-muted mt-1">
            {isB ? 'Manage and track your posted opportunities.' : 'Find work that matches your expertise.'}
          </p>
        </div>
        {isB && (
          <Link href="/opportunities/new" className="btn btn-primary">+ Create Opportunity</Link>
        )}
      </div>

      {opps && opps.length > 0 ? (
        <div className="grid gap-4">
          {opps.map((o: Opportunity & { business_profiles?: { company_name: string } }) => {
            const indKey = industryKey(o.industry ?? o.required_expertise);
            const indName = industryLabel(o.industry ?? o.required_expertise);
            return (
            <Link key={o.id} href={`/opportunities/${o.id}`} data-industry={indKey}
              className="card block hover:no-underline group"
              style={{ borderLeft: '4px solid var(--c-industry, var(--c-blue))' }}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {indName && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ color: 'var(--c-industry, var(--c-blue))', background: 'var(--c-industry-tint, var(--c-surface2))' }}>
                        {indName}
                      </span>
                    )}
                    {o.desired_outcome && (
                      <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                        {o.desired_outcome.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-xl mt-1 mb-2 group-hover:text-moss transition-colors flex items-center gap-2 flex-wrap">
                    {o.title}
                    {o.visibility === 'private' && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-ink/8 text-muted inline-flex items-center gap-1">
                        🔒 Private
                      </span>
                    )}
                  </h2>
                  {o.required_expertise.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {o.required_expertise.slice(0, 4).map((e: string) => (
                        <span key={e} className="text-xs px-2.5 py-1 rounded-md bg-paper-2 font-medium">{e}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right flex-none">
                  {(o.budget_min || o.budget_max) && (
                    <div className="font-semibold text-sm">
                      {o.budget_min && formatMoney(o.budget_min, o.currency)}
                      {o.budget_min && o.budget_max && '–'}
                      {o.budget_max && formatMoney(o.budget_max, o.currency)}
                    </div>
                  )}
                  <div className="text-xs text-muted mt-1 capitalize">
                    {o.work_mode?.replace('_', '-')} · {o.rate_type}
                  </div>
                  <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded-md
                    ${o.status === 'open' ? 'text-moss bg-moss/10' :
                      o.status === 'in_engagement' ? 'text-[#b8862f] bg-[#b8862f]/12' : 'text-muted bg-muted/10'}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                  {!isB && (
                    <div className="flex justify-end mt-2">
                      <SaveOpportunityButton opportunityId={o.id} initialSaved={savedOppIds.has(o.id)} />
                    </div>
                  )}
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-14 text-muted">
          <p className="font-serif text-xl text-ink mb-2">
            {isB ? 'No opportunities yet' : 'No open opportunities right now'}
          </p>
          <p className="text-sm mb-5">
            {isB ? 'Create your first opportunity to start finding expertise.' : 'Check back soon — new opportunities are posted regularly.'}
          </p>
          {isB && <Link href="/opportunities/new" className="btn btn-primary">Create Opportunity</Link>}
        </div>
      )}
    </AppShell>
  );
}
