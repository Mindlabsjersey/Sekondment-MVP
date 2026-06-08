'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchExpertise, addProfileExpertise, removeProfileExpertise } from './expertise-actions';

type Tag = { id: string; name: string; type: string; verification_level?: string; declared_level?: number };

const VERIF_CLS: Record<string, string> = {
  declared: 'text-muted bg-muted/12',
  verified: 'text-moss bg-moss/10',
  proven: 'text-sand bg-sand/10',
};

export default function ExpertisePicker({ existing }: { existing: Tag[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  async function doSearch(v: string) {
    setQ(v);
    if (v.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const r = await searchExpertise(v);
    setResults(r);
    setSearching(false);
  }

  async function add(id: string) {
    setBusy(true);
    await addProfileExpertise(id);
    setQ(''); setResults([]); setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    await removeProfileExpertise(id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card max-w-2xl mt-6">
      <h3 className="font-serif text-lg mb-1">Your expertise</h3>
      <p className="text-sm text-muted mb-4">
        Add structured expertise so businesses can find you by capability — not just job title.
        Expertise starts as <em>declared</em>; it becomes <em>verified</em> or <em>proven</em> through
        evidence and completed engagements.
      </p>

      {existing.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {existing.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 text-sm border rounded-lg pl-3 pr-2 py-1.5"
              style={{ borderColor: 'var(--line)' }}>
              {t.name}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${VERIF_CLS[t.verification_level ?? 'declared']}`}>
                {t.verification_level ?? 'declared'}
              </span>
              <button onClick={() => remove(t.id)} disabled={busy}
                className="text-muted hover:text-[#a14b3d] ml-0.5">✕</button>
            </span>
          ))}
        </div>
      )}

      <input value={q} onChange={(e) => doSearch(e.target.value)}
        placeholder="Search expertise — e.g. Stripe Connect, ISO27001, trust admin…"
        className="field text-sm" />

      {searching && <p className="text-xs text-muted mt-2">Searching…</p>}
      {results.length > 0 && (
        <div className="mt-2 border rounded-xl overflow-hidden" style={{ borderColor: 'var(--line)' }}>
          {results.map((r) => (
            <button key={r.id} onClick={() => add(r.id)} disabled={busy}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-paper-2 border-b last:border-0 flex items-center justify-between"
              style={{ borderColor: 'var(--line)' }}>
              <span>{r.name}</span>
              <span className="text-xs text-muted capitalize">{r.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
