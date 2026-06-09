import { createServiceClient } from '@/lib/supabase/server';
import PlatformShell, { requirePlatform } from '@/components/PlatformShell';
import { formatMoney } from '@/lib/currency';
import { AddLeadForm } from './AddLeadForm';

/* CRM pipeline — founder-led sales & partnerships, from the crm_leads table.
   Visible to owner / director / marketplace_manager / support_team. */
const STAGES: { key: string; label: string }[] = [
  { key: 'lead', label: 'Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'demo_booked', label: 'Demo booked' },
  { key: 'demo_completed', label: 'Demo done' },
  { key: 'trial', label: 'Trial' },
  { key: 'active_customer', label: 'Active' },
  { key: 'employer_partner_prospect', label: 'Partner prospect' },
  { key: 'enterprise_opportunity', label: 'Enterprise' },
  { key: 'partnership_opportunity', label: 'Partnership' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

export default async function CrmDashboard() {
  await requirePlatform('crm');
  const svc = createServiceClient();
  const { data } = await svc
    .from('crm_leads')
    .select('id, company_name, contact_name, country, industry, stage, estimated_value, next_follow_up')
    .order('estimated_value', { ascending: false });

  const leads = data ?? [];
  const byStage = (stage: string) => leads.filter((l) => l.stage === stage);
  const totalPipeline = leads
    .filter((l) => l.stage !== 'lost' && l.stage !== 'won')
    .reduce((a, l) => a + Number(l.estimated_value ?? 0), 0);
  const won = leads.filter((l) => l.stage === 'won').reduce((a, l) => a + Number(l.estimated_value ?? 0), 0);

  return (
    <PlatformShell active="crm">
      <h1 className="font-serif text-3xl tracking-tight mb-1">CRM pipeline</h1>
      <p className="text-muted mb-6">Founder-led sales, demos and partnerships — tracked inside the platform.</p>

      <AddLeadForm />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="Open pipeline value" value={formatMoney(totalPipeline, 'GBP')} big />
        <Metric label="Won" value={formatMoney(won, 'GBP')} big />
        <Metric label="Total leads" value={String(leads.length)} />
        <Metric label="In enterprise/partnership" value={String(leads.filter((l) => l.stage.includes('enterprise') || l.stage.includes('partnership')).length)} />
      </div>

      {leads.length === 0 ? (
        <div className="card"><p className="text-muted text-sm">No leads yet. Add CRM leads to track sales and partnerships here.</p></div>
      ) : (
        <div className="space-y-5">
          {STAGES.map((s) => {
            const inStage = byStage(s.key);
            if (inStage.length === 0) return null;
            return (
              <div key={s.key}>
                <h2 className="font-serif text-lg mb-2">{s.label} <span className="text-muted text-sm">({inStage.length})</span></h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {inStage.map((l) => (
                    <div key={l.id} className="bg-surface border border-[var(--line)] rounded-xl p-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{l.company_name}</p>
                          <p className="text-xs text-muted">{[l.contact_name, l.industry, l.country].filter(Boolean).join(' · ')}</p>
                        </div>
                        {l.estimated_value != null && <span className="font-serif text-sm flex-none">{formatMoney(Number(l.estimated_value), 'GBP')}</span>}
                      </div>
                      {l.next_follow_up && <p className="text-xs text-muted mt-2">Follow up: {new Date(l.next_follow_up).toLocaleDateString()}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PlatformShell>
  );
}

function Metric({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`font-serif ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}
