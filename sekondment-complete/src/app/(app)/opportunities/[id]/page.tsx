import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { OUTCOME_LABELS } from '@/lib/types/database';
import ProposalForm from './ProposalForm';
import ProposalList from './ProposalList';
import RequirementsManager from './RequirementsManager';
import MatchesPanel from './MatchesPanel';
import { formatMoney } from '@/lib/currency';

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (!account) redirect('/sign-in');

  const isB = account.account_type === 'business';

  const { data: opp } = await supabase
    .from('opportunities')
    .select('*, business_profiles(company_name, trust_score)')
    .eq('id', id)
    .single();

  if (!opp) redirect('/opportunities');

  // Has this expert already submitted a proposal?
  let myProposal = null;
  if (!isB) {
    const { data: ep } = await supabase
      .from('expert_profiles').select('id').eq('account_id', user.id).single();
    if (ep) {
      const { data: p } = await supabase
        .from('proposals').select('*').eq('opportunity_id', id).eq('expert_id', ep.id).maybeSingle();
      myProposal = p;
    }
  }

  // Business: load all proposals on their opportunity.
  let proposals: any[] = [];
  if (isB) {
    const { data: p } = await supabase
      .from('proposals')
      .select('*, expert_profiles(name, headline, trust_score, photo_url, employer_partner_id, employing_business_id)')
      .eq('opportunity_id', id)
      .order('created_at', { ascending: false });
    proposals = p ?? [];
  }

  const budgetStr = opp.budget_min || opp.budget_max
    ? [opp.budget_min && formatMoney(opp.budget_min, opp.currency), opp.budget_max && formatMoney(opp.budget_max, opp.currency)].filter(Boolean).join('–')
    : null;

  // Does this business own the opportunity? (controls requirements + matches)
  let isOwner = false;
  if (isB) {
    const { data: biz } = await supabase.from('business_profiles').select('id').eq('account_id', user.id).single();
    isOwner = !!biz && biz.id === opp.business_id;
  }

  // Structured expertise requirements + (for owner) cached match recommendations.
  const { data: requirements } = await supabase
    .from('project_expertise_requirements')
    .select('expertise_id, importance, required_level, required_verification_level, expertise_taxonomy(id, name, type)')
    .eq('opportunity_id', id);

  let matches: any[] = [];
  if (isOwner) {
    const { data: m } = await supabase
      .from('match_recommendations')
      .select('profile_id, score, reasons, missing, expert_profiles:profile_id(name, headline, trust_score)')
      .eq('opportunity_id', id)
      .order('score', { ascending: false })
      .limit(20);
    matches = m ?? [];
  }

  return (
    <AppShell accountType={account.account_type}>
      <Link href="/opportunities" className="text-muted text-sm hover:text-ink transition mb-6 inline-block">
        ← Back to opportunities
      </Link>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div>
          {opp.desired_outcome && (
            <span className="text-xs font-semibold text-moss uppercase tracking-wider">
              {OUTCOME_LABELS[opp.desired_outcome as keyof typeof OUTCOME_LABELS] ?? opp.desired_outcome.replace(/_/g, ' ')}
            </span>
          )}
          <h1 className="font-serif text-4xl tracking-tight mt-2 mb-4">{opp.title}</h1>

          {opp.description && (
            <p className="text-muted leading-relaxed mb-6">{opp.description}</p>
          )}

          {opp.required_expertise.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {opp.required_expertise.map((e: string) => (
                <span key={e} className="text-sm px-3 py-1.5 rounded-lg bg-paper-2 font-medium">{e}</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white border border-[var(--line)] rounded-xl mb-8">
            {budgetStr && <Meta label="Budget" value={budgetStr} />}
            {opp.duration && <Meta label="Duration" value={opp.duration} />}
            {opp.work_mode && <Meta label="Mode" value={opp.work_mode.replace('_', '-')} />}
            <Meta label="Type" value={opp.rate_type} />
          </div>

          {/* Structured expertise requirements */}
          {isOwner ? (
            <>
              <RequirementsManager opportunityId={id} existing={requirements ?? []} />
              <MatchesPanel matches={matches} />
            </>
          ) : (requirements && requirements.length > 0) ? (
            <div className="card mb-6">
              <h3 className="font-serif text-lg mb-3">Required expertise</h3>
              <div className="flex flex-wrap gap-2">
                {requirements.map((r: any) => (
                  <span key={r.expertise_id} className="text-sm border rounded-lg px-3 py-1.5" style={{ borderColor: 'var(--line)' }}>
                    {r.expertise_taxonomy?.name}
                    <span className="text-xs text-muted ml-1.5">{r.importance}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Expert: propose | Business: see proposals */}
          {!isB && opp.status === 'open' && (
            <ProposalForm opportunityId={id} existing={myProposal} />
          )}
          {isB && <ProposalList proposals={proposals} opportunityId={id} />}
        </div>

        {/* sidebar */}
        <aside className="bg-white border border-[var(--line)] rounded-xl2 p-6 shadow-soft sticky top-20">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Posted by</p>
          <p className="font-serif text-lg">{opp.business_profiles?.company_name}</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted">
            <span>Trust Score</span>
            <div className="flex-1 h-1.5 rounded-full bg-paper-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-moss to-sand rounded-full"
                style={{ width: `${opp.business_profiles?.trust_score ?? 0}%` }} />
            </div>
            <span className="font-semibold text-ink">{opp.business_profiles?.trust_score ?? 0}</span>
          </div>
          <div className={`mt-4 text-xs font-semibold px-2.5 py-1 rounded-md inline-block
            ${opp.status === 'open' ? 'text-moss bg-moss/10' : 'text-muted bg-muted/10'}`}>
            {opp.status.replace('_', ' ')}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
