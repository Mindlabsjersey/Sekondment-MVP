'use client';

import { useState, useTransition } from 'react';
import { respondToEmployee } from './actions';

export default function EmployeeActions({
  expertId,
  approvedView = false,
}: {
  expertId: string;
  approvedView?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(approve: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await respondToEmployee(expertId, approve);
      if (res?.error) setError(res.error);
    });
  }

  if (approvedView) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => respond(false)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--line)] text-muted hover:text-ink disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Remove'}
        </button>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => respond(false)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--line)] text-muted hover:text-ink disabled:opacity-60"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => respond(true)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-moss text-white border border-moss hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Approve'}
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
