'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestCapacityBooking } from '../partner/capacity-actions';

export default function BookCapacityButton({ capacityId }: { capacityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(8);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    const res = await requestCapacityBooking(capacityId, hours);
    if (res?.error) { setError(res.error); setBusy(false); return; }
    setDone(true); setBusy(false);
    router.refresh();
  }

  if (done) return <span className="text-xs text-moss">✓ Booking requested</span>;

  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn btn-gold text-sm">Book capacity</button>;
  }

  return (
    <div className="flex items-center gap-2">
      <input type="number" min="1" value={hours} onChange={(e) => setHours(Number(e.target.value))}
        className="field text-sm w-20" />
      <span className="text-xs text-muted">hrs</span>
      <button onClick={submit} disabled={busy} className="btn btn-primary text-sm disabled:opacity-60">
        {busy ? '…' : 'Request'}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
