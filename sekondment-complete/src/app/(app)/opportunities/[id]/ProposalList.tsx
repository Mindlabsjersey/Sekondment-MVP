'use client';

import { useState } from 'react';
import { updateProposalStatus } from '../actions';
import { acceptProposal } from '../../engagements/actions';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/currency';

export default function ProposalList({
  proposals,
  opportunityId,
}: {
  proposals: any[];
  opportunityId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleShortlist(id: string) {
    setLoading(id + 'sl');
    await updateProposalStatus(id, 'shortlisted');
    router.refresh();
    setLoading(null);
  }

  async function handleReject(id: string) {
    setLoading(id + 'rj');
    await updateProposalStatus(id, 'rejected');
    router.refresh();
    setLoading(null);
  }

  async function handleAccept(id: string) {
    setLoading(id + 'ac');
    setError(null);
    const res = await acceptProposal(id);
    if (res?.error) { setError(res.error); setLoading(null); return; }
    router.push(`/engagements/${res.engagementId}`);
  }

  if (proposals.length === 0) {
    return (
      <div className="bg-white border border-[var(--line)] rounded-xl p-8 text-center">
        <p className="font-serif text-xl text-ink mb-2">No proposals yet</p>
        <p className="text-muted text-sm">Experts will see your opportunity and submit proposals here.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-2xl mb-4">
        Proposals <span className="text-muted font-normal text-lg">({proposals.length})</span>
      </h2>
      {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}
      <div className="grid gap-4">
        {proposals.map((p: any) => {
          const expert = p.expert_profiles;
          const isResource = expert?.employer_partner_id || expert?.employing_business_id;
          const statusMeta: Record<string, { label: string; cls: string }> = {
            submitted: { label: 'Submitted', cls: 'text-[#b8862f] bg-[#b8862f]/12' },
            shortlisted: { label: 'Shortlisted', cls: 'text-moss bg-moss/10' },
            accepted: { label: 'Accepted', cls: 'text-moss bg-moss/10' },
            rejected: { label: 'Rejected', cls: 'text-muted bg-muted/10' },
          };
          const sm = statusMeta[p.status] ?? statusMeta.submitted;

          return (
            <div key={p.id} className="bg-white border border-[var(--line)] rounded-xl p-5">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-moss to-moss-2 text-white flex items-center justify-center font-serif font-semibold text-sm flex-none">
                    {expert?.name?.split(' ').map((n: string) => n[0]).join('') ?? '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{expert?.name}</p>
                    <p className="text-sm text-muted">{expert?.headline}</p>
                    {isResource && (
                      <p className="text-xs text-sand font-semibold mt-0.5">Company Resource</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${sm.cls}`}>{sm.label}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 my-4 p-4 bg-paper rounded-lg text-sm">
                <div>
                  <p className="text-xs text-muted mb-1">Price</p>
                  <p className="font-semibold">
                    {p.price ? formatMoney(p.price) : '—'}
                    {p.rate_type !== 'fixed' && <span className="text-muted font-normal">/{p.rate_type === 'daily' ? 'day' : p.rate_type === 'hourly' ? 'hr' : 'mo'}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Timeline</p>
                  <p className="font-semibold">{p.timeline ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Trust Score</p>
                  <p className="font-semibold">{expert?.trust_score ?? '—'}</p>
                </div>
              </div>

              {p.cover_message && (
                <p className="text-sm text-muted leading-relaxed mb-4">{p.cover_message}</p>
              )}

              {p.status !== 'rejected' && p.status !== 'accepted' && (
                <div className="flex gap-2 justify-end">
                  {p.status !== 'shortlisted' && (
                    <button onClick={() => handleShortlist(p.id)} disabled={!!loading}
                      className="btn btn-ghost text-sm disabled:opacity-50">
                      {loading === p.id + 'sl' ? '…' : 'Shortlist'}
                    </button>
                  )}
                  <button onClick={() => handleReject(p.id)} disabled={!!loading}
                    className="btn btn-ghost text-sm text-red-700 disabled:opacity-50">
                    {loading === p.id + 'rj' ? '…' : 'Decline'}
                  </button>
                  <button onClick={() => handleAccept(p.id)} disabled={!!loading}
                    className="btn btn-primary text-sm disabled:opacity-50">
                    {loading === p.id + 'ac' ? 'Creating engagement…' : 'Accept & engage →'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
