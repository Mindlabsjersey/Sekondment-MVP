'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CATEGORY_LABELS } from '@/lib/types/database';
import type { ExpertCategory } from '@/lib/types/database';
import { formatMoney } from '@/lib/currency';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpertCategory[];
const AVAIL_OPTIONS = [
  { v: 'available_now', l: 'Available now' },
  { v: 'available_from', l: 'Available soon' },
  { v: 'fractional_only', l: 'Fractional only' },
  { v: 'advisory_only', l: 'Advisory only' },
  { v: 'project_only', l: 'Project only' },
];

export default function ExpertFilters({
  current,
}: {
  current: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(current.q ?? '');
  const [minTrust, setMinTrust] = useState(Number(current.min_trust ?? 0));
  const [maxDaily, setMaxDaily] = useState(Number(current.max_daily ?? 1500));
  const [avail, setAvail] = useState(current.avail ?? '');
  const [category, setCategory] = useState(current.category ?? '');
  const [verified, setVerified] = useState(current.verified === '1');
  const [country, setCountry] = useState(current.country ?? '');
  const [remote, setRemote] = useState(current.remote === '1');
  const [onsite, setOnsite] = useState(current.onsite === '1');

  const activeCount = [
    q, current.min_trust, current.max_daily !== '1500' && current.max_daily,
    current.avail, current.category, current.verified === '1',
  ].filter(Boolean).length;

  function apply(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const vals = { q, min_trust: String(minTrust), max_daily: String(maxDaily), avail, category, verified: verified ? '1' : '', country, remote: remote ? '1' : '', onsite: onsite ? '1' : '', ...overrides };
    Object.entries(vals).forEach(([k, v]) => { if (v && v !== '0') params.set(k, v); });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function clear() {
    setQ(''); setMinTrust(0); setMaxDaily(1500); setAvail(''); setCategory(''); setVerified(false);
    startTransition(() => router.push(pathname));
  }

  return (
    <aside className="bg-white border border-[var(--line)] rounded-xl p-5 sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <span className="font-serif font-semibold text-base">Filters</span>
        {activeCount > 0 && (
          <button onClick={clear} className="text-xs font-medium text-moss hover:underline">
            Clear ({activeCount})
          </button>
        )}
      </div>

      {/* keyword */}
      <FilterGroup label="Search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply({ q })}
          placeholder="Name, role, or skill…"
          className="field text-sm"
        />
      </FilterGroup>

      {/* category */}
      <FilterGroup label="Category">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => { const v = category === c ? '' : c; setCategory(v); apply({ category: v }); }}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition font-medium
                ${category === c ? 'bg-moss text-white border-moss' : 'bg-white border-[var(--line)] text-muted hover:text-ink'}`}>
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </FilterGroup>

      {/* availability */}
      <FilterGroup label="Availability">
        <div className="space-y-1">
          {AVAIL_OPTIONS.map(({ v, l }) => (
            <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="avail" checked={avail === v} onChange={() => { setAvail(v); apply({ avail: v }); }}
                className="accent-moss" />
              {l}
            </label>
          ))}
          {avail && (
            <button onClick={() => { setAvail(''); apply({ avail: '' }); }}
              className="text-xs text-muted hover:text-ink mt-1">
              Clear availability
            </button>
          )}
        </div>
      </FilterGroup>

      {/* trust score */}
      <FilterGroup label={`Min Trust Score · ${minTrust}`}>
        <input type="range" min="0" max="100" value={minTrust}
          onChange={(e) => setMinTrust(+e.target.value)}
          onMouseUp={() => apply({ min_trust: String(minTrust) })}
          onTouchEnd={() => apply({ min_trust: String(minTrust) })}
          className="w-full accent-moss" />
        <div className="flex justify-between text-xs text-muted mt-1"><span>0</span><span>100</span></div>
      </FilterGroup>

      {/* max daily rate */}
      <FilterGroup label={`Max day rate · ${formatMoney(maxDaily)}`}>
        <input type="range" min="200" max="1500" step="50" value={maxDaily}
          onChange={(e) => setMaxDaily(+e.target.value)}
          onMouseUp={() => apply({ max_daily: String(maxDaily) })}
          onTouchEnd={() => apply({ max_daily: String(maxDaily) })}
          className="w-full accent-moss" />
        <div className="flex justify-between text-xs text-muted mt-1"><span>{formatMoney(200)}</span><span>{formatMoney(1500)}</span></div>
      </FilterGroup>

      {/* verified */}
      <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
        <input type="checkbox" checked={verified}
          onChange={(e) => { setVerified(e.target.checked); apply({ verified: e.target.checked ? '1' : '' }); }}
          className="accent-moss w-4 h-4" />
        Verified experts only
      </label>

      {/* work mode */}
      <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
        <input type="checkbox" checked={remote}
          onChange={(e) => { setRemote(e.target.checked); apply({ remote: e.target.checked ? '1' : '' }); }}
          className="accent-moss w-4 h-4" />
        Available remotely
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
        <input type="checkbox" checked={onsite}
          onChange={(e) => { setOnsite(e.target.checked); apply({ onsite: e.target.checked ? '1' : '' }); }}
          className="accent-moss w-4 h-4" />
        Available on-site
      </label>

      {/* country */}
      <div className="mt-4">
        <label className="label text-xs">Country</label>
        <input value={country} onChange={(e) => setCountry(e.target.value)}
          onBlur={() => apply({ country })}
          onKeyDown={(e) => { if (e.key === 'Enter') apply({ country }); }}
          placeholder="e.g. Jersey, UK" className="field text-sm" />
      </div>

      {isPending && (
        <p className="text-xs text-muted text-center mt-4 animate-pulse">Updating…</p>
      )}
    </aside>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 pb-5 border-b border-[var(--line)]">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">{label}</p>
      {children}
    </div>
  );
}
