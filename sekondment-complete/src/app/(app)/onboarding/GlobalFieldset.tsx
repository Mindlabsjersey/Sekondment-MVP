'use client';

import { SUPPORTED_CURRENCIES } from '@/lib/currency';

/* Shared global-readiness fieldset used across onboarding forms. All fields are
   submitted via standard form names; the onboarding actions read them. */

const TIMEZONES = [
  'Europe/London', 'Europe/Jersey', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Dubai', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore',
  'Australia/Sydney', 'America/Toronto', 'Asia/Kolkata',
];

export default function GlobalFieldset({
  showWorkModes = false,
}: {
  showWorkModes?: boolean;
}) {
  return (
    <div className="space-y-4 border-t pt-5" style={{ borderColor: 'var(--line)' }}>
      <p className="font-medium text-sm">Location & availability</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="country">Where are you based? (country)</label>
          <input id="country" name="country" className="field" placeholder="e.g. Jersey, United Kingdom, UAE" />
        </div>
        <div>
          <label className="label" htmlFor="city">City / region</label>
          <input id="city" name="city" className="field" placeholder="e.g. St Helier" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="timezone">Timezone</label>
          <select id="timezone" name="timezone" className="field" defaultValue="Europe/London">
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="preferred_currency">Preferred currency</label>
          <select id="preferred_currency" name="preferred_currency" className="field" defaultValue="GBP">
            {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="countries_served">Countries / jurisdictions you serve</label>
        <input id="countries_served" name="countries_served" className="field"
          placeholder="comma-separated, e.g. Jersey, UK, Ireland" />
      </div>

      {showWorkModes && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            ['remote_available', 'Remote'],
            ['onsite_available', 'Onsite'],
            ['hybrid_available', 'Hybrid'],
            ['travel_available', 'Will travel'],
          ] as const).map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer"
              style={{ borderColor: 'var(--line)' }}>
              <input type="checkbox" name={name} value="true" defaultChecked={name === 'remote_available'} className="accent-moss" />
              {label}
            </label>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" name="open_to_international" value="true" defaultChecked className="accent-moss" />
        Open to international work
      </label>
    </div>
  );
}
