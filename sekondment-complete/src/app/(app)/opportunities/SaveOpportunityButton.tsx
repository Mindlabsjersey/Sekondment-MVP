'use client';

import { useState } from 'react';
import { toggleSavedOpportunity } from '../experts/saved-actions';

export default function SaveOpportunityButton({ opportunityId, initialSaved }: { opportunityId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPending(true);
    const prev = saved;
    setSaved(!prev);
    const res = await toggleSavedOpportunity(opportunityId, prev);
    if (res?.error) setSaved(prev);
    setPending(false);
  }

  return (
    <button onClick={toggle} disabled={pending} aria-label={saved ? 'Remove from saved' : 'Save opportunity'}
      className="flex-none w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition hover:bg-paper-2 disabled:opacity-50"
      style={{ borderColor: 'var(--line)', color: saved ? 'var(--c-gold)' : 'var(--c-muted)' }}>
      {saved ? '★' : '☆'}
    </button>
  );
}
