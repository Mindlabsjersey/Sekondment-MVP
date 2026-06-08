'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCapacity, setCapacityVisibility, deleteCapacity } from './capacity-actions';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';

export default function CapacityManager({ listings }: { listings: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setPending(true); setError(null);
    const res = await createCapacity(formData);
    if (res?.error) { setError(res.error); setPending(false); return; }
    setOpen(false); setPending(false);
    router.refresh();
  }

  async function toggle(id: string, current: string) {
    await setCapacityVisibility(id, current === 'public' ? 'private' : 'public');
    router.refresh();
  }
  async function remove(id: string) {
    await deleteCapacity(id);
    router.refresh();
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl">Capacity listings</h2>
        <button onClick={() => setOpen((o) => !o)} className="btn btn-ghost text-sm">
          {open ? 'Cancel' : '+ List capacity'}
        </button>
      </div>

      <p className="text-sm text-muted mb-4">
        List spare workforce capacity — hours and expertise — for businesses to find and book.
        Payment routes to you as the employer, with any bonus split to the individual.
      </p>

      {open && (
        <form action={submit} className="card mb-5 space-y-4">
          <div>
            <label className="label">Title</label>
            <input name="title" required className="field" placeholder="e.g. Senior Azure engineer — 2 days/week" />
          </div>
          <div>
            <label className="label">Expertise (comma-separated)</label>
            <input name="expertise" className="field" placeholder="Azure Administration, Microsoft 365 Migration" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Hours / week</label><input name="hours_per_week" type="number" min="0" className="field" placeholder="16" /></div>
            <div><label className="label">Days / month</label><input name="days_per_month" type="number" min="0" className="field" placeholder="8" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Available from</label><input name="availability_start" type="date" className="field" /></div>
            <div><label className="label">Available until</label><input name="availability_end" type="date" className="field" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Day rate</label><input name="day_rate" type="number" min="0" className="field" placeholder="600" /></div>
            <div><label className="label">Hourly rate</label><input name="hourly_rate" type="number" min="0" className="field" placeholder="90" /></div>
            <div>
              <label className="label">Currency</label>
              <select name="rate_currency" className="field" defaultValue="GBP">
                {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Work mode</label>
              <select name="work_mode" className="field" defaultValue="remote">
                <option value="remote">Remote</option><option value="onsite">Onsite</option><option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div><label className="label">Location</label><input name="location" className="field" placeholder="Jersey" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Employer commission (0–1)</label><input name="employer_commission_rule" type="number" min="0" max="1" step="0.05" className="field" placeholder="0.2" /></div>
            <div><label className="label">Employee bonus (0–1)</label><input name="employee_bonus_rule" type="number" min="0" max="1" step="0.05" className="field" placeholder="0.1" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="visibility" value="public" className="accent-moss" />
            List publicly (discoverable by businesses)
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
            {pending ? 'Creating…' : 'Create listing'}
          </button>
        </form>
      )}

      {listings.length === 0 ? (
        <div className="card text-center py-8 text-muted text-sm">No capacity listed yet.</div>
      ) : (
        <div className="grid gap-3">
          {listings.map((c) => (
            <div key={c.id} className="bg-surface border border-[var(--line)] rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{c.title}</p>
                <p className="text-xs text-muted">
                  {c.available_hours_per_week}h/wk · {c.work_mode}
                  {c.day_rate ? ` · day rate ${c.day_rate}` : ''}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${c.visibility === 'public' ? 'text-moss bg-moss/10' : 'text-muted bg-muted/12'}`}>
                {c.visibility}
              </span>
              <button onClick={() => toggle(c.id, c.visibility)} className="text-xs text-muted hover:text-ink">
                {c.visibility === 'public' ? 'Unlist' : 'List'}
              </button>
              <button onClick={() => remove(c.id)} className="text-xs text-muted hover:text-[#a14b3d]">Delete</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
