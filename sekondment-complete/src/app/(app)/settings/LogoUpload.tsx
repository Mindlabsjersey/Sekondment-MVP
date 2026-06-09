'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { saveProfileImage } from './actions';

const MAX_BYTES = 3 * 1024 * 1024; // 3MB

/**
 * Uploads a logo/photo to the public 'logos' bucket (path <accountId>/<file>),
 * then persists the public URL onto the profile. Shows a live preview.
 */
export default function LogoUpload({
  accountId,
  current,
  label = 'Company logo',
  rounded = 'rounded-xl',
}: {
  accountId: string;
  current: string | null;
  label?: string;
  rounded?: string;
}) {
  const [url, setUrl] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > MAX_BYTES) { setError('Image must be under 3MB.'); return; }

    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${accountId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw new Error(upErr.message);

      const { data } = supabase.storage.from('logos').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const res = await saveProfileImage(publicUrl);
      if (res?.error) throw new Error(res.error);
      setUrl(publicUrl);
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Make sure the logos bucket exists (migration 0034).');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="card mb-6">
      <label className="label">{label}</label>
      <div className="flex items-center gap-4 mt-2">
        <div className={`w-16 h-16 ${rounded} border border-[var(--line)] bg-paper-2 overflow-hidden flex items-center justify-center flex-none`}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted text-xs">No image</span>
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            disabled={busy}
            className="hidden"
            id="logo-file"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="btn btn-ghost disabled:opacity-60"
          >
            {busy ? 'Uploading…' : url ? 'Replace image' : 'Upload image'}
          </button>
          <p className="text-xs text-muted mt-1.5">PNG or JPG, up to 3MB. Shown across the app.</p>
          {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
