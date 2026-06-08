'use client';

import { useState } from 'react';
import { toggleSavedExpert } from './saved-actions';

export default function SaveExpertButton({ expertId, initialSaved }: { expertId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPending(true);
    const prev = saved;
    setSaved(!prev); // optimistic
    const res = await toggleSavedExpert(expertId, prev);
    if (res?.error) setSaved(prev); // revert
    setPending(false);
  }

  return (
    <button onClick={toggle} disabled={pending} aria-label={saved ? 'Remove from saved' : 'Save expert'}
      className="flex-none w-9 h-9 rounded-lg border flex items-center justify-center transition hover:bg-paper-2 disabled:opacity-50"
      style={{ borderColor: 'var(--line)', color: saved ? 'var(--c-gold)' : 'var(--c-muted)' }}>
      {saved ? '★' : '☆'}
    </button>
  );
}
