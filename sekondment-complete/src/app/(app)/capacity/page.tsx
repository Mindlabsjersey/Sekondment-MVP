import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { formatMoney } from '@/lib/currency';

// Capacity page - now showing available employee capacity from businesses
export default async function CapacityBrowsePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  
  const { data: account } = await supabase.from('accounts').select('account_type').eq('id', user.id).single();
  if (!account) redirect('/sign-in');
  
  const isBusiness = account.account_type === 'business';

  // Get approved employees with their expertise and availability
  const { data: employees } = await supabase
    .from('expert_profiles')
    .select(`
      id, name, headline, skills, industries,
      daily_rate, hourly_rate, based_country, remote_available, onsite_available,
      employing_business_id,
      business_profiles!employing_business_id(id, company_name, logo_url),
      expert_availability(availability_type, hours_per_week, work_modes),
      profile_expertise(expertise_taxonomy(name))
    `)
    .eq('employment_status', 'approved')
    .eq('visibility', 'listed')
    .order('trust_score', { ascending: false })
    .limit(50);

  const rows = employees ?? [];

  return (
    <AppShell accountType={account.account_type}>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-serif text-4xl tracking-tight mb-1">Available capacity</h1>
          <p className="text-muted">
            Browse available employees from businesses — deployable as company resources.
          </p>
        </div>
        {isBusiness && (
          <Link href="/employees" className="btn btn-primary">
            View My Team
          </Link>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card bg-gradient-to-br from-moss/5 to-transparent border-moss/20">
          <p className="text-xs font-semibold text-moss uppercase tracking-wide">Available Now</p>
          <p className="font-serif text-3xl mt-2">{rows.filter((e: any) => e.expert_availability?.availability_type === 'available_now').length}</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Businesses</p>
          <p className="font-serif text-3xl mt-2">{new Set(rows.map((e: any) => e.employing_business_id)).size}</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Expertise Areas</p>
          <p className="font-serif text-3xl mt-2">{new Set(rows.flatMap((e: any) => e.skills ?? [])).size}+</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-paper-2 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="font-serif text-xl text-ink mb-2">No capacity available yet</p>
          <p className="text-sm text-muted max-w-md mx-auto">
            Businesses haven't listed their employees as available for deployment yet. 
            Check back soon or browse individual experts.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/experts" className="btn btn-primary">Browse Experts</Link>
            <Link href="/teams" className="btn btn-ghost">Find a Team</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((e: any) => {
            const tags = (e.profile_expertise ?? []).map((t: any) => t.expertise_taxonomy?.name).filter(Boolean);
            const business = e.business_profiles;
            const avail = e.expert_availability;
            
            return (
              <Link 
                key={e.id} 
                href={`/experts/${e.id}`}
                className="card flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-3 flex-none">
                  {business?.logo_url ? (
                    <img src={business.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-moss/20 to-moss/5 flex items-center justify-center font-serif font-bold text-moss">
                      {business?.company_name?.slice(0, 1) || 'B'}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-lg group-hover:text-moss transition-colors">{e.name}</h2>
                    {business?.company_name && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-paper-2 text-muted">
                        via {business.company_name}
                      </span>
                    )}
                    {avail?.availability_type === 'available_now' && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-moss/10 text-moss">
                        Available now
                      </span>
                    )}
                  </div>
                  
                  {e.headline && <p className="text-sm text-muted">{e.headline}</p>}
                  
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(e.skills as string[]).slice(0, 4).map((s: string) => (
                      <span key={s} className="text-xs px-2 py-1 rounded-md bg-paper-2 font-medium">{s}</span>
                    ))}
                    {tags.slice(0, 3).map((t: string) => (
                      <span key={t} className="text-xs px-2 py-1 rounded-md bg-moss/10 text-moss font-medium">{t}</span>
                    ))}
                  </div>
                </div>
                
                <div className="text-right flex-none space-y-1">
                  {e.daily_rate && (
                    <p className="font-semibold">{formatMoney(e.daily_rate)}/day</p>
                  )}
                  {e.hourly_rate && (
                    <p className="text-xs text-muted">{formatMoney(e.hourly_rate)}/hr</p>
                  )}
                  {avail?.hours_per_week && (
                    <p className="text-xs text-muted">{avail.hours_per_week}h/wk available</p>
                  )}
                  <div className="flex gap-1 mt-2 justify-end">
                    {e.remote_available && <span className="text-[10px] px-1.5 py-0.5 rounded bg-paper-2">Remote</span>}
                    {e.onsite_available && <span className="text-[10px] px-1.5 py-0.5 rounded bg-paper-2">On-site</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
