'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAccountStatus, saveAdminNotes, adminRecomputeTrust } from './actions';

const STATUS_META: Record<string, string> = {
  active: 'text-moss bg-moss/10',
  warned: 'text-[#b8862f] bg-[#b8862f]/12',
  suspended: 'text-[#a14b3d] bg-[#a14b3d]/10',
};

export default function UserRow({ user }: { user: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(user.admin_notes ?? '');
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<any>) {
    setBusy(true);
    await fn();
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="bg-surface border border-[var(--line)] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-moss to-moss-2 text-white flex items-center justify-center font-serif font-semibold text-sm flex-none">
          {(user.full_name || user.email || '?').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{user.full_name || user.email}</p>
          <p className="text-xs text-muted capitalize">{user.account_type} · {user.email}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_META[user.status] ?? ''}`}>{user.status}</span>
        <button onClick={() => setOpen((o) => !o)} className="text-xs text-muted hover:text-ink ml-1">{open ? 'Close' : 'Manage'}</button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--line)' }}>
          <div className="flex flex-wrap gap-2 mb-3">
            <button disabled={busy} onClick={() => act(() => setAccountStatus(user.id, 'warned'))}
              className="btn btn-ghost text-xs py-1.5">⚠ Warn</button>
            <button disabled={busy} onClick={() => act(() => setAccountStatus(user.id, 'suspended'))}
              className="btn btn-ghost text-xs py-1.5 text-[#a14b3d]">⛔ Suspend</button>
            <button disabled={busy} onClick={() => act(() => setAccountStatus(user.id, 'active'))}
              className="btn btn-ghost text-xs py-1.5 text-moss">✓ Reinstate</button>
            <button disabled={busy} onClick={() => act(() => adminRecomputeTrust(user.id))}
              className="btn btn-ghost text-xs py-1.5">↻ Recompute Trust</button>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Admin notes…" className="field text-sm resize-none mb-2" />
          <button disabled={busy} onClick={() => act(() => saveAdminNotes(user.id, notes))}
            className="btn btn-primary text-xs py-1.5">Save notes</button>
        </div>
      )}
    </div>
  );
}
