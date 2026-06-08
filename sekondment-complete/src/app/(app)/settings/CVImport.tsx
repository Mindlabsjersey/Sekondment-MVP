'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractExpertiseFromText } from './cv-extract-actions';
import { addProfileExpertise } from './expertise-actions';

export default function CVImport() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [yearsHint, setYearsHint] = useState<number | null>(null);
  const [extras, setExtras] = useState<{ seniority?: string | null; jurisdictions?: string[]; languages?: string[] }>({});
  const [scanned, setScanned] = useState(false);

  async function scan() {
    if (text.trim().length < 20) return;
    setBusy(true);
    const res = await extractExpertiseFromText(text);
    setSuggestions(res.suggestions);
    setYearsHint(res.yearsHint);
    setExtras({ seniority: res.seniority, jurisdictions: res.jurisdictions, languages: res.languages });
    setScanned(true);
    setBusy(false);
  }

  async function add(id: string) {
    setBusy(true);
    await addProfileExpertise(id, 3, yearsHint ?? undefined);
    setAdded(new Set([...added, id]));
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card max-w-2xl mt-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg">Import from CV / LinkedIn</h3>
        <button onClick={() => setOpen((o) => !o)} className="btn btn-ghost text-sm">
          {open ? 'Close' : 'Paste text'}
        </button>
      </div>
      <p className="text-sm text-muted mt-1">
        Paste your CV or LinkedIn summary — we'll suggest structured expertise tags you can add in one tap.
        We store structured expertise, not raw CV text.
      </p>

      {open && (
        <div className="mt-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
            className="field resize-none text-sm" placeholder="Paste CV or profile text here…" />
          <button onClick={scan} disabled={busy || text.trim().length < 20} className="btn btn-primary text-sm mt-2 disabled:opacity-60">
            {busy ? 'Scanning…' : 'Suggest expertise'}
          </button>

          {scanned && (
            <div className="mt-4">
              {yearsHint && <p className="text-xs text-muted mb-2">Detected ~{yearsHint} years experience — applied to added tags.</p>}
              {(extras.seniority || (extras.jurisdictions?.length ?? 0) > 0 || (extras.languages?.length ?? 0) > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
                  {extras.seniority && <span className="px-2 py-0.5 rounded bg-paper-2">Seniority: {extras.seniority}</span>}
                  {extras.jurisdictions?.map((j) => <span key={j} className="px-2 py-0.5 rounded bg-paper-2">📍 {j}</span>)}
                  {extras.languages?.map((l) => <span key={l} className="px-2 py-0.5 rounded bg-paper-2">🗣 {l}</span>)}
                </div>
              )}
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted">No expertise matched. Try the manual search above.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s.id} onClick={() => add(s.id)} disabled={busy || added.has(s.id)}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition ${added.has(s.id) ? 'bg-moss/10 text-moss border-moss/30' : 'bg-paper-2 border-[var(--line)] hover:border-moss'}`}>
                      {added.has(s.id) ? '✓ ' : '+ '}{s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
