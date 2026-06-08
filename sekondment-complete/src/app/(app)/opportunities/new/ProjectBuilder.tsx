'use client';

import { useState } from 'react';
import { buildProjectSuggestion } from './project-builder-action';

export default function ProjectBuilder({ onApply }: { onApply?: (s: any) => void }) {
  const [need, setNeed] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);

  async function build() {
    if (need.trim().length < 8) return;
    setBusy(true);
    const s = await buildProjectSuggestion(need);
    setSuggestion(s);
    setBusy(false);
  }

  return (
    <div className="card mb-6" style={{ borderColor: 'var(--c-gold)' }}>
      <h3 className="font-serif text-lg mb-1">✦ Describe your need</h3>
      <p className="text-sm text-muted mb-3">
        Write what you need in plain language — we'll suggest a structured project you can refine.
      </p>
      <textarea value={need} onChange={(e) => setNeed(e.target.value)} rows={2}
        className="field resize-none mb-2"
        placeholder="e.g. We need someone to lead an ISO27001 implementation over the next quarter" />
      <button onClick={build} disabled={busy} className="btn btn-gold text-sm disabled:opacity-60">
        {busy ? 'Building…' : 'Suggest a project'}
      </button>

      {suggestion && (
        <div className="mt-4 pt-4 border-t space-y-3 text-sm" style={{ borderColor: 'var(--line)' }}>
          <div><span className="text-muted text-xs uppercase tracking-wide">Title</span><p className="font-medium">{suggestion.title}</p></div>
          <div><span className="text-muted text-xs uppercase tracking-wide">Scope</span><p>{suggestion.scope}</p></div>
          {suggestion.requiredExpertise.length > 0 && (
            <div>
              <span className="text-muted text-xs uppercase tracking-wide">Suggested expertise</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {suggestion.requiredExpertise.map((e: any) => (
                  <span key={e.id} className="text-xs px-2.5 py-1 rounded-md bg-moss/8 text-moss font-medium">{e.name}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <span className="text-muted text-xs uppercase tracking-wide">Suggested milestones</span>
            <ol className="list-decimal list-inside mt-1">
              {suggestion.suggestedMilestones.map((m: string, i: number) => <li key={i}>{m}</li>)}
            </ol>
          </div>
          <div className="flex gap-6">
            <div><span className="text-muted text-xs uppercase tracking-wide">Est. hours</span><p className="font-medium">{suggestion.estimatedHours}h</p></div>
            <div><span className="text-muted text-xs uppercase tracking-wide">Budget range</span><p className="font-medium">£{suggestion.suggestedBudget.low.toLocaleString()}–£{suggestion.suggestedBudget.high.toLocaleString()}</p></div>
          </div>
          {onApply && (
            <button onClick={() => onApply(suggestion)} className="btn btn-primary text-sm">Use these suggestions →</button>
          )}
          <p className="text-xs text-muted">Suggestions are a starting point — edit anything below before posting.</p>
        </div>
      )}
    </div>
  );
}
