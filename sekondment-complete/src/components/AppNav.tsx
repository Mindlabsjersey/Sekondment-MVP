'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export type NavLink = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * Primary app navigation. Desktop shows links inline; when there are many
 * (e.g. the Business menu) the overflow collapses into a "More" dropdown.
 * Mobile collapses everything into a slide-down menu.
 */
export default function AppNav({ links, primaryCount = 6 }: { links: NavLink[]; primaryCount?: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close menus on route change.
  useEffect(() => { setMoreOpen(false); setMobileOpen(false); }, [pathname]);

  // Close the "More" dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const primary = links.slice(0, primaryCount);
  const overflow = links.slice(primaryCount);

  const linkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-[14px] font-medium transition ${
      active ? 'bg-moss/10 text-moss' : 'text-ink/70 hover:text-ink hover:bg-paper-2'
    }`;

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-1">
        {primary.map((l) => (
          <Link key={l.href} href={l.href} className={linkClass(isActive(pathname, l.href))}>
            {l.label}
          </Link>
        ))}

        {overflow.length > 0 && (
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={linkClass(overflow.some((l) => isActive(pathname, l.href)))}
            >
              More ▾
            </button>
            {moreOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-paper border border-[var(--line)] rounded-xl shadow-soft p-1.5 z-50">
                {overflow.map((l) => (
                  <Link key={l.href} href={l.href}
                    className={`block px-3 py-2 rounded-lg text-sm transition ${
                      isActive(pathname, l.href) ? 'bg-moss/10 text-moss' : 'text-ink/80 hover:bg-paper-2'
                    }`}>
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile toggle */}
      <button
        type="button"
        aria-label="Menu"
        onClick={() => setMobileOpen((v) => !v)}
        className="md:hidden w-9 h-9 rounded-xl border flex flex-col items-center justify-center gap-[3px]"
        style={{ borderColor: 'var(--line)' }}
      >
        <span className="w-4 h-px bg-ink" />
        <span className="w-4 h-px bg-ink" />
        <span className="w-4 h-px bg-ink" />
      </button>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="md:hidden absolute left-0 right-0 top-[64px] bg-paper border-b border-[var(--line)] shadow-soft z-50">
          <div className="max-w-6xl mx-auto px-6 py-3 grid grid-cols-2 gap-1.5">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive(pathname, l.href) ? 'bg-moss/10 text-moss' : 'text-ink/80 hover:bg-paper-2'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
