import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { formatMoney } from '@/lib/currency';
import BookCapacityButton from './BookCapacityButton';

export default async function CapacityBrowsePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: account } = await supabase.from('accounts').select('account_type').eq('id', user.id).single();
  if (!account) redirect('/sign-in');
  const isBusiness = account.account_type === 'business';

  // Public, approved capacity listings with their expertise tags + employer name.
  const { data: listings } = await supabase
    .from('capacity_profiles')
    .select(`
      id, title, available_hours_per_week, available_days_per_month, work_mode,
      day_rate, hourly_rate, rate_currency, location, timezone,
      employer_partners(company_name),
      capacity_tags(expertise_taxonomy(name))
    `)
    .eq('visibility', 'public')
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = listings ?? [];

  return (
    <AppShell accountType={account.account_type}>
      <h1 className="font-serif text-4xl tracking-tight mb-1">Workforce capacity</h1>
      <p className="text-muted mb-8">
        Book expertise and capacity from employer partners — by capability and availability,
        not just headcount.
      </p>

      {rows.length === 0 ? (
        <div className="card text-center py-16 text-muted">
          <p className="font-serif text-xl text-ink mb-2">No capacity listed yet</p>
          <p className="text-sm">Employer partners can list spare capacity from their dashboard.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((c: any) => {
            const tags = (c.capacity_tags ?? []).map((t: any) => t.expertise_taxonomy?.name).filter(Boolean);
            return (
              <div key={c.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-serif text-lg">{c.title}</h2>
                  <p className="text-sm text-muted mb-2">
                    {c.employer_partners?.company_name} · {c.available_hours_per_week}h/wk · {c.work_mode}
                    {c.location ? ` · ${c.location}` : ''}
                  </p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.slice(0, 5).map((t: string) => (
                        <span key={t} className="text-xs px-2.5 py-1 rounded-md bg-paper-2 font-medium">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right flex-none">
                  {c.day_rate && <p className="font-semibold text-sm">{formatMoney(c.day_rate, c.rate_currency)}/day</p>}
                  {c.hourly_rate && <p className="text-xs text-muted">{formatMoney(c.hourly_rate, c.rate_currency)}/hr</p>}
                  {isBusiness && <div className="mt-2"><BookCapacityButton capacityId={c.id} /></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
