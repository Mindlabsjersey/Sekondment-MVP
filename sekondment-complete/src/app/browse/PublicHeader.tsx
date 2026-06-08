import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

/** Public top bar for logged-out browse pages. No app nav, just brand + auth CTAs. */
export default function PublicHeader() {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-paper/80 border-b border-[var(--line)]">
      <div className="max-w-6xl mx-auto px-6 h-[64px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-serif font-semibold text-lg">
          <span className="w-6 h-6 rounded-md bg-moss relative after:content-[''] after:absolute after:top-1.5 after:right-1.5 after:w-2 after:h-2 after:rounded-sm after:bg-sand" />
          Sekondment
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/browse/experts" className="text-sm font-medium text-ink/75 hover:text-ink hidden sm:inline">Experts</Link>
          <Link href="/browse/opportunities" className="text-sm font-medium text-ink/75 hover:text-ink hidden sm:inline">Opportunities</Link>
          <ThemeToggle />
          <Link href="/sign-in" className="btn btn-ghost">Sign in</Link>
          <Link href="/sign-up" className="btn btn-primary">Get started</Link>
        </div>
      </div>
    </nav>
  );
}
