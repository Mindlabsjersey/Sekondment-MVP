'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptEngagementAgreement } from '../terms-actions';

export default function EngagementAgreement({
  engagementId, isB, businessAcceptedAt, expertAcceptedAt,
}: {
  engagementId: string;
  isB: boolean;
  businessAcceptedAt: string | null;
  expertAcceptedAt: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myAccepted = isB ? !!businessAcceptedAt : !!expertAcceptedAt;
  const bothAccepted = !!businessAcceptedAt && !!expertAcceptedAt;

  async function accept() {
    setPending(true); setError(null);
    const res = await acceptEngagementAgreement(engagementId);
    if (res?.error) { setError(res.error); setPending(false); return; }
    router.refresh(); setPending(false);
  }

  if (bothAccepted) {
    return (
      <div className="mb-6 flex items-center gap-2 text-sm text-moss bg-moss/8 rounded-xl px-4 py-2.5">
        ✓ Engagement agreement accepted by both parties.
        <a href="/terms#engagement_terms" target="_blank" className="underline ml-1">View terms</a>
      </div>
    );
  }

  return (
    <div className="mb-6 border rounded-xl2 p-5" style={{ borderColor: 'var(--c-gold)' }}>
      <h3 className="font-serif text-lg mb-1">Engagement agreement</h3>
      <p className="text-sm text-muted mb-3">
        Both parties accept the{' '}
        <a href="/terms#engagement_terms" target="_blank" className="text-moss underline">Engagement Agreement</a>{' '}
        before funding proceeds. Work is milestone-based; funds release on approval; the platform fee
        and any Company Resource split apply as shown.
      </p>
      <div className="flex items-center gap-4 text-sm mb-3">
        <span className={businessAcceptedAt ? 'text-moss' : 'text-muted'}>
          {businessAcceptedAt ? '✓' : '○'} Business
        </span>
        <span className={expertAcceptedAt ? 'text-moss' : 'text-muted'}>
          {expertAcceptedAt ? '✓' : '○'} Expert
        </span>
      </div>
      {error && <p className="text-sm text-red-700 mb-2">{error}</p>}
      {myAccepted ? (
        <p className="text-sm text-muted italic">You've accepted. Waiting for the other party.</p>
      ) : (
        <button onClick={accept} disabled={pending} className="btn btn-gold text-sm disabled:opacity-60">
          {pending ? 'Accepting…' : 'Accept agreement'}
        </button>
      )}
    </div>
  );
}
