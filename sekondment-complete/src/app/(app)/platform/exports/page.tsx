import PlatformShell, { requirePlatform } from '@/components/PlatformShell';
import { getPlatformRole, canAccess } from '@/lib/platform/access';

/* Data exports — download Ops Centre data as CSV. Each card only shows if your
   role can access that module. Visible to any platform staff. */
export default async function ExportsDashboard() {
  await requirePlatform('audit'); // any staff with at least one export can reach
  const role = await getPlatformRole();

  const exports = [
    { type: 'revenue', module: 'revenue', title: 'Revenue & ledger', desc: 'Every fund/fee/transfer/refund entry with dates and references.' },
    { type: 'crm', module: 'crm', title: 'CRM pipeline', desc: 'All sales leads with stage, value, contact and follow-up.' },
    { type: 'audit', module: 'audit', title: 'Audit log', desc: 'Every sensitive internal action (up to 5,000 rows).' },
    { type: 'expertise', module: 'expertise', title: 'Expertise intelligence', desc: 'Demand, value, AI-resistance and supply per expertise.' },
  ].filter((e) => canAccess(role, e.module));

  return (
    <PlatformShell active="audit">
      <h1 className="font-serif text-3xl tracking-tight mb-1">Data exports</h1>
      <p className="text-muted mb-6">Download platform data as CSV — open in Excel, Power BI, or any BI tool. Every export is audit-logged.</p>

      {exports.length === 0 ? (
        <div className="card"><p className="text-muted text-sm">No exports available for your role.</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {exports.map((e) => (
            <div key={e.type} className="card flex flex-col">
              <h2 className="font-serif text-lg mb-1">{e.title}</h2>
              <p className="text-muted text-sm mb-4 flex-1">{e.desc}</p>
              <a href={`/api/platform/export?type=${e.type}`}
                className="inline-block bg-moss text-white rounded-lg px-4 py-2 text-sm font-medium text-center"
                download>
                Download CSV
              </a>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted mt-4">CSV is analytics-ready for Power BI, Fabric, Looker, Tableau or Metabase without any schema changes.</p>
    </PlatformShell>
  );
}
