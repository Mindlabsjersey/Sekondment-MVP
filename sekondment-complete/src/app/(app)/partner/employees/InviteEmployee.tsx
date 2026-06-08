'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteEmployee } from '../actions';

export default function InviteEmployee({ defaultCommission }: { defaultCommission: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [commission, setCommission] = useState(defaultCommission);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function action(formData: FormData) {
    setPending(true); setError(null);
    formData.set('commission_pct', String(commission));
    const res = await inviteEmployee(formData);
    if (res?.error) { setError(res.error); setPending(false); return; }
    setOpen(false); setPending(false); router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">+ Register employee</button>

      {open && (
        <div onClick={() => setOpen(false)}
          className="fixed inset-0 bg-ink/35 z-50 flex items-center justify-center p-6">
          <div onClick={(e) => e.stopPropagation()}
            className="bg-paper rounded-xl2 p-7 w-full max-w-md shadow-soft">
            <h2 className="font-serif text-2xl mb-1">Register an employee</h2>
            <p className="text-muted text-sm mb-5 leading-relaxed">
              Invite an employee to be deployable through Sekondment. They build their expert profile;
              you approve before any deployment. Enter the email on their expert account.
            </p>
            <form action={action}>
              <label className="label">Employee email</label>
              <input name="email" type="email" required className="field mb-4" placeholder="employee@company.com" />

              <label className="label">Commission · {Math.round(commission * 100)}%</label>
              <input type="range" min="0" max="0.4" step="0.05" value={commission}
                onChange={(e) => setCommission(+e.target.value)} className="w-full accent-moss mb-1" />
              <p className="text-xs text-muted mb-5">Your cut of their net earnings, after the 15% platform fee.</p>

              {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

              <div className="flex gap-3">
                <button type="submit" disabled={pending} className="btn btn-primary flex-1 disabled:opacity-60">
                  {pending ? 'Sending…' : 'Send invitation'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
