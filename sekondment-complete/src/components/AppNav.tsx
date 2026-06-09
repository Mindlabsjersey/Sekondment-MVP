'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export type NavLink = { href: string; label: string; icon?: string };

// Simple SVG icons for nav items
const Icons: Record<string, React.FC<{ className?: string }>> = {
  dashboard: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  search: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  briefcase: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  message: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  users: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  bookmark: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  ),
  settings: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  chart: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  ),
  shield: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  menu: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
};

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * Redesigned navigation with even spacing, icons, and visual depth.
 * Single line layout for desktop with proper spacing.
 */
export default function AppNav({ links, moreLinks = [] }: { links: NavLink[]; moreLinks?: NavLink[] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Close menus on route change.
  useEffect(() => { setMobileOpen(false); setMoreOpen(false); }, [pathname]);
  // Close more dropdown when clicking outside
  useEffect(() => {
    if (!moreOpen) return;
    const handler = () => setMoreOpen(false);
    document.addEventListener('click', handler, { once: true });
    return () => document.removeEventListener('click', handler);
  }, [moreOpen]);

  const NavItem = ({ link, mobile = false }: { link: NavLink; mobile?: boolean }) => {
    const active = isActive(pathname, link.href);
    const Icon = link.icon && Icons[link.icon] ? Icons[link.icon] : Icons.search;
    
    if (mobile) {
      return (
        <Link
          key={link.href}
          href={link.href}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            active 
              ? 'bg-moss text-white shadow-md' 
              : 'text-ink/70 hover:bg-paper-2 hover:text-ink'
          }`}
        >
          <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-ink/50'}`} />
          {link.label}
        </Link>
      );
    }

    return (
      <Link
        key={link.href}
        href={link.href}
        className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all whitespace-nowrap ${
          active
            ? 'bg-moss text-white shadow-md shadow-moss/20'
            : 'text-ink/60 hover:text-ink hover:bg-paper-2'
        }`}
      >
        <Icon className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-ink/40 group-hover:text-ink/60'}`} />
        <span>{link.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop - Evenly spaced single line with More dropdown */}
      <nav className="hidden lg:flex items-center justify-center flex-1 px-4">
        <div className="flex items-center gap-1 bg-paper-2/50 rounded-2xl p-1.5 border border-[var(--line)]/50">
          {links.map((link) => (
            <NavItem key={link.href} link={link} />
          ))}
          {moreLinks.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMoreOpen((v) => !v); }}
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all whitespace-nowrap ${
                  moreOpen || moreLinks.some(l => isActive(pathname, l.href))
                    ? 'text-ink bg-paper-3 shadow-sm'
                    : 'text-ink/60 hover:text-ink hover:bg-paper-2'
                }`}
              >
                <Icons.menu className="w-4 h-4" />
                <span>More</span>
              </button>
              {moreOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-paper rounded-xl shadow-2xl border border-[var(--line)] z-50 p-2">
                  {moreLinks.map((link) => {
                    const MoreIcon = link.icon && Icons[link.icon] ? Icons[link.icon] : null;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive(pathname, link.href)
                            ? 'bg-moss/10 text-moss'
                            : 'text-ink/70 hover:bg-paper-2 hover:text-ink'
                        }`}
                      >
                        {MoreIcon && <MoreIcon className="w-4 h-4 text-ink/50" />}
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Tablet - Compact with scroll */}
      <nav className="hidden md:flex lg:hidden items-center flex-1 px-4 overflow-x-auto">
        <div className="flex items-center gap-1 bg-paper-2/50 rounded-2xl p-1.5 border border-[var(--line)]/50">
          {links.slice(0, 6).map((link) => (
            <NavItem key={link.href} link={link} />
          ))}
        </div>
      </nav>

      {/* Mobile toggle button */}
      <button
        type="button"
        aria-label="Menu"
        onClick={() => setMobileOpen((v) => !v)}
        className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl bg-paper-2/50 border border-[var(--line)]/50 text-ink/70 hover:text-ink transition-all"
      >
        <Icons.menu className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Menu</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-ink/20 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="lg:hidden fixed top-[72px] left-4 right-4 bg-paper rounded-2xl shadow-2xl border border-[var(--line)] z-50 p-3 animate-in slide-in-from-top-2 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-1">
              {links.map((link) => (
                <NavItem key={link.href} link={link} mobile />
              ))}
              {moreLinks.length > 0 && (
                <>
                  <div className="h-px bg-[var(--line)] my-2" />
                  <p className="px-4 py-1 text-xs font-semibold text-muted uppercase tracking-wide">More</p>
                  {moreLinks.map((link) => (
                    <NavItem key={link.href} link={link} mobile />
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
