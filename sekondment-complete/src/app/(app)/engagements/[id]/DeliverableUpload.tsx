'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { uploadDeliverable } from '../file-actions';

export default function DeliverableUpload({
  engagementId, milestones,
}: {
  engagementId: string;
  milestones: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [milestoneId, setMilestoneId] = useState(milestones[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Choose a file.'); return; }
    setPending(true); setError(null);
    const fd = new FormData();
    fd.set('engagement_id', engagementId);
    fd.set('milestone_id', milestoneId);
    fd.set('title', title || file.name);
    fd.set('file', file);
    const res = await uploadDeliverable(fd);
    if (res?.error) { setError(res.error); setPending(false); return; }
    setOpen(false); setTitle(''); setPending(false);
    if (fileRef.current) fileRef.current.value = '';
    router.refresh();
  }

  if (milestones.length === 0) return null;

  return (
    <div className="mt-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn btn-ghost text-sm">📎 Upload deliverable</button>
      ) : (
        <div className="border rounded-xl p-4" style={{ borderColor: 'var(--line)' }}>
          <p className="font-medium text-sm mb-3">Upload a secure deliverable</p>
          <label className="label">Milestone</label>
          <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} className="field mb-3">
            {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <label className="label">Title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="field mb-3" placeholder="e.g. Final brand guidelines" />
          <label className="label">File</label>
          <input ref={fileRef} type="file" className="field mb-3 text-sm" />
          {error && <p className="text-sm text-red-700 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={pending} className="btn btn-primary text-sm disabled:opacity-60">
              {pending ? 'Uploading…' : 'Upload securely'}
            </button>
            <button onClick={() => { setOpen(false); setError(null); }} className="btn btn-ghost text-sm">Cancel</button>
          </div>
          <p className="text-xs text-muted mt-3">Stored encrypted in-platform, visible only to you and the other party. Max 25MB.</p>
        </div>
      )}
    </div>
  );
}
