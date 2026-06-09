'use client';

import { useState } from 'react';
import { requestConcierge } from './concierge-actions';

/* "Find talent for me" — the cold-start reassurance for businesses.
   Drop this on the dashboard or an opportunity with no proposals yet. */
export function ConciergeButton({ opportunityId, brief: initialBrief }: { opportunityId?: string; brief?: string }) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState(initialBrief ?? '');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setBusy(true); setErr(null);
    const r = await requestConcierge({ brief, opportunityId });
    setBusy(false);
    if (r.ok) setDone(true); else setErr(r.error ?? 'Something went wrong.');
  }

  if (done) return (
    <div className="card" style={{ borderColor: 'var(--c-gold)' }}>
      <p className="font-medium">✓ We're on it.</p>
      <p className="text-sm text-muted mt-1">Our team will source matching experts and get back to you within 24 hours.</p>
    </div>
  );

  if (!open) return (
    <button onClick={() => setOpen(true)} className="card w-full text-left hover:border-[var(--c-gold)]" style={{ borderColor: 'var(--c-gold)' }}>
      <span className="font-medium">✦ Want us to find the experts for you?</span>
      <span className="block text-sm text-muted mt-1">Tell us what you need and our team will surface verified experts within 24 hours — no searching required.</span>
    </button>
  );

  return (
    <div className="card" style={{ borderColor: 'var(--c-gold)' }}>
      <h3 className="font-serif text-lg mb-1">Find talent for me</h3>
      <p className="text-sm text-muted mb-3">Describe what you need. Our team sources matching verified experts and responds within 24 hours.</p>
      <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3}
        placeholder="e.g. We need an AML specialist for a 4-week onboarding review, remote, start within 2 weeks."
        className="w-full border border-[var(--line)] rounded-lg p-3 text-sm" />
      {err && <p className="text-sm text-[#a14b3d] mt-2">{err}</p>}
      <div className="flex gap-2 mt-3">
        <button onClick={send} disabled={busy} className="bg-moss text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">{busy ? 'Sending…' : 'Request experts'}</button>
        <button onClick={() => setOpen(false)} className="border border-[var(--line)] rounded-lg px-4 py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}
