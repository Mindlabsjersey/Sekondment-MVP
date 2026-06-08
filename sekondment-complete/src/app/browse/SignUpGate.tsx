import Link from 'next/link';

/** Shown after the teaser cap to convert logged-out browsers into sign-ups. */
export default function SignUpGate({
  remaining,
  noun,
}: {
  remaining: number;
  noun: string;
}) {
  return (
    <div className="relative mt-4">
      {/* fade-out hint above */}
      <div className="absolute -top-24 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-paper pointer-events-none" />
      <div className="bg-[#1e3a8a] text-[#f6f3ec] rounded-xl2 p-8 text-center relative overflow-hidden">
        <div className="absolute right-[-50px] top-[-50px] w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(201,168,106,.28),transparent 70%)' }} />
        <div className="relative">
          <h3 className="font-serif text-2xl mb-2">
            {remaining > 0 ? `${remaining}+ more ${noun} await` : `See every ${noun.replace(/s$/, '')}`}
          </h3>
          <p className="text-[rgba(246,243,236,.75)] max-w-md mx-auto mb-6 leading-relaxed">
            Create a free account to see full profiles, filter by availability and budget, and engage
            through secure, milestone-based work.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/sign-up" className="btn btn-lg bg-paper text-ink hover:bg-white">Create free account →</Link>
            <Link href="/sign-in" className="btn btn-lg border border-[rgba(246,243,236,.3)] text-paper hover:bg-white/10">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
