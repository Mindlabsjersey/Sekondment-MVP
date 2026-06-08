'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchExpertise } from '../../settings/expertise-actions';
import { addOpportunityRequirement, removeOpportunityRequirement } from '../../settings/expertise-actions';
import { computeMatchesForOpportunity } from '../match-actions';

const IMP_CLS: Record<string, string> = {
  required: 'text-[#a14b3d] bg-[#a14b3d]/10',
  preferred: 'text-[#b8862f] bg-[#b8862f]/12',
  optional: 'text-muted bg-muted/12',
};

export default function RequirementsManager({
  opportunityId, existing,
}: {
  opportunityId: string;
  existing: any[];
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [importance, setImportance] = useState<'required' | 'preferred' | 'optional'>('required');
  const [busy, setBusy] = useState(false);
  const [matchMsg, setMatchMsg] = useState<string | null>(null);

  async function doSearch(v: string) {
    setQ(v);
    if (v.trim().length < 2) { setResults([]); return; }
    setResults(await searchExpertise(v));
  }

  async function add(id: string) {
    setBusy(true);
    await addOpportunityRequirement(opportunityId, id, importance);
    setQ(''); setResults([]); setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    await removeOpportunityRequirement(opportunityId, id);
    setBusy(false);
    router.refresh();
  }

  async function findMatches() {
    setBusy(true); setMatchMsg(null);
    const res = await computeMatchesForOpportunity(opportunityId);
    if (res?.error) setMatchMsg(res.error);
    else setMatchMsg(`Found ${res.matched ?? 0} candidate${res.matched === 1 ? '' : 's'}.`);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card mb-6">
      <h3 className="font-serif text-lg mb-1">Required expertise</h3>
      <p className="text-sm text-muted mb-4">
        Define the expertise this needs. We'll match listed experts by capability — not just job title.
      </p>

      {existing.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {existing.map((r) => (
            <span key={r.expertise_id} className="inline-flex items-center gap-1.5 text-sm border rounded-lg pl-3 pr-2 py-1.5"
              style={{ borderColor: 'var(--line)' }}>
              {r.expertise_taxonomy?.name}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${IMP_CLS[r.importance]}`}>{r.importance}</span>
              <button onClick={() => remove(r.expertise_id)} disabled={busy} className="text-muted hover:text-[#a14b3d] ml-0.5">✕</button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <select value={importance} onChange={(e) => setImportance(e.target.value as any)} className="field text-sm w-36">
          <option value="required">Required</option>
          <option value="preferred">Preferred</option>
          <option value="optional">Optional</option>
        </select>
        <input value={q} onChange={(e) => doSearch(e.target.value)}
          placeholder="Search expertise to require…" className="field text-sm flex-1" />
      </div>

      {results.length > 0 && (
        <div className="border rounded-xl overflow-hidden mb-3" style={{ borderColor: 'var(--line)' }}>
          {results.map((r) => (
            <button key={r.id} onClick={() => add(r.id)} disabled={busy}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-paper-2 border-b last:border-0 flex justify-between"
              style={{ borderColor: 'var(--line)' }}>
              <span>{r.name}</span><span className="text-xs text-muted capitalize">{r.type}</span>
            </button>
          ))}
        </div>
      )}

      {existing.length > 0 && (
        <div className="flex items-center gap-3 pt-2">
          <button onClick={findMatches} disabled={busy} className="btn btn-gold text-sm disabled:opacity-60">
            {busy ? 'Matching…' : '✦ Find matches'}
          </button>
          {matchMsg && <span className="text-sm text-muted">{matchMsg}</span>}
        </div>
      )}
    </div>
  );
}
