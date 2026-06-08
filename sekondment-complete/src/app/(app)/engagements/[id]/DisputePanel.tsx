'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { raiseDispute, respondToDispute } from '../dispute-actions';

export default function DisputePanel({
  engagementId,
  milestones,
  disputes,
  userId,
}: {
  engagementId: string;
  milestones: { id: string; title: string; status: string }[];
  disputes: any[];
  userId: string;
}) {
  const router = useRouter();
  const [raising, setRaising] = useState(false);
  const [milestoneId, setMilestoneId] = useState(milestones[0]?.id ?? '');
  const [reason, setReason] = useState('');
  const [response, setResponse] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Milestones eligible for dispute: funded or submitted (money in escrow).
  const disputable = milestones.filter((m) => ['funded', 'submitted'].includes(m.status));
  const activeDisputes = disputes.filter((d) => ['open', 'under_review'].includes(d.status));

  async function doRaise() {
    setPending(true); setError(null);
    const res = await raiseDispute(engagementId, milestoneId, reason);
    if (res?.error) { setError(res.error); setPending(false); return; }
    setRaising(false); setReason(''); router.refresh(); setPending(false);
  }

  async function doRespond(disputeId: string) {
    setPending(true); setError(null);
    const res = await respondToDispute(disputeId, response[disputeId] ?? '');
    if (res?.error) { setError(res.error); setPending(false); return; }
    router.refresh(); setPending(false);
  }

  const statusLabel: Record<string, { l: string; c: string }> = {
    open: { l: 'Open — awaiting response', c: 'text-[#a14b3d] bg-[#a14b3d]/10' },
    under_review: { l: 'Under admin review', c: 'text-[#b8862f] bg-[#b8862f]/12' },
    resolved_release: { l: 'Resolved — released', c: 'text-moss bg-moss/10' },
    resolved_refund: { l: 'Resolved — refunded', c: 'text-muted bg-muted/10' },
    resolved_split: { l: 'Resolved — split', c: 'text-moss bg-moss/10' },
  };

  return (
    <div className="mt-6 bg-white border border-[var(--line)] rounded-xl2 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg">Disputes</h3>
        {disputable.length > 0 && activeDisputes.length === 0 && !raising && (
          <button onClick={() => setRaising(true)} className="text-sm font-medium text-[#a14b3d] hover:underline">
            Raise a dispute
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      {/* existing disputes */}
      {disputes.length === 0 && !raising && (
        <p className="text-sm text-muted">No disputes. If something goes wrong with a funded milestone, you can raise one here before funds are released.</p>
      )}

      <div className="space-y-3">
        {disputes.map((d) => {
          const sm = statusLabel[d.status] ?? statusLabel.open;
          const iRaised = d.raised_by === userId;
          const canRespond = !iRaised && d.status === 'open';
          const milestone = milestones.find((m) => m.id === d.milestone_id);
          return (
            <div key={d.id} className="border border-[var(--line)] rounded-xl p-4">
              <div className="flex justify-between items-start gap-3 mb-2">
                <span className="text-sm font-medium">{milestone?.title ?? 'Milestone'}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sm.c}`}>{sm.l}</span>
              </div>
              <p className="text-sm text-muted"><span className="font-medium text-ink">Reason:</span> {d.reason}</p>
              {d.expert_response && (
                <p className="text-sm text-muted mt-2"><span className="font-medium text-ink">Response:</span> {d.expert_response}</p>
              )}
              {d.resolution_note && (
                <p className="text-sm text-moss mt-2"><span className="font-medium">Admin:</span> {d.resolution_note}</p>
              )}
              {canRespond && (
                <div className="mt-3">
                  <textarea rows={2} className="field resize-none text-sm"
                    placeholder="Your response to this dispute…"
                    value={response[d.id] ?? ''}
                    onChange={(e) => setResponse((r) => ({ ...r, [d.id]: e.target.value }))} />
                  <button onClick={() => doRespond(d.id)} disabled={pending}
                    className="btn btn-primary text-sm mt-2 disabled:opacity-50">
                    {pending ? 'Sending…' : 'Submit response →'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* raise form */}
      {raising && (
        <div className="mt-3 border border-[#a14b3d]/30 rounded-xl p-4">
          <label className="label">Milestone</label>
          <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} className="field mb-3">
            {disputable.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <label className="label">What's the issue?</label>
          <textarea rows={3} className="field resize-none" value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe what went wrong. An admin will review evidence from both sides." />
          <div className="flex gap-2 mt-3">
            <button onClick={doRaise} disabled={pending || !reason.trim()}
              className="btn btn-primary text-sm disabled:opacity-50">
              {pending ? 'Submitting…' : 'Raise dispute'}
            </button>
            <button onClick={() => { setRaising(false); setError(null); }} className="btn btn-ghost text-sm">Cancel</button>
          </div>
          <p className="text-xs text-muted mt-3">Raising a dispute pauses fund release on that milestone until an admin resolves it.</p>
        </div>
      )}
    </div>
  );
}
