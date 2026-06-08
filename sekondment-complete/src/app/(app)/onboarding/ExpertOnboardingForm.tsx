'use client';

import { useState } from 'react';
import { saveExpertProfile } from './actions';
import { CATEGORY_LABELS } from '@/lib/types/database';
import type { ExpertCategory } from '@/lib/types/database';
import GlobalFieldset from './GlobalFieldset';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpertCategory[];
const WORK_MODES = [
  { v: 'remote', l: 'Remote' },
  { v: 'hybrid', l: 'Hybrid' },
  { v: 'on_site', l: 'On-site' },
];
const AVAILABILITY = [
  { v: 'available_now', l: 'Available now' },
  { v: 'available_from', l: 'Available from a date' },
  { v: 'fractional_only', l: 'Fractional only' },
  { v: 'advisory_only', l: 'Advisory only' },
  { v: 'project_only', l: 'Project only' },
];

export default function ExpertOnboardingForm({ defaultName }: { defaultName?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cats, setCats] = useState<ExpertCategory[]>(['consultant']);
  const [modes, setModes] = useState<string[]>(['remote']);
  const [visibility, setVisibility] = useState<'listed' | 'unlisted'>('listed');

  function toggle<T>(list: T[], set: (v: T[]) => void, value: T) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set('categories', cats.join(','));
    formData.set('work_modes', modes.join(','));
    const res = await saveExpertProfile(formData);
    if (res?.error) { setError(res.error); setPending(false); }
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="name">Your name *</label>
          <input id="name" name="name" required defaultValue={defaultName} className="field" placeholder="Jane Doe" />
        </div>
        <div>
          <label className="label" htmlFor="headline">Headline</label>
          <input id="headline" name="headline" className="field" placeholder="Fractional Marketing Director" />
        </div>
      </div>

      <div>
        <label className="label">What kind of expert are you?</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => toggle(cats, setCats, c)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition ${
                cats.includes(c) ? 'bg-moss text-white border-moss' : 'bg-white border-[var(--line)] text-muted hover:text-ink'
              }`}>
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="bio">Bio</label>
        <textarea id="bio" name="bio" rows={3} className="field resize-none"
          placeholder="A short summary of your experience and what you deliver." />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-3">
          <label className="label" htmlFor="skills">Skills <span className="text-muted font-normal">(comma-separated)</span></label>
          <input id="skills" name="skills" className="field" placeholder="Brand strategy, SEO, Paid social" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="expertise_areas">Expertise areas</label>
          <input id="expertise_areas" name="expertise_areas" className="field" placeholder="Growth, Positioning" />
        </div>
        <div>
          <label className="label" htmlFor="industries">Industries</label>
          <input id="industries" name="industries" className="field" placeholder="B2B SaaS" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="daily_rate">Daily rate (£)</label>
          <input id="daily_rate" name="daily_rate" type="number" min="0" className="field" placeholder="800" />
        </div>
        <div>
          <label className="label" htmlFor="hourly_rate">Hourly rate (£)</label>
          <input id="hourly_rate" name="hourly_rate" type="number" min="0" className="field" placeholder="120" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="availability_type">Availability</label>
          <select id="availability_type" name="availability_type" className="field">
            {AVAILABILITY.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="hours_per_week">Hours / week</label>
          <input id="hours_per_week" name="hours_per_week" type="number" min="0" max="60" className="field" placeholder="20" />
        </div>
      </div>

      <div>
        <label className="label">Work mode</label>
        <div className="flex gap-2">
          {WORK_MODES.map((m) => (
            <button key={m.v} type="button" onClick={() => toggle(modes, setModes, m.v)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition ${
                modes.includes(m.v) ? 'bg-moss text-white border-moss' : 'bg-white border-[var(--line)] text-muted hover:text-ink'
              }`}>
              {m.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="linkedin_url">LinkedIn URL</label>
          <input id="linkedin_url" name="linkedin_url" className="field" placeholder="https://linkedin.com/in/…" />
        </div>
        <div>
          <label className="label" htmlFor="website">Website / portfolio</label>
          <input id="website" name="website" className="field" placeholder="https://…" />
        </div>
      </div>

      <div>
        <label className="label">Profile visibility</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {([
            { v: 'listed', l: 'Listed', d: 'Discoverable in browse and search. Recommended — more opportunities find you.' },
            { v: 'unlisted', l: 'Unlisted', d: 'Hidden from search. Reachable only by direct link or businesses you work with.' },
          ] as const).map(({ v, l, d }) => (
            <label key={v} className={`text-left p-3.5 rounded-xl border cursor-pointer transition block
              ${visibility === v ? 'bg-moss/5 border-moss' : 'bg-surface border-[var(--line)] hover:border-moss/40'}`}>
              <input type="radio" name="visibility" value={v} checked={visibility === v}
                onChange={() => setVisibility(v)} className="sr-only" />
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-4 h-4 rounded-full border-2 flex-none flex items-center justify-center
                  ${visibility === v ? 'border-moss' : 'border-[var(--line)]'}`}>
                  {visibility === v && <span className="w-2 h-2 rounded-full bg-moss" />}
                </span>
                <span className="font-medium text-sm">{l}</span>
              </div>
              <p className="text-xs text-muted leading-snug pl-6">{d}</p>
            </label>
          ))}
        </div>
      </div>

      <GlobalFieldset showWorkModes />

      {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full disabled:opacity-60">
        {pending ? 'Saving…' : 'Continue to dashboard →'}
      </button>
    </form>
  );
}
