import Link from 'next/link';
import { signOut } from '@/app/(auth)/actions';
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import AppNav from '@/components/AppNav';
import { createClient } from '@/lib/supabase/server';
import { getPlatformRole } from '@/lib/platform/access';
import type { AccountType } from '@/lib/types/database';

const NAV: Record<'business' | 'expert' | 'admin', { href: string; label: string; icon: string }[]> = {
  business: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/experts', label: 'Find Experts', icon: 'search' },
    { href: '/opportunities', label: 'Opportunities', icon: 'briefcase' },
    { href: '/engagements', label: 'Engagements', icon: 'chart' },
    { href: '/messages', label: 'Messages', icon: 'message' },
    { href: '/employees', label: 'Team', icon: 'users' },
    { href: '/teams', label: 'Find a Team', icon: 'users' },
    { href: '/saved', label: 'Saved', icon: 'bookmark' },
    { href: '/capacity', label: 'Capacity', icon: 'chart' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ],
  expert: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/opportunities', label: 'Find Work', icon: 'briefcase' },
    { href: '/saved', label: 'Saved', icon: 'bookmark' },
    { href: '/engagements', label: 'Engagements', icon: 'chart' },
    { href: '/messages', label: 'Messages', icon: 'message' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ],
  admin: [
    { href: '/admin/disputes', label: 'Disputes', icon: 'shield' },
    { href: '/admin/verification', label: 'Verification', icon: 'shield' },
    { href: '/admin/flagged', label: 'Flagged', icon: 'shield' },
    { href: '/admin/ledger', label: 'Ledger', icon: 'chart' },
    { href: '/admin/users', label: 'Users', icon: 'users' },
    { href: '/admin/compliance', label: 'Compliance', icon: 'shield' },
    { href: '/admin/activity', label: 'Activity', icon: 'chart' },
    { href: '/admin/expertise', label: 'Expertise', icon: 'search' },
    { href: '/admin/analytics', label: 'Analytics', icon: 'chart' },
  ],
};

export default async function AppShell({
  accountType,
  children,
}: {
  accountType: AccountType;
  children: React.ReactNode;
}) {
  // Normalize legacy employer_partner -> business (retirement path)
  const effectiveType: 'business' | 'expert' | 'admin' =
    accountType === 'employer_partner' ? 'business' : (accountType as any) ?? 'expert';
  const links = NAV[effectiveType] ?? NAV.expert;

  // Batch all data loads to minimize round-trips.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let notifs: any[] = [];
  let profile: { name: string; imageUrl: string | null } | null = null;
  let platformRole: Awaited<ReturnType<typeof getPlatformRole>> = null;

  if (user) {
    const accountId = user.id;
    const [nRes, pRes, roleRes] = await Promise.all([
      supabase.from('notifications')
        .select('id, type, title, body, link, read_at, created_at')
        .eq('account_id', accountId).order('created_at', { ascending: false }).limit(20),
      effectiveType === 'business'
        ? supabase.from('business_profiles').select('company_name, logo_url').eq('account_id', accountId).maybeSingle()
        : supabase.from('expert_profiles').select('name, photo_url').eq('account_id', accountId).maybeSingle(),
      getPlatformRole(),
    ]);
    notifs = nRes.data ?? [];
    platformRole = roleRes;
    if (pRes.data) {
      const p = pRes.data as any;
      profile = { name: p.company_name ?? p.name, imageUrl: p.logo_url ?? p.photo_url ?? null };
    }
  }
  const initials = (profile?.name || 'S').trim().slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen relative z-10">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-paper/90 border-b border-[var(--line)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[68px] flex items-center gap-4">
          {/* Logo - Left */}
          <Link href="/dashboard" className="flex items-center gap-2.5 font-serif font-semibold text-lg flex-shrink-0 hover:opacity-80 transition">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-moss to-moss/70 relative shadow-sm">
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-md bg-sand" />
            </span>
            <span className="hidden sm:block">Sekondment</span>
          </Link>

          {/* Centered Navigation */}
          <AppNav links={links} />

          {/* Right Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {platformRole && (
              <Link href="/platform"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-ink to-ink/90 text-paper hover:shadow-lg hover:shadow-ink/20 transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                Ops
              </Link>
            )}
            {user && <NotificationBell userId={user.id} initial={notifs} />}
            <ThemeToggle />
            {profile && (
              <Link href="/settings" title={profile.name}
                className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full bg-paper-2/50 border border-[var(--line)]/50 hover:bg-paper-2 hover:border-[var(--line)] hover:shadow-sm transition-all">
                {profile.imageUrl ? (
                  <img src={profile.imageUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-moss/20 to-moss/5 text-moss text-xs font-bold flex items-center justify-center">{initials}</span>
                )}
                <span className="hidden xl:block text-sm font-medium text-ink/80 max-w-[100px] truncate">{profile.name}</span>
              </Link>
            )}
            <form action={signOut} className="hidden sm:block">
              <button className="text-sm font-medium text-muted hover:text-ink px-2 py-1 rounded-lg hover:bg-paper-2 transition-all">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
