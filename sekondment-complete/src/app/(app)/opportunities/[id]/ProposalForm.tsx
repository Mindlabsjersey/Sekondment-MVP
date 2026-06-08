'use client';

import { useState } from 'react';
import { submitProposal } from '../actions';
import { formatMoney } from '@/lib/currency';

const RATE_TYPES = [
  { v: 'fixed', l: 'Fixed price' },
  { v: 'daily', l: 'Day rate' },
  { v: 'hourly', l: 'Hourly' },
  { v: 'retainer', l: 'Retainer' },
];

export default function ProposalForm({
  opportunityId,
  existing,
}: {
  opportunityId: string;
  existing: any;
}) {
  const [open, setOpen] = useState(!existing);
  const [rateType, setRateType] = useState(existing?.rate_type ?? 'fixed');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(!!existing);

  if (submitted) {
    return (
      <div className="bg-moss/5 border border-moss/25 rounded-xl p-6">
        <p className="font-serif text-xl text-moss mb-1">Proposal submitted ✓</p>
        <p className="text-sm text-muted">
          {existing?.status === 'shortlisted'
            ? "You've been shortlisted — the business may reach out soon."
            : existing?.status === 'accepted'
            ? 'Your proposal was accepted.'
            : 'Your proposal is under review.'}
        </p>
      </div>
    );
  }

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set('opportunity_id', opportunityId);
    formData.set('rate_type', rateType);
    const res = await submitProposal(formData);
    if (res?.error) { setError(res.error); setPending(false); }
    else setSubmitted(true);
  }

  return (
    <div className="bg-white border border-[var(--line)] rounded-xl2 p-7 shadow-soft">
      {!open ? (
        <>
          <h3 className="font-serif text-xl mb-2">Interested in this opportunity?</h3>
          <p className="text-muted text-sm mb-5">Submit a proposal with your price, timeline and a cover message.</p>
          <button onClick={() => setOpen(true)} className="btn btn-primary btn-lg">Submit a proposal →</button>
        </>
      ) : (
        <form action={action}>
          <h3 className="font-serif text-xl mb-5">Your proposal</h3>
          <div className="space-y-5">
            <div>
              <label className="label">Engagement type</label>
              <div className="flex gap-2 flex-wrap">
                {RATE_TYPES.map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setRateType(v)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition
                      ${rateType === v ? 'bg-moss text-white border-moss' : 'bg-white border-[var(--line)] text-muted'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  {rateType === 'fixed' ? 'Total price (£)' : rateType === 'daily' ? 'Day rate (£)' : rateType === 'hourly' ? 'Hourly rate (£)' : 'Monthly retainer (£)'}
                </label>
                <input name="price" type="number" min="0" required className="field" placeholder="0" />
              </div>
              <div>
                <label className="label">Timeline</label>
                <input name="timeline" className="field" placeholder="e.g. 4 weeks" />
              </div>
            </div>
            {(rateType === 'daily' || rateType === 'hourly') && (
              <div>
                <label className="label">Estimated {rateType === 'daily' ? 'days' : 'hours'}</label>
                <input name="est_units" type="number" min="0" className="field" placeholder="0" />
              </div>
            )}
            <div>
              <label className="label">Proposed start date</label>
              <input name="proposed_start" type="date" className="field" />
            </div>
            <div>
              <label className="label">Cover message</label>
              <textarea name="cover_message" rows={4} className="field resize-none"
                placeholder="Why you're a strong fit for this opportunity…" />
            </div>
          </div>
          {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg mt-4">{error}</p>}
          <div className="flex gap-3 mt-6">
            <button type="submit" disabled={pending} className="btn btn-primary btn-lg disabled:opacity-60">
              {pending ? 'Submitting…' : 'Send proposal →'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
