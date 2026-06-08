'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reviewVerificationDoc } from '../../settings/verification-actions';

export default function VerificationDocRow({ doc }: { doc: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function review(decision: 'approved' | 'rejected') {
    setBusy(true);
    await reviewVerificationDoc(doc.id, decision);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium capitalize">{String(doc.doc_type).replace(/_/g, ' ')}</p>
        <p className="text-xs text-muted truncate">
          {doc.accounts?.full_name || doc.accounts?.email || 'User'}
          {doc.file_path ? ` · ${doc.file_path.split('/').pop()}` : ''}
        </p>
      </div>
      <button disabled={busy} onClick={() => review('approved')}
        className="btn btn-ghost text-xs py-1.5 text-moss">✓ Approve</button>
      <button disabled={busy} onClick={() => review('rejected')}
        className="btn btn-ghost text-xs py-1.5 text-[#a14b3d]">✕ Reject</button>
    </div>
  );
}
