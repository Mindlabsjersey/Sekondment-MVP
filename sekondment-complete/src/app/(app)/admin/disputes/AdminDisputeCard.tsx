'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveDispute } from '../../engagements/dispute-actions';

export default function AdminDisputeCard({ dispute: d }: { dispute: any }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(outcome: 'release' | 'refund' | 'split') {
    setPending(outcome); setError(null);
    const res = await resolveDispute(d.id, outcome, note);
    if (res?.error) { setError(res.error); setPending(null); return; }
    router.refresh();
  }

  const amount = (d.milestones?.amount ?? 0);
  const currency = d.engagements?.currency ?? 'GBP';
  const sym = currency === 'GBP' ? '£' : '';

  return (
    <div className="bg-white border border-[var(--line)] rounded-xl2 p-6 shadow-soft">
      <div className="flex justify-between items-start gap-4 mb-4">
        <div>
          <p className="font-serif text-lg">{d.engagements?.title}</p>
          <p className="text-sm text-muted mt-0.5">
            Milestone: {d.milestones?.title} · {sym}{Number(amount).toLocaleString()}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
          d.status === 'open' ? 'text-[#a14b3d] bg-[#a14b3d]/10' : 'text-[#b8862f] bg-[#b8862f]/12'
        }`}>
          {d.status === 'open' ? 'Open' : 'Under review'}
        </span>
      </div>

      <div className="space-y-3 mb-5">
        <div className="bg-paper rounded-lg p-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            Raised by {d.accounts?.account_type === 'business' ? 'business' : 'expert'}
          </p>
          <p className="text-sm">{d.reason}</p>
        </div>
        {d.expert_response ? (
          <div className="bg-paper rounded-lg p-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Response</p>
            <p className="text-sm">{d.expert_response}</p>
          </div>
        ) : (
          <p className="text-sm text-muted italic">No response from the other party yet.</p>
        )}
      </div>

      <label className="label">Resolution note</label>
      <textarea rows={2} className="field resize-none mb-4" value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Explain the decision (visible to both parties)…" />

      {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => resolve('release')} disabled={!!pending}
          className="btn btn-primary text-sm disabled:opacity-50">
          {pending === 'release' ? '…' : 'Release to payee'}
        </button>
        <button onClick={() => resolve('split')} disabled={!!pending}
          className="btn btn-ghost text-sm disabled:opacity-50">
          {pending === 'split' ? '…' : 'Release w/ split'}
        </button>
        <button onClick={() => resolve('refund')} disabled={!!pending}
          className="btn btn-ghost text-sm text-[#a14b3d] disabled:opacity-50">
          {pending === 'refund' ? '…' : 'Refund business'}
        </button>
      </div>
    </div>
  );
}
