import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { industryKey, industryLabel } from '@/lib/industry';

export default async function SavedExpertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (!account) redirect('/sign-in');
  const isExpert = account.account_type === 'expert';
  const isBusiness = account.account_type === 'business';
  if (!isExpert && !isBusiness) redirect('/dashboard');

  // ── Experts: saved opportunities ──────────────────────────────────────────
  if (isExpert) {
    const { data: expert } = await supabase
      .from('expert_profiles').select('id').eq('account_id', user.id).single();
    let savedOpps: any[] = [];
    if (expert) {
      const { data } = await supabase
        .from('saved_opportunities')
        .select('opportunities!inner(id, title, desired_outcome, required_expertise, industry, budget_min, budget_max, work_mode, status)')
        .eq('expert_id', expert.id)
        .order('created_at', { ascending: false });
      savedOpps = (data ?? []).map((r: any) => r.opportunities).filter(Boolean);
    }
    return (
      <AppShell accountType="expert">
        <h1 className="font-serif text-4xl tracking-tight mb-1">Saved opportunities</h1>
        <p className="text-muted mb-8">Opportunities you've bookmarked to revisit.</p>
        {savedOpps.length === 0 ? (
          <div className="card text-center py-16 text-muted">
            <p className="font-serif text-xl text-ink mb-2">No saved opportunities yet</p>
            <p className="text-sm mb-6">Tap the ☆ on any opportunity to bookmark it.</p>
            <Link href="/opportunities" className="btn btn-primary">Browse opportunities →</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {savedOpps.map((o: any) => {
              const indKey = industryKey(o.industry ?? o.required_expertise);
              const indName = industryLabel(o.industry ?? o.required_expertise);
              return (
                <Link key={o.id} href={`/opportunities/${o.id}`} data-industry={indKey}
                  className="card block" style={{ borderLeft: '4px solid var(--c-industry, var(--c-blue))' }}>
                  {indName && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{ color: 'var(--c-industry, var(--c-blue))', background: 'var(--c-industry-tint, var(--c-surface2))' }}>
                      {indName}
                    </span>
                  )}
                  <h2 className="font-serif text-lg mt-1 mb-2">{o.title}</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {(o.required_expertise as string[]).slice(0, 4).map((s) => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-md bg-paper-2 font-medium">{s}</span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </AppShell>
    );
  }

  // ── Businesses: saved experts ─────────────────────────────────────────────

  const { data: biz } = await supabase
    .from('business_profiles').select('id').eq('account_id', user.id).single();

  let saved: any[] = [];
  if (biz) {
    const { data } = await supabase
      .from('saved_experts')
      .select(`
        created_at,
        expert_profiles!inner(id, name, headline, skills, industries, daily_rate, trust_score, verification_status)
      `)
      .eq('business_id', biz.id)
      .order('created_at', { ascending: false });
    saved = (data ?? []).map((r: any) => r.expert_profiles).filter(Boolean);
  }

  return (
    <AppShell accountType="business">
      <h1 className="font-serif text-4xl tracking-tight mb-1">Saved experts</h1>
      <p className="text-muted mb-8">Your shortlist of experts to revisit and engage.</p>

      {saved.length === 0 ? (
        <div className="card text-center py-16 text-muted">
          <p className="font-serif text-xl text-ink mb-2">No saved experts yet</p>
          <p className="text-sm mb-6">Tap the ☆ on any expert to add them to your shortlist.</p>
          <Link href="/experts" className="btn btn-primary">Browse experts →</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {saved.map((e: any) => {
            const indKey = industryKey(e.industries);
            const indName = industryLabel(e.industries);
            return (
              <Link key={e.id} href={`/experts/${e.id}`} data-industry={indKey}
                className="bg-surface border border-[var(--line)] rounded-xl p-5 flex gap-4 items-center hover:shadow-soft hover:-translate-y-0.5 transition-all"
                style={{ borderLeft: '4px solid var(--c-industry, var(--c-blue))' }}>
                <div className="w-12 h-12 rounded-xl text-white flex items-center justify-center font-serif font-semibold flex-none"
                  style={{ background: 'var(--c-industry, var(--c-blue))' }}>
                  {e.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-semibold text-lg">{e.name}</span>
                    {e.verification_status === 'verified' && <span className="badge-verified text-[10px]">✓ VERIFIED</span>}
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
                  </div>
                </div>
                <div className="text-right flex-none">
                  <div className="font-serif font-semibold text-lg">{e.trust_score}</div>
                  <div className="text-xs text-muted">Trust</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
