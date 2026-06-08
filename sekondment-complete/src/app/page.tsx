import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* atmosphere */}
      <div className="absolute -top-48 -right-36 w-[540px] h-[540px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(29,78,216,.10),transparent 68%)' }} />

      <nav className="sticky top-0 z-40 backdrop-blur-md bg-paper/80 border-b border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-6 h-[66px] flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="btn btn-ghost">Sign in</Link>
            <Link href="/sign-up" className="btn btn-primary">Get started</Link>
          </div>
        </div>
      </nav>

      <header className="max-w-6xl mx-auto px-6 pt-20 pb-16 relative z-10">
        <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-moss bg-moss/8 px-3.5 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-moss" />
              Trusted expertise marketplace
            </span>
            <h1 className="font-serif font-medium tracking-tight mt-6 leading-[1.03]"
              style={{ fontSize: 'clamp(40px,6vw,70px)' }}>
              Access expertise <em className="not-italic text-moss">on demand.</em>
            </h1>
            <p className="text-xl text-muted max-w-[50ch] mt-6 mb-8 leading-relaxed">
              Engage verified experts, advisors and specialists through secure, milestone-based
              engagements. Deploy expertise — not headcount.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/browse/experts" className="btn btn-primary btn-lg">Browse Expertise →</Link>
              <Link href="/sign-up" className="btn btn-ghost btn-lg">Become an Expert</Link>
            </div>
            <div className="flex gap-7 mt-12 pt-7 border-t border-[var(--line)] flex-wrap">
              <Stat n="Escrow" l="Funds released per milestone" />
              <Stat n="0–100" l="Trust Score on every profile" />
              <Stat n="15%" l="Flat platform fee" />
            </div>
          </div>

          <div className="bg-white border border-[var(--line)] rounded-[20px] p-6 shadow-soft relative">
            <span className="absolute top-6 right-6 text-[10.5px] font-semibold tracking-wider text-moss bg-moss/10 px-2.5 py-1 rounded-md">
              ✓ VERIFIED
            </span>
            <div className="flex gap-3.5 items-center mb-4">
              <div className="w-[54px] h-[54px] rounded-[14px] bg-gradient-to-br from-moss to-moss-2" />
              <div>
                <div className="font-serif font-semibold text-lg">Fractional CMO</div>
                <div className="text-sm text-muted">Available now · Remote</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              {['Growth Strategy', 'B2B SaaS', 'Fractional'].map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-md bg-paper-2 font-medium">{t}</span>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-[var(--line)]">
              <span className="text-sm text-muted">Trust Score</span>
              <div className="flex items-center gap-3">
                <div className="w-[120px] h-[7px] rounded-full bg-paper-2 overflow-hidden">
                  <div className="h-full w-[94%] bg-gradient-to-r from-moss to-sand" />
                </div>
                <span className="font-serif font-semibold text-lg">94</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        <div className="max-w-2xl mb-12">
          <h2 className="font-serif text-4xl tracking-tight">Everything happens <em className="not-italic text-moss">on-platform.</em></h2>
          <p className="text-lg text-muted mt-4">From first message to final payment — verified, protected, milestone-based.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            ['Verified, every time', 'Identity, company and certification checks on both sides, surfaced as a single Trust Score.'],
            ['Milestone escrow', 'Businesses fund work upfront. Funds release only as each milestone is approved.'],
            ['Outcome-first matching', "Tell us what you're trying to achieve. We surface the expertise that delivers it."],
          ].map(([t, d]) => (
            <div key={t} className="card">
              <h3 className="font-serif font-semibold text-xl mb-2">{t}</h3>
              <p className="text-muted text-sm leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--line)] py-10 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center flex-wrap gap-4 text-muted text-sm">
          <Logo />
          <span>© 2026 Sekondment · A trusted business-to-business expertise network · <a href="/terms" className="underline hover:text-ink">Terms</a></span>
        </div>
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-serif font-semibold text-xl">
      <span className="w-[27px] h-[27px] rounded-[7px] bg-moss relative after:content-[''] after:absolute after:top-[7px] after:right-[7px] after:w-2 after:h-2 after:rounded-sm after:bg-sand" />
      Sekondment
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-serif font-semibold text-3xl">{n}</div>
      <div className="text-sm text-muted">{l}</div>
    </div>
  );
}
