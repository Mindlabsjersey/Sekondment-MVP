'use client';

import { useState } from 'react';
import { searchTeams, type TeamResult } from './team-search-actions';

export function TeamSearchClient({ initial }: { initial: TeamResult[] }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<TeamResult[]>(initial);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResults(await searchTeams(q));
    setLoading(false);
  }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
          placeholder="e.g. AML, Stripe Connect, ISO27001…"
          className="flex-1 border border-[var(--line)] rounded-lg px-3 py-2.5 text-sm"
        />
        <button onClick={run} disabled={loading} className="bg-moss text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {results.length === 0 ? (
        <div className="bg-surface border border-[var(--line)] rounded-xl p-6 text-center">
          <p className="text-muted text-sm">No teams found{q ? ` for “${q}”` : ' yet'}. Businesses with approved employees appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((t) => (
            <div key={t.businessId} className="bg-surface border border-[var(--line)] rounded-xl p-4">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="min-w-0 flex items-center gap-2">
                  {t.logoUrl ? (
                    <img src={t.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-none" />
                  ) : (
                    <span className="w-8 h-8 rounded-lg bg-moss/15 text-moss text-xs font-semibold flex items-center justify-center flex-none">
                      {t.company.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="font-medium">{t.company}</p>
                    <p className="text-xs text-muted">{[t.industry, `${t.memberCount} ${t.memberCount === 1 ? 'person' : 'people'}`].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                {t.matchedCount > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded flex-none" style={{ background: 'rgba(29,78,216,.1)', color: '#1d4ed8' }}>
                    {t.matchedCount} match{t.matchedCount > 1 ? 'es' : ''}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {t.expertise.slice(0, 12).map((x) => (
                  <span key={x.name} className="text-xs px-2 py-1 rounded border"
                    style={{ borderColor: (x.level === 'proven' ? '#c8a24a' : x.level === 'verified' ? '#2f8f6b' : 'var(--line)'), color: x.level === 'proven' ? '#c8a24a' : x.level === 'verified' ? '#2f8f6b' : 'var(--muted)' }}>
                    {x.name}
                  </span>
                ))}
                {t.expertise.length > 12 && <span className="text-xs text-muted py-1">+{t.expertise.length - 12} more</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
