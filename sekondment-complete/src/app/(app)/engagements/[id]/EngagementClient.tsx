'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReviewForm from './ReviewForm';
import DisputePanel from './DisputePanel';
import Board from './Board';
import { formatMoney } from '@/lib/currency';
import DeliverableUpload from './DeliverableUpload';
import EngagementAgreement from './EngagementAgreement';

type Milestone = {
  id: string; sort_order: number; title: string;
  amount: number; status: string;
};
type LedgerEntry = {
  id: string; entry_type: string; amount: number; currency: string;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Not funded', color: '#5a6b63', bg: 'rgba(90,107,99,.1)' },
  funded: { label: 'In escrow', color: '#b8862f', bg: 'rgba(184,134,47,.12)' },
  submitted: { label: 'Awaiting approval', color: '#b8862f', bg: 'rgba(184,134,47,.12)' },
  released: { label: 'Released', color: '#1d4ed8', bg: 'rgba(29,78,216,.1)' },
  disputed: { label: 'Disputed', color: '#a14b3d', bg: 'rgba(161,75,61,.1)' },
};

const LEDGER_COLORS: Record<string, string> = {
  fund: '#b8862f',
  fee: '#5a6b63',
  transfer_expert: '#1d4ed8',
  transfer_business: '#1d4ed8',
};

export default function EngagementClient({
  engagement, milestones: initialMilestones, ledger: initialLedger,
  isB, payeeOnboarded, engagementId,
  myReview, theirReview, revieweeName,
  disputes, userId,
  board,
}: {
  engagement: any;
  milestones: Milestone[];
  ledger: LedgerEntry[];
  isB: boolean;
  payeeOnboarded: boolean;
  engagementId: string;
  myReview: any;
  theirReview: any;
  revieweeName: string;
  disputes: any[];
  userId: string;
  board: { boardId: string | null; columns: any[]; cards: any[] };
}) {
  const router = useRouter();
  const [milestones, setMilestones] = useState(initialMilestones);
  const [ledger, setLedger] = useState(initialLedger);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const FEE = Number(engagement.platform_fee_pct ?? 15);
  const cur = engagement.currency ?? 'GBP';
  const total = milestones.reduce((a, m) => a + Number(m.amount), 0);
  const inEscrow = milestones.filter(m => ['funded', 'submitted'].includes(m.status)).reduce((a, m) => a + Number(m.amount), 0);
  const released = milestones.filter(m => m.status === 'released').reduce((a, m) => a + Number(m.amount), 0);
  const pct = total > 0 ? (released / total) * 100 : 0;

  async function fund(mid: string, amount: number) {
    setLoading(mid + 'f'); setError(null);
    const res = await fetch(`/api/engagements/${engagementId}/milestones/${mid}/fund`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(null); return; }
    // In production: load Stripe.js and confirm the PaymentIntent here.
    // For now we refresh to pick up the webhook-confirmed state.
    router.refresh();
    setLoading(null);
  }

  async function submit(mid: string) {
    setLoading(mid + 's'); setError(null);
    // Expert submits work — updates milestone status server-side.
    const res = await fetch(`/api/engagements/${engagementId}/milestones/${mid}/submit`, { method: 'POST' });
    if (res.ok) { setMilestones(ms => ms.map(m => m.id === mid ? { ...m, status: 'submitted' } : m)); }
    else { const d = await res.json(); setError(d.error); }
    setLoading(null);
  }

  async function release(mid: string) {
    setLoading(mid + 'r'); setError(null);
    const res = await fetch(`/api/engagements/${engagementId}/milestones/${mid}/release`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(null); return; }
    setMilestones(ms => ms.map(m => m.id === mid ? { ...m, status: 'released' } : m));
    router.refresh();
    setLoading(null);
  }

  const payeeName = engagement.payee_type === 'expert'
    ? engagement.expert_profiles?.name
    : engagement.expert_profiles?.employer_partner_id
    ? 'Employer Partner'
    : engagement.business_profiles?.company_name;

  return (
    <div>
      {/* header band */}
      <div className="bg-[#1e3a8a] text-[#f6f3ec] rounded-xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute right-[-50px] top-[-50px] w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(201,168,106,.28),transparent 70%)' }} />
        <div className="relative flex flex-wrap justify-between gap-5">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#c8a24a]">
              {engagement.status === 'complete' ? 'Completed' : 'Active'} Engagement
            </span>
            <h1 className="font-serif text-2xl mt-1">{engagement.title}</h1>
            <p className="text-sm mt-1 text-[rgba(246,243,236,.6)]">
              {engagement.expert_profiles?.name}
              {engagement.payee_type !== 'expert' && (
                <span className="text-[#c8a24a] ml-1">· Company Resource — payment to {payeeName}</span>
              )}
            </p>
          </div>
          <div className="flex gap-6">
            <HStat label="Total" value={formatMoney(total, cur)} />
            <HStat label="In escrow" value={formatMoney(inEscrow, cur)} accent="#b8862f" />
            <HStat label="Released" value={formatMoney(released, cur)} accent="#c8a24a" />
          </div>
        </div>
        <div className="relative mt-5 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#2563eb,#c8a24a)' }} />
        </div>
      </div>

      {!payeeOnboarded && !isB && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">Set up your payout account to receive funds when milestones are released.</p>
          <Link href="/settings/payments" className="btn btn-primary text-sm whitespace-nowrap">Set up payouts →</Link>
        </div>
      )}

      {error && <p className="text-sm text-red-700 bg-red-50 px-4 py-3 rounded-lg mb-5">{error}</p>}

      <EngagementAgreement
        engagementId={engagementId}
        isB={isB}
        businessAcceptedAt={engagement.terms_accepted_by_business_at ?? null}
        expertAcceptedAt={engagement.terms_accepted_by_expert_at ?? null}
      />

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* milestones */}
        <div>
          <h2 className="font-serif text-xl mb-4">Milestones</h2>
          <div className="grid gap-3">
            {milestones.map((m, i) => {
              const meta = STATUS_META[m.status] ?? STATUS_META.pending;
              const l = loading;
              return (
                <div key={m.id} className="bg-white border border-[var(--line)] rounded-xl p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3 items-center">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-serif font-semibold text-sm flex-none
                        ${m.status === 'released' ? 'bg-moss text-white' : 'bg-paper-2 text-muted'}`}>
                        {m.status === 'released' ? '✓' : i + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{m.title}</p>
                        <span className="text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded"
                          style={{ color: meta.color, background: meta.bg }}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <p className="font-serif font-semibold text-lg">{formatMoney(m.amount, cur)}</p>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    {isB && m.status === 'pending' &&
                      <button onClick={() => fund(m.id, m.amount)} disabled={!!l}
                        className="btn btn-primary text-sm disabled:opacity-50">
                        {l === m.id + 'f' ? 'Processing…' : 'Fund into escrow →'}
                      </button>}
                    {!isB && m.status === 'pending' &&
                      <span className="text-sm text-muted italic">Waiting for the business to fund</span>}
                    {!isB && m.status === 'funded' &&
                      <button onClick={() => submit(m.id)} disabled={!!l}
                        className="btn btn-primary text-sm disabled:opacity-50">
                        {l === m.id + 's' ? 'Submitting…' : 'Submit work →'}
                      </button>}
                    {isB && m.status === 'funded' &&
                      <span className="text-sm text-muted italic">Funded — awaiting submission</span>}
                    {isB && m.status === 'submitted' &&
                      <button onClick={() => release(m.id)} disabled={!!l || !payeeOnboarded}
                        className="btn btn-primary text-sm disabled:opacity-50"
                        title={!payeeOnboarded ? 'Expert must complete payout setup' : ''}>
                        {l === m.id + 'r' ? 'Releasing…' : 'Approve & release →'}
                      </button>}
                    {!isB && m.status === 'submitted' &&
                      <span className="text-sm text-muted italic">Submitted — awaiting approval</span>}
                    {m.status === 'released' &&
                      <span className="text-sm text-moss font-medium">✓ Released</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <DisputePanel
            engagementId={engagementId}
            milestones={milestones}
            disputes={disputes}
            userId={userId}
          />

          <DeliverableUpload
            engagementId={engagementId}
            milestones={milestones.map((m) => ({ id: m.id, title: m.title }))}
          />

          {board.boardId && (
            <Board
              engagementId={engagementId}
              boardId={board.boardId}
              columns={board.columns}
              cards={board.cards}
            />
          )}

          {/* Reviews — appear once the engagement is complete */}
          {engagement.status === 'complete' && (
            <div className="mt-6">
              {!myReview ? (
                <ReviewForm engagementId={engagementId} isBusiness={isB} revieweeName={revieweeName} />
              ) : (
                <div className="bg-moss/5 border border-moss/25 rounded-xl2 p-6">
                  <p className="font-serif text-lg text-moss mb-1">✓ Review submitted</p>
                  <p className="text-sm text-muted">
                    {theirReview
                      ? 'Both parties have reviewed — this engagement is fully closed.'
                      : `Waiting for ${revieweeName} to leave their review.`}
                  </p>
                </div>
              )}

              {theirReview && (
                <div className="mt-4 bg-white border border-[var(--line)] rounded-xl p-6">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                    What {revieweeName} said
                  </p>
                  {theirReview.comment
                    ? <p className="text-sm leading-relaxed">{theirReview.comment}</p>
                    : <p className="text-sm text-muted italic">No written comment left.</p>}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4 sticky top-20">
          <div className="bg-white border border-[var(--line)] rounded-xl p-5">
            <h3 className="font-serif font-semibold text-base mb-4">How a milestone splits</h3>
            {(() => {
              const ex = 2000, fee = Math.round(ex * FEE / 100), net = ex - fee;
              const rows = [
                { l: 'Client pays', v: ex, bold: true },
                { l: `Platform fee (${FEE}%)`, v: -fee, muted: true },
                { l: payeeName ?? 'Payee', v: net, green: true },
              ];
              if (engagement.resource_split_to_expert) {
                const split = Number(engagement.resource_split_to_expert);
                rows[2].v = Math.round(net * (1 - split));
                rows.push({ l: engagement.expert_profiles?.name, v: Math.round(net * split), green: true } as any);
              }
              return rows.map((r, i) => (
                <div key={i} className="flex justify-between py-2 border-t border-[var(--line)] first:border-0 text-sm">
                  <span className={r.muted ? 'text-muted' : ''}>{r.l}</span>
                  <span className={`font-semibold ${r.green ? 'text-moss' : r.muted ? 'text-muted' : ''}`}>
                    {(r.v as number) < 0 ? '−' : ''}{formatMoney(Math.abs(r.v as number), cur)}
                  </span>
                </div>
              ));
            })()}
            <p className="text-xs text-muted mt-3 leading-relaxed">Example on a {formatMoney(2000, cur)} milestone.</p>
          </div>

          <div className="bg-white border border-[var(--line)] rounded-xl p-5">
            <h3 className="font-serif font-semibold text-base mb-1">Escrow ledger</h3>
            <p className="text-xs text-muted mb-4">Every movement, on the record.</p>
            {ledger.length === 0
              ? <p className="text-sm text-muted italic">Fund a milestone to begin.</p>
              : <div className="space-y-2.5">
                  {ledger.map((e) => {
                    const col = LEDGER_COLORS[e.entry_type] ?? '#5a6b63';
                    const prefix = e.entry_type === 'fund' ? '+' : e.entry_type === 'fee' ? '−' : '→';
                    return (
                      <div key={e.id} className="flex justify-between text-sm">
                        <span className="text-muted capitalize">{e.entry_type.replace('_', ' ')}</span>
                        <span className="font-semibold" style={{ color: col }}>
                          {prefix}{formatMoney(e.amount, cur)}
                        </span>
                      </div>
                    );
                  })}
                </div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function HStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-xs text-[rgba(246,243,236,.55)] uppercase tracking-wider font-semibold">{label}</p>
      <p className="font-serif font-semibold text-xl mt-1" style={{ color: accent ?? '#f6f3ec' }}>{value}</p>
    </div>
  );
}
