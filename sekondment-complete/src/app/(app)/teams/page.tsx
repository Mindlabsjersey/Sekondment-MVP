import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TeamSearchClient } from './TeamSearchClient';
import { searchTeams } from './team-search-actions';

/* Capability / team search — businesses find teams (employer partners + their people)
   by what they collectively can do. User-facing, read-only. */
export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase.from('accounts').select('account_type').eq('id', user.id).maybeSingle();

  // Initial load: all teams (empty query).
  const initial = await searchTeams('');

  return (
    <AppShell accountType={account?.account_type ?? 'business'}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl tracking-tight mb-1">Find a team</h1>
        <p className="text-muted mb-6">Search by capability to find employer partners who can field a whole team — not just one freelancer. Useful when a project needs several skills at once.</p>
        <TeamSearchClient initial={initial} />
      </div>
    </AppShell>
  );
}
