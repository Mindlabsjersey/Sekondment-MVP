import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PublicHeader from '../PublicHeader';
import SignUpGate from '../SignUpGate';

const TEASER_LIMIT = 6;

export default async function PublicExpertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Logged-in users get the full authenticated experience instead.
  if (user) redirect('/experts');

  // Public teaser: top experts by trust score, capped. No filters for logged-out.
  const { data: experts } = await supabase
    .from('expert_profiles')
    .select('id, name, headline, skills, categories, daily_rate, trust_score, verification_status, employing_business_id, employer_partner_id')
    .eq('visibility', 'listed')
    .order('trust_score', { ascending: false })
    .limit(TEASER_LIMIT);

  const { count: total } = await supabase
    .from('expert_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('visibility', 'listed');

  const remaining = Math.max(0, (total ?? 0) - TEASER_LIMIT);

  return (
    <div className="min-h-screen bg-paper relative">
      <div className="fixed inset-0 opacity-[.035] pointer-events-none z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      <PublicHeader />
      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-moss bg-moss/8 px-3.5 py-1.5 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-moss" /> Browse experts
        </span>
        <h1 className="font-serif text-4xl tracking-tight mb-2">Verified expertise, on demand</h1>
        <p className="text-muted text-lg mb-8 max-w-2xl">
          A preview of the experts, advisors and company resources on Sekondment. Create a free account
          to see full profiles, reviews, and filter by availability and budget.
        </p>

        <div className="grid gap-4">
          {(experts ?? []).map((e) => {
            const isResource = !!e.employing_business_id || !!e.employer_partner_id;
            return (
              <div key={e.id} className="bg-white border border-[var(--line)] rounded-xl p-5 flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-moss to-moss-2 text-white flex items-center justify-center font-serif font-semibold flex-none">
                  {e.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-semibold text-lg">{e.name}</span>
                    {e.verification_status === 'verified' && <span className="badge-verified text-[10px]">✓ VERIFIED</span>}
                    {isResource && <span className="text-xs font-semibold text-sand">Company Resource</span>}
                  </div>
                  {e.headline && <p className="text-muted text-sm mt-0.5 mb-2">{e.headline}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {(e.skills as string[]).slice(0, 4).map((s) => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-md bg-paper-2 font-medium">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-none">
                  <div className="font-serif font-semibold text-lg">{e.trust_score}</div>
                  <div className="text-xs text-muted">Trust</div>
                </div>
              </div>
            );
          })}
          {(!experts || experts.length === 0) && (
            <div className="bg-white border border-[var(--line)] rounded-xl p-10 text-center text-muted">
              <p className="font-serif text-lg text-ink mb-1">Experts are joining now</p>
              <p className="text-sm">Be among the first — create an account to set up your profile.</p>
            </div>
          )}
        </div>

        <SignUpGate remaining={remaining} noun="experts" />
      </main>
    </div>
  );
}
