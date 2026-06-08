'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { uploadVerificationDoc } from './verification-actions';

const DOC_TYPES: { value: string; label: string }[] = [
  { value: 'identity', label: 'Identity document' },
  { value: 'business_registration', label: 'Business registration' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'certification', label: 'Certification' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'licence', label: 'Licence' },
  { value: 'reference', label: 'Reference' },
  { value: 'right_to_work', label: 'Right to work' },
  { value: 'director_confirmation', label: 'Director confirmation' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'employer_confirmation', label: 'Employer confirmation' },
];

export default function VerificationUpload({ existing }: { existing: any[] }) {
  const router = useRouter();
  const [docType, setDocType] = useState('identity');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Choose a file.'); return; }
    setPending(true); setError(null); setDone(false);
    const fd = new FormData();
    fd.set('doc_type', docType);
    fd.set('file', file);
    const res = await uploadVerificationDoc(fd);
    if (res?.error) { setError(res.error); setPending(false); return; }
    if (fileRef.current) fileRef.current.value = '';
    setDone(true); setPending(false);
    router.refresh();
  }

  const STATUS_CLS: Record<string, string> = {
    submitted: 'text-[#b8862f] bg-[#b8862f]/12',
    approved: 'text-moss bg-moss/10',
    rejected: 'text-[#a14b3d] bg-[#a14b3d]/10',
  };

  return (
    <div className="card max-w-2xl mt-6">
      <h3 className="font-serif text-lg mb-1">Verification documents</h3>
      <p className="text-sm text-muted mb-4">
        Upload evidence to support verification. Documents are private, stored securely,
        and reviewed by our team. Verification can raise your Trust Score.
      </p>

      {existing.length > 0 && (
        <div className="grid gap-2 mb-4">
          {existing.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2" style={{ borderColor: 'var(--line)' }}>
              <span className="capitalize">{String(d.doc_type).replace(/_/g, ' ')}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_CLS[d.status] ?? ''}`}>{d.status}</span>
            </div>
          ))}
        </div>
      )}

      <label className="label">Document type</label>
      <select value={docType} onChange={(e) => setDocType(e.target.value)} className="field mb-3">
        {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input ref={fileRef} type="file" className="field text-sm mb-3" />
      {error && <p className="text-sm text-red-700 mb-2">{error}</p>}
      {done && <p className="text-sm text-moss mb-2">✓ Submitted for review</p>}
      <button onClick={submit} disabled={pending} className="btn btn-primary text-sm disabled:opacity-60">
        {pending ? 'Uploading…' : 'Upload document'}
      </button>
    </div>
  );
}
