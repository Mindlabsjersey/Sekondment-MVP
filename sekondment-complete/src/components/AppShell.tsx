import Link from 'next/link';
import { signOut } from '@/app/(auth)/actions';
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import AppNav from '@/components/AppNav';
import { createClient } from '@/lib/supabase/server';
import { getPlatformRole } from '@/lib/platform/access';
import type { AccountType } from '@/lib/types/database';

const NAV: Record<'business' | 'expert' | 'employer_partner' | 'admin', { href: string; label: string }[]> = {
  business: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/experts', label: 'Find Experts' },
    { href: '/opportunities', label: 'Opportunities' },
    { href: '/engagements', label: 'Engagements' },
    { href: '/messages', label: 'Messages' },
    { href: '/employees', label: 'Team' },
    { href: '/teams', label: 'Find a Team' },
    { href: '/saved', label: 'Saved' },
    { href: '/capacity', label: 'Capacity' },
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
  let profile: { name: string; imageUrl: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, read_at, created_at')
      .eq('account_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    notifs = data ?? [];

    // Profile chip (logo/photo + name) shown in the nav.
    if (accountType === 'business') {
      const { data: p } = await supabase.from('business_profiles')
        .select('company_name, logo_url').eq('account_id', user.id).maybeSingle();
      if (p) profile = { name: p.company_name, imageUrl: p.logo_url };
    } else if (accountType === 'employer_partner') {
      const { data: p } = await supabase.from('employer_partners')
        .select('company_name, logo_url').eq('account_id', user.id).maybeSingle();
      if (p) profile = { name: p.company_name, imageUrl: p.logo_url };
    } else {
      const { data: p } = await supabase.from('expert_profiles')
        .select('name, photo_url').eq('account_id', user.id).maybeSingle();
      if (p) profile = { name: p.name, imageUrl: p.photo_url };
    }
  }
  const initials = (profile?.name || 'S').trim().slice(0, 1).toUpperCase();

  // Internal staff get a link into the Operations Centre (separate from the
  // marketplace account-type nav). Safe: returns null for non-staff.
  const platformRole = user ? await getPlatformRole() : null;

  return (
    <div className="min-h-screen relative z-10">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-paper/80 border-b border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-serif font-semibold text-lg">
              <span className="w-6 h-6 rounded-md bg-moss relative after:content-[''] after:absolute after:top-1.5 after:right-1.5 after:w-2 after:h-2 after:rounded-sm after:bg-sand" />
              Sekondment
            </Link>
            <AppNav links={links} />
          </div>
          <div className="flex items-center gap-2.5">
            {platformRole && (
              <Link href="/platform"
                className="hidden sm:inline-block px-3 py-1.5 rounded-lg text-sm font-medium bg-ink text-paper hover:opacity-90 transition">
                Ops Centre
              </Link>
            )}
            {user && <NotificationBell userId={user.id} initial={notifs} />}
            <ThemeToggle />
            {profile && (
              <Link href="/settings" title={profile.name}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border hover:bg-paper-2 transition"
                style={{ borderColor: 'var(--line)' }}>
                {profile.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-moss/15 text-moss text-xs font-semibold flex items-center justify-center">{initials}</span>
                )}
                <span className="hidden lg:block text-sm font-medium text-ink/80 max-w-[120px] truncate">{profile.name}</span>
              </Link>
            )}
            <form action={signOut}>
              <button className="text-sm font-medium text-muted hover:text-ink transition">Sign out</button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
