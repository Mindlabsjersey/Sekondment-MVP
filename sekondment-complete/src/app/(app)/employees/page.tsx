import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EmployeeActions from './EmployeeActions';

const PAYEE_LABEL: Record<string, string> = {
  me: 'Employee paid',
  employer: 'Employer paid',
  split: 'Split',
};

type Employee = {
  id: string;
  name: string;
  headline: string | null;
  employment_status: string;
  payment_preference: string | null;
};

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'business') redirect('/dashboard');

  const { data: biz } = await supabase
    .from('business_profiles').select('id').eq('account_id', user.id).maybeSingle();

  let employees: Employee[] = [];
  if (biz) {
    const { data } = await supabase
      .from('expert_profiles')
      .select('id, name, headline, employment_status, payment_preference')
      .eq('employing_business_id', biz.id)
      .order('name', { ascending: true });
    employees = (data as Employee[]) ?? [];
  }

  const pending = employees.filter((e) => e.employment_status === 'pending');
  const approved = employees.filter((e) => e.employment_status === 'employed');

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Your team</h1>
      <p className="text-muted mb-8">
        Employees who matched themselves to your company. Approve them to deploy them as Company Resources.
      </p>

      {!biz && (
        <p className="text-sm text-muted bg-paper-2 rounded-xl p-4">
          Finish your business profile first so employees can match to you.
        </p>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          Pending approval {pending.length > 0 && `(${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">No pending requests.</p>
        ) : (
          <ul className="space-y-2.5">
            {pending.map((e) => (
              <li key={e.id}
                className="flex items-center justify-between gap-4 bg-white border border-[var(--line)] rounded-xl p-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{e.name}</p>
                  <p className="text-sm text-muted truncate">
                    {e.headline || 'Employee'}
                    {e.payment_preference && ` · ${PAYEE_LABEL[e.payment_preference] ?? e.payment_preference}`}
                  </p>
                </div>
                <EmployeeActions expertId={e.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          Active team {approved.length > 0 && `(${approved.length})`}
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-muted">No active employees yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {approved.map((e) => (
              <li key={e.id}
                className="flex items-center justify-between gap-4 bg-white border border-[var(--line)] rounded-xl p-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{e.name}</p>
                  <p className="text-sm text-muted truncate">
                    {e.headline || 'Company Resource'}
                    {e.payment_preference && ` · ${PAYEE_LABEL[e.payment_preference] ?? e.payment_preference}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge-verified">Active</span>
                  <EmployeeActions expertId={e.id} approvedView />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
