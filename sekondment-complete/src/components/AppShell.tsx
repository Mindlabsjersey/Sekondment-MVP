import Link from 'next/link';
import { signOut } from '@/app/(auth)/actions';
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import { createClient } from '@/lib/supabase/server';
import type { AccountType } from '@/lib/types/database';

const NAV: Record<'business' | 'expert' | 'employer_partner' | 'admin', { href: string; label: string }[]> = {
  business: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/experts', label: 'Find Experts' },
    { href: '/saved', label: 'Saved' },
    { href: '/capacity', label: 'Capacity' },
    { href: '/opportunities', label: 'Opportunities' },
    { href: '/engagements', label: 'Engagements' },
    { href: '/messages', label: 'Messages' },
    { href: '/settings', label: 'Settings' },
  ],
  expert: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/opportunities', label: 'Find Work' },
    { href: '/saved', label: 'Saved' },
    { href: '/engagements', label: 'Engagements' },
    { href: '/messages', label: 'Messages' },
    { href: '/settings', label: 'Settings' },
  ],
  employer_partner: [
    { href: '/partner', label: 'Dashboard' },
    { href: '/settings', label: 'Settings' },
  ],
  admin: [
    { href: '/admin/disputes', label: 'Disputes' },
    { href: '/admin/verification', label: 'Verification' },
    { href: '/admin/flagged', label: 'Flagged' },
    { href: '/admin/ledger', label: 'Ledger' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/compliance', label: 'Compliance' },
    { href: '/admin/activity', label: 'Activity' },
    { href: '/admin/expertise', label: 'Expertise' },
    { href: '/admin/analytics', label: 'Analytics' },
  ],
};

export default async function AppShell({
  accountType,
  children,
}: {
  accountType: AccountType;
  children: React.ReactNode;
}) {
  const links = NAV[accountType] ?? NAV.expert;

  // Load the bell's notifications for the signed-in user.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let notifs: any[] = [];
  if (user) {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, read_at, created_at')
      .eq('account_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    notifs = data ?? [];
  }

  return (
    <div className="min-h-screen relative z-10">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-paper/80 border-b border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-9">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-serif font-semibold text-lg">
              <span className="w-6 h-6 rounded-md bg-moss relative after:content-[''] after:absolute after:top-1.5 after:right-1.5 after:w-2 after:h-2 after:rounded-sm after:bg-sand" />
              Sekondment
            </Link>
            <div className="hidden md:flex gap-7">
              {links.map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-[15px] font-medium text-ink/75 hover:text-ink transition">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && <NotificationBell userId={user.id} initial={notifs} />}
            <ThemeToggle />
            <form action={signOut}>
              <button className="text-[15px] font-medium text-muted hover:text-ink transition">Sign out</button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
