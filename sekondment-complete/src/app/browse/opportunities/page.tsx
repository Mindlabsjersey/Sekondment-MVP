import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PublicHeader from '../PublicHeader';
import SignUpGate from '../SignUpGate';
import { OUTCOME_LABELS } from '@/lib/types/database';
import { formatMoney } from '@/lib/currency';

const TEASER_LIMIT = 6;

export default async function PublicOpportunitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/opportunities');

  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, title, desired_outcome, required_expertise, budget_min, budget_max, work_mode, rate_type, currency, business_profiles(company_name)')
    .eq('status', 'open')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(TEASER_LIMIT);

  const { count: total } = await supabase
    .from('opportunities')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')
    .eq('visibility', 'public');

  const remaining = Math.max(0, (total ?? 0) - TEASER_LIMIT);

  return (
    <div className="min-h-screen bg-paper relative">
      <div className="fixed inset-0 opacity-[.035] pointer-events-none z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      <PublicHeader />
      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-moss bg-moss/8 px-3.5 py-1.5 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-moss" /> Open opportunities
        </span>
        <h1 className="font-serif text-4xl tracking-tight mb-2">Work worth doing</h1>
        <p className="text-muted text-lg mb-8 max-w-2xl">
          A preview of open opportunities from businesses on Sekondment. Create a free expert account to
          submit proposals and engage on secure, milestone-based terms.
        </p>

        <div className="grid gap-4">
          {(opps ?? []).map((o: any) => {
            const budget = o.budget_min || o.budget_max
              ? [o.budget_min && formatMoney(o.budget_min, o.currency), o.budget_max && formatMoney(o.budget_max, o.currency)].filter(Boolean).join('–')
              : null;
            return (
              <div key={o.id} className="bg-white border border-[var(--line)] rounded-xl p-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    {o.desired_outcome && (
                      <span className="text-xs font-semibold text-moss uppercase tracking-wider">
                        {OUTCOME_LABELS[o.desired_outcome as keyof typeof OUTCOME_LABELS] ?? o.desired_outcome.replace(/_/g, ' ')}
                      </span>
                    )}
                    <h2 className="font-serif text-lg mt-1 mb-2">{o.title}</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {(o.required_expertise as string[]).slice(0, 4).map((x) => (
                        <span key={x} className="text-xs px-2.5 py-1 rounded-md bg-paper-2 font-medium">{x}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-none">
                    {budget && <div className="font-semibold text-sm">{budget}</div>}
                    <div className="text-xs text-muted mt-1 capitalize">{o.work_mode?.replace('_', '-')}</div>
                  </div>
                </div>
              </div>
            );
          })}
          {(!opps || opps.length === 0) && (
            <div className="bg-white border border-[var(--line)] rounded-xl p-10 text-center text-muted">
              <p className="font-serif text-lg text-ink mb-1">New opportunities posted regularly</p>
              <p className="text-sm">Create an account to be notified when work matching your expertise appears.</p>
            </div>
          )}
        </div>

        <SignUpGate remaining={remaining} noun="opportunities" />
      </main>
    </div>
  );
}
