import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { formatMoney } from '@/lib/currency';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'text-[#b8862f] bg-[#b8862f]/12' },
  complete: { label: 'Complete', cls: 'text-moss bg-moss/10' },
  cancelled: { label: 'Cancelled', cls: 'text-muted bg-muted/10' },
  disputed: { label: 'Disputed', cls: 'text-[#a14b3d] bg-[#a14b3d]/10' },
};

export default async function EngagementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (!account) redirect('/sign-in');

  const isB = account.account_type === 'business';

  // Resolve the profile id needed to filter engagements.
  let engagements: any[] = [];

  if (isB) {
    const { data: biz } = await supabase
      .from('business_profiles').select('id').eq('account_id', user.id).single();
    if (biz) {
      const { data } = await supabase
        .from('engagements')
        .select(`
          id, title, status, total_amount, currency, created_at,
          expert_profiles(name, headline),
          milestones(status)
        `)
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false });
      engagements = data ?? [];
    }
  } else {
    const { data: expert } = await supabase
      .from('expert_profiles').select('id').eq('account_id', user.id).single();
    if (expert) {
      const { data } = await supabase
        .from('engagements')
        .select(`
          id, title, status, total_amount, currency, created_at,
          business_profiles(company_name),
          milestones(status)
        `)
        .eq('expert_id', expert.id)
        .order('created_at', { ascending: false });
      engagements = data ?? [];
    }
  }

  // Compute milestone progress per engagement.
  const withProgress = engagements.map((e) => {
    const ms = (e.milestones as any[]) ?? [];
    const released = ms.filter((m) => m.status === 'released').length;
    return { ...e, progress: ms.length > 0 ? Math.round((released / ms.length) * 100) : 0, total_milestones: ms.length, released_milestones: released };
  });

  return (
    <AppShell accountType={account.account_type}>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Engagements</h1>
          <p className="text-muted mt-1">
            {isB ? 'Track your active and completed expert engagements.'
                 : 'Your active assignments and engagement history.'}
          </p>
        </div>
        {isB && (
          <Link href="/opportunities" className="btn btn-primary">Find Experts</Link>
        )}
      </div>

      {withProgress.length === 0 ? (
        <div className="card text-center py-16 text-muted">
          <p className="font-serif text-xl text-ink mb-2">No engagements yet</p>
          <p className="text-sm mb-6">
            {isB
              ? 'Accept a proposal on one of your opportunities to create an engagement.'
              : 'Submit proposals on open opportunities to start an engagement.'}
          </p>
          <Link href={isB ? '/opportunities' : '/opportunities'} className="btn btn-primary">
            {isB ? 'Post an opportunity →' : 'Browse opportunities →'}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {withProgress.map((e) => {
            const sm = STATUS_META[e.status] ?? STATUS_META.active;
            const counterparty = isB
              ? e.expert_profiles?.name
              : e.business_profiles?.company_name;

            return (
              <Link key={e.id} href={`/engagements/${e.id}`}
                className="bg-white border border-[var(--line)] rounded-xl p-5 hover:shadow-soft hover:-translate-y-0.5 transition-all block">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h2 className="font-serif text-lg">{e.title}</h2>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${sm.cls}`}>
                        {sm.label}
                      </span>
                    </div>
                    {counterparty && (
                      <p className="text-sm text-muted">{counterparty}</p>
                    )}
                  </div>
                  <div className="text-right flex-none">
                    <p className="font-serif font-semibold text-lg">
                      {formatMoney(e.total_amount, e.currency)}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* milestone progress bar */}
                {e.total_milestones > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted mb-1.5">
                      <span>Milestones</span>
                      <span>{e.released_milestones}/{e.total_milestones} released</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-paper-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-moss to-sand transition-all"
                        style={{ width: `${e.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
