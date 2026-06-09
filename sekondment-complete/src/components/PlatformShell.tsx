import Link from 'next/link';
import { getPlatformRole, canAccess, type PlatformRole } from '@/lib/platform/access';
import { redirect } from 'next/navigation';

const MODULES: { key: string; href: string; label: string }[] = [
  { key: 'executive',   href: '/platform',            label: 'Executive' },
  { key: 'revenue',     href: '/platform/revenue',    label: 'Revenue' },
  { key: 'payments',    href: '/platform/payments',   label: 'Payments' },
  { key: 'revenue',     href: '/platform/commission',  label: 'Commission' },
  { key: 'marketplace', href: '/platform/marketplace',label: 'Marketplace' },
  { key: 'expertise',   href: '/platform/expertise',  label: 'Expertise' },
  { key: 'capacity',    href: '/platform/capacity',   label: 'Capacity' },
  { key: 'geographic',  href: '/platform/geographic', label: 'Geographic' },
  { key: 'compliance',  href: '/platform/compliance', label: 'Compliance' },
  { key: 'trust',       href: '/platform/trust',      label: 'Trust' },
  { key: 'growth',      href: '/platform/growth',     label: 'Growth' },
  { key: 'crm',         href: '/platform/crm',        label: 'CRM' },
  { key: 'marketplace', href: '/platform/delivery',   label: 'Delivery' },
  { key: 'marketplace', href: '/platform/concierge',  label: 'Concierge' },
  { key: 'team',        href: '/platform/team',       label: 'Team' },
  { key: 'audit',       href: '/platform/audit',      label: 'Audit logs' },
  { key: 'audit',       href: '/platform/exports',    label: 'Exports' },
  { key: 'system',      href: '/platform/system',     label: 'System health' },
];

/** Server-side guard + chrome for the Operations Centre. Use at the top of every
 *  /platform page: `const role = await requirePlatform('executive');` */
export async function requirePlatform(moduleKey: string): Promise<PlatformRole> {
  const role = await getPlatformRole();
  if (!role) redirect('/dashboard');         // not internal staff (redirect throws)
  if (!canAccess(role, moduleKey)) redirect('/platform');
  return role as PlatformRole;
}

export default async function PlatformShell({
  active, children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  const role = await getPlatformRole();
  if (!role) redirect('/dashboard');

  const r = role as PlatformRole;
  const visible = MODULES.filter((m) => canAccess(r, m.key));
  const roleLabel = r.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="border-b border-[var(--line)] bg-surface">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/platform" className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-moss relative inline-block">
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-sm bg-sand" />
            </span>
            <span className="font-serif text-lg">Operations Centre</span>
          </Link>
          <span className="text-xs px-2.5 py-1 rounded-full bg-moss/10 text-moss capitalize">{roleLabel}</span>
        </div>
        <nav className="max-w-7xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {visible.map((m) => (
            <Link key={m.key} href={m.href}
              className={`text-sm px-3 py-1.5 rounded-lg whitespace-nowrap ${active === m.key ? 'bg-moss text-white' : 'text-muted hover:bg-paper-2'}`}>
              {m.label}
            </Link>
          ))}
        </nav>
      </div>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
