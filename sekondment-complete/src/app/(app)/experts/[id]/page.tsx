import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StartConversationButton from './StartConversationButton';
import { CATEGORY_LABELS } from '@/lib/types/database';
import type { ExpertCategory } from '@/lib/types/database';
import { formatMoney } from '@/lib/currency';

const AVAIL_LABELS: Record<string, string> = {
  available_now: 'Available now',
  available_from: 'Available soon',
  fractional_only: 'Fractional only',
  advisory_only: 'Advisory only',
  project_only: 'Project only',
};

export default async function ExpertProfilePage({
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

  // Full expert profile.
  const { data: expert } = await supabase
    .from('expert_profiles')
    .select(`
      id, account_id, name, headline, bio, photo_url,
      skills, expertise_areas, industries, categories,
      certifications, portfolio_url, linkedin_url, website,
      hourly_rate, daily_rate, trust_score, verification_status,
      email_verified, identity_verified, linkedin_verified, certification_verified,
      employing_business_id, employer_partner_id,
      based_country, based_city, timezone, remote_available, onsite_available, hybrid_available,
      expert_availability(availability_type, work_modes, hours_per_week, days_per_month),
      business_profiles(company_name),
      employer_partners(company_name)
    `)
    .eq('id', id)
    .single();

  if (!expert) redirect('/experts');

  // Structured expertise (with verification levels) for proven/verified badges.
  const { data: structuredExpertise } = await supabase
    .from('profile_expertise')
    .select('verification_level, project_count, expertise_taxonomy(name, type)')
    .eq('profile_id', id).eq('profile_type', 'expert')
    .order('verification_level', { ascending: false });

  // Reviews this expert has received.
  const { data: reviews } = await supabase
    .from('reviews')
    .select('r_expertise, r_communication, r_reliability, r_outcome_achievement, r_value_delivered, comment, created_at')
    .eq('reviewee_id', expert.account_id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Completed engagement count (public metric).
  const { count: completedCount } = await supabase
    .from('engagements')
    .select('id', { count: 'exact', head: true })
    .eq('expert_id', expert.id)
    .eq('status', 'complete');

  const isB = account.account_type === 'business';
  const avail = (expert as any).expert_availability;
  const isResource = !!(expert as any).employing_business_id || !!(expert as any).employer_partner_id;
  const companyName = (expert as any).employer_partners?.company_name ?? (expert as any).business_profiles?.company_name;

  // Average review score.
  const avgScore = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => {
        const vals = [r.r_expertise, r.r_communication, r.r_reliability, r.r_outcome_achievement, r.r_value_delivered]
          .filter((v): v is number => typeof v === 'number');
        return sum + (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
      }, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <AppShell accountType={account.account_type}>
      <Link href="/experts" className="text-muted text-sm hover:text-ink transition mb-6 inline-block">
        ← Back to experts
      </Link>

      <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* main */}
        <div>
          {/* header */}
          <div className="flex gap-5 items-start mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-moss to-moss-2 text-white flex items-center justify-center font-serif font-semibold text-2xl flex-none">
              {expert.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-serif text-3xl tracking-tight">{expert.name}</h1>
                {expert.verification_status === 'verified' && (
                  <span className="badge-verified">✓ VERIFIED</span>
                )}
              </div>
              {expert.headline && <p className="text-muted text-lg mt-1">{expert.headline}</p>}
              {(expert.based_country || expert.based_city) && (
                <p className="text-muted text-sm mt-1">
                  📍 {[expert.based_city, expert.based_country].filter(Boolean).join(', ')}
                  {expert.remote_available && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-moss/10 text-moss">Remote</span>}
                  {expert.onsite_available && <span className="ml-1 text-xs px-2 py-0.5 rounded bg-paper-2">On-site</span>}
                </p>
              )}
              {isResource && companyName && (
                <p className="text-sm font-semibold text-sand mt-1">
                  Company Resource · deployed via {companyName}
                </p>
              )}
            </div>
          </div>

          {/* company resource notice */}
          {isResource && (
            <div className="bg-sand/10 border border-sand/30 rounded-xl px-5 py-4 mb-6 text-sm leading-relaxed">
              <strong>Company Resource</strong> — {expert.name} is deployed via {companyName}, who
              remains their employer. Payment for any engagement routes to {companyName}.
              {expert.name.split(' ')[0]} stays on their payroll throughout.
            </div>
          )}

          {/* bio */}
          {expert.bio && (
            <section className="mb-7">
              <h2 className="font-serif text-xl mb-3">About</h2>
              <p className="text-muted leading-relaxed">{expert.bio}</p>
            </section>
          )}

          {/* structured expertise — proven / verified / declared */}
          {structuredExpertise && structuredExpertise.length > 0 && (
            <section className="mb-7">
              <h2 className="font-serif text-xl mb-3">Verified expertise</h2>
              <div className="flex flex-wrap gap-2">
                {structuredExpertise.map((e: any, i: number) => {
                  const lvl = e.verification_level;
                  const cls = lvl === 'proven' ? 'bg-sand/12 text-sand border-sand/30'
                    : lvl === 'verified' ? 'bg-moss/10 text-moss border-moss/30'
                    : 'bg-paper-2 border-[var(--line)]';
                  return (
                    <span key={i} className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium ${cls}`}>
                      {e.expertise_taxonomy?.name}
                      <span className="text-[10px] uppercase tracking-wide opacity-80">{lvl}</span>
                      {e.project_count > 0 && <span className="text-[10px] opacity-70">· {e.project_count}×</span>}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* skills */}
          {expert.skills.length > 0 && (
            <section className="mb-7">
              <h2 className="font-serif text-xl mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {expert.skills.map((s: string) => (
                  <span key={s} className="text-sm px-3 py-1.5 rounded-lg bg-paper-2 font-medium">{s}</span>
                ))}
              </div>
            </section>
          )}

          {/* expertise + industries */}
          <div className="grid sm:grid-cols-2 gap-6 mb-7">
            {expert.expertise_areas.length > 0 && (
              <section>
                <h2 className="font-serif text-xl mb-3">Expertise</h2>
                <ul className="space-y-1">
                  {expert.expertise_areas.map((a: string) => (
                    <li key={a} className="text-sm text-muted flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-moss flex-none" />{a}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {expert.industries.length > 0 && (
              <section>
                <h2 className="font-serif text-xl mb-3">Industries</h2>
                <ul className="space-y-1">
                  {expert.industries.map((i: string) => (
                    <li key={i} className="text-sm text-muted flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-sand flex-none" />{i}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* categories */}
          {expert.categories.length > 0 && (
            <section className="mb-7">
              <h2 className="font-serif text-xl mb-3">Engagement types</h2>
              <div className="flex flex-wrap gap-2">
                {(expert.categories as ExpertCategory[]).map((c) => (
                  <span key={c} className="text-sm px-3 py-1.5 rounded-lg border border-[var(--line)] font-medium">
                    {CATEGORY_LABELS[c]}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* reviews */}
          {reviews && reviews.length > 0 && (
            <section>
              <h2 className="font-serif text-xl mb-4">
                Reviews
                {avgScore && <span className="text-muted font-normal text-base ml-2">· {avgScore} avg</span>}
              </h2>
              <div className="grid gap-4">
                {reviews.map((r, i) => {
                  const rated = [r.r_expertise, r.r_communication, r.r_reliability, r.r_outcome_achievement, r.r_value_delivered]
                    .filter((v): v is number => typeof v === 'number');
                  const avg = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : null;
                  return (
                    <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-5">
                      <div className="flex justify-between items-center mb-2">
                        {avg && (
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map((n) => (
                              <span key={n} className="text-lg" style={{ color: n <= Math.round(Number(avg)) ? '#c8a24a' : 'rgba(12,31,26,.15)' }}>★</span>
                            ))}
                            <span className="text-sm font-semibold ml-1">{avg}</span>
                          </div>
                        )}
                        <span className="text-xs text-muted">
                          {new Date(r.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {r.comment && <p className="text-sm text-muted leading-relaxed">{r.comment}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* sidebar */}
        <aside className="space-y-4 sticky top-20">
          {/* stats */}
          <div className="bg-white border border-[var(--line)] rounded-xl2 p-5 shadow-soft">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Stat label="Trust Score" value={String(expert.trust_score)} />
              <Stat label="Engagements" value={String(completedCount ?? 0)} />
              {expert.daily_rate && <Stat label="Day rate" value={formatMoney(expert.daily_rate)} />}
              {expert.hourly_rate && <Stat label="Hourly rate" value={formatMoney(expert.hourly_rate)} />}
            </div>

            {/* availability */}
            {avail && (
              <div className="py-3 border-t border-[var(--line)]">
                <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">Availability</p>
                <p className={`text-sm font-medium ${avail.availability_type === 'available_now' ? 'text-moss' : 'text-ink'}`}>
                  {AVAIL_LABELS[avail.availability_type] ?? avail.availability_type}
                </p>
                {avail.hours_per_week && (
                  <p className="text-xs text-muted mt-0.5">{avail.hours_per_week} hrs/week</p>
                )}
                {avail.work_modes?.length > 0 && (
                  <p className="text-xs text-muted mt-0.5 capitalize">
                    {avail.work_modes.map((m: string) => m.replace('_', '-')).join(' · ')}
                  </p>
                )}
              </div>
            )}

            {/* verification badges */}
            <div className="py-3 border-t border-[var(--line)]">
              <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Verification</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { l: 'Email', ok: expert.email_verified },
                  { l: 'Identity', ok: expert.identity_verified },
                  { l: 'LinkedIn', ok: expert.linkedin_verified },
                  { l: 'Certifications', ok: expert.certification_verified },
                ].map(({ l, ok }) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white ${ok ? 'bg-moss' : 'bg-paper-2'}`}>
                      {ok ? '✓' : ''}
                    </span>
                    <span className={ok ? 'text-ink' : 'text-muted'}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* links */}
            {(expert.linkedin_url || expert.website || expert.portfolio_url) && (
              <div className="pt-3 border-t border-[var(--line)] space-y-1.5">
                {expert.linkedin_url && (
                  <a href={expert.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="block text-sm text-moss hover:underline">LinkedIn profile →</a>
                )}
                {expert.website && (
                  <a href={expert.website} target="_blank" rel="noopener noreferrer"
                    className="block text-sm text-moss hover:underline">Website →</a>
                )}
                {expert.portfolio_url && (
                  <a href={expert.portfolio_url} target="_blank" rel="noopener noreferrer"
                    className="block text-sm text-moss hover:underline">Portfolio →</a>
                )}
              </div>
            )}
          </div>

          {/* CTAs — only for businesses */}
          {isB && (
            <div className="space-y-2">
              <StartConversationButton expertAccountId={expert.account_id} expertName={expert.name} />
              <Link href="/opportunities" className="btn btn-ghost btn-lg w-full text-center">
                Attach to an opportunity →
              </Link>
              <p className="text-xs text-muted text-center leading-relaxed">
                To propose an engagement, attach this expert to one of your open opportunities.
              </p>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper rounded-xl p-3 text-center">
      <div className="font-serif font-semibold text-xl">{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}
