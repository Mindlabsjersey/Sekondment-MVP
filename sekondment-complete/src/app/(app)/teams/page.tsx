import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TeamSearchClient } from './TeamSearchClient';
import { searchTeams } from './team-search-actions';

/* Capability / team search — businesses find teams (businesses + their deployed employees)
   by what they collectively can do. User-facing, read-only. */
export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase.from('accounts').select('account_type').eq('id', user.id).maybeSingle();
  const isBusiness = account?.account_type === 'business';

  // Initial load: all teams (empty query).
  const initial = await searchTeams('');

  // Calculate stats
  const totalBusinesses = initial.length;
  const totalPeople = initial.reduce((acc, t) => acc + t.memberCount, 0);
  const totalExpertise = new Set(initial.flatMap(t => t.expertise.map(e => e.name))).size;

  return (
    <AppShell accountType={account?.account_type ?? 'business'}>
      {/* Hero header */}
      <div className="mb-8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
          <div>
            <h1 className="font-serif text-4xl tracking-tight mb-1">Find a team</h1>
            <p className="text-muted max-w-2xl">
              Search by capability to find businesses who can field a whole team — not just one freelancer. 
              Perfect when your project needs multiple skills delivered together.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/experts" className="btn btn-ghost">Browse Experts</Link>
            {isBusiness && <Link href="/employees" className="btn btn-primary">My Team</Link>}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-6 py-4 border-y border-[var(--line)]/50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-moss/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-moss" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <div>
              <p className="font-serif text-xl leading-none">{totalBusinesses}</p>
              <p className="text-xs text-muted">Teams</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-sand/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-sand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div>
              <p className="font-serif text-xl leading-none">{totalPeople}</p>
              <p className="text-xs text-muted">People</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-ink/5 flex items-center justify-center">
              <svg className="w-4 h-4 text-ink/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <div>
              <p className="font-serif text-xl leading-none">{totalExpertise}+</p>
              <p className="text-xs text-muted">Expertise Areas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-4xl">
        <TeamSearchClient initial={initial} />
      </div>

      {/* Info cards for empty states or help */}
      {initial.length === 0 && (
        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <div className="card bg-gradient-to-br from-paper to-paper-2/50">
            <h3 className="font-medium mb-2">What are teams?</h3>
            <p className="text-sm text-muted">
              Businesses with approved employees can be deployed together as a unit. 
              Search for capabilities you need and find the right partner.
            </p>
          </div>
          <div className="card bg-gradient-to-br from-paper to-paper-2/50">
            <h3 className="font-medium mb-2">Have a team?</h3>
            <p className="text-sm text-muted">
              {isBusiness 
                ? "Add employees to your team and they'll appear here when approved."
                : "Join a business as an employee to be part of their deployable team."}
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
