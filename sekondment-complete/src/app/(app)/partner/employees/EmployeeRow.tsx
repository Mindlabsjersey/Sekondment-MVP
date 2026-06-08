'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setEmployeeStatus } from '../actions';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Awaiting approval', cls: 'text-[#b8862f] bg-[#b8862f]/12' },
  approved: { label: 'Approved', cls: 'text-moss bg-moss/10' },
  suspended: { label: 'Suspended', cls: 'text-muted bg-muted/12' },
  revoked: { label: 'Revoked', cls: 'text-[#a14b3d] bg-[#a14b3d]/10' },
};

export default function EmployeeRow({
  link,
  expert,
}: {
  link: { id: string; approval_status: string; commission_pct: number | null; defaultCommission: number };
  expert: { name: string; headline: string | null; skills: string[]; trust_score: number };
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(status: 'approved' | 'suspended' | 'revoked') {
    setPending(status); setError(null);
    const res = await setEmployeeStatus(link.id, status);
    if (res && 'error' in res && res.error) { setError(res.error); setPending(null); return; }
    router.refresh();
    setPending(null);
  }

  const sm = STATUS_META[link.approval_status] ?? STATUS_META.pending;
  const commission = link.commission_pct ?? link.defaultCommission;

  return (
    <div className="bg-white border border-[var(--line)] rounded-xl p-5 flex gap-4 items-center">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-moss to-moss-2 text-white flex items-center justify-center font-serif font-semibold flex-none">
        {expert?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-serif font-semibold">{expert?.name}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sm.cls}`}>{sm.label}</span>
        </div>
        {expert?.headline && <p className="text-sm text-muted mt-0.5">{expert.headline}</p>}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(expert?.skills ?? []).slice(0, 3).map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 rounded bg-paper-2 font-medium">{s}</span>
          ))}
        </div>
      </div>
      <div className="text-right text-sm text-muted flex-none">
        <p><strong className="text-ink">{Math.round(commission * 100)}%</strong> commission</p>
        <p className="text-xs mt-0.5">Trust {expert?.trust_score ?? 0}</p>
      </div>
      <div className="flex flex-col gap-2 flex-none">
        {link.approval_status === 'pending' && (
          <>
            <button onClick={() => act('approved')} disabled={!!pending}
              className="btn btn-primary text-sm disabled:opacity-50">
              {pending === 'approved' ? '…' : 'Approve'}
            </button>
            <button onClick={() => act('revoked')} disabled={!!pending}
              className="btn btn-ghost text-sm disabled:opacity-50">Decline</button>
          </>
        )}
        {link.approval_status === 'approved' && (
          <button onClick={() => act('suspended')} disabled={!!pending}
            className="btn btn-ghost text-sm disabled:opacity-50">
            {pending === 'suspended' ? '…' : 'Suspend'}
          </button>
        )}
        {link.approval_status === 'suspended' && (
          <button onClick={() => act('approved')} disabled={!!pending}
            className="btn btn-primary text-sm disabled:opacity-50">
            {pending === 'approved' ? '…' : 'Reinstate'}
          </button>
        )}
        {link.approval_status === 'revoked' && (
          <span className="text-xs text-muted italic">Declined</span>
        )}
      </div>
      {error && <p className="text-xs text-red-700 absolute">{error}</p>}
    </div>
  );
}
