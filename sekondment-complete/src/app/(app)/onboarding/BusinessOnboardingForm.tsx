'use client';

import { useState } from 'react';
import { saveBusinessProfile } from './actions';
import GlobalFieldset from './GlobalFieldset';

const INDUSTRIES = ['Agency', 'SaaS', 'Professional Services', 'Retail', 'Manufacturing',
  'Finance', 'Healthcare', 'Construction', 'Hospitality', 'Other'];
const SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];

export default function BusinessOnboardingForm({ defaultName }: { defaultName?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await saveBusinessProfile(formData);
    if (res?.error) { setError(res.error); setPending(false); }
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="company_name">Company name *</label>
        <input id="company_name" name="company_name" required defaultValue={defaultName}
          className="field" placeholder="Acme Studio" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="industry">Industry</label>
          <select id="industry" name="industry" className="field">
            <option value="">Select…</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="company_size">Company size</label>
          <select id="company_size" name="company_size" className="field">
            <option value="">Select…</option>
            {SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="location">Location</label>
          <input id="location" name="location" className="field" placeholder="Jersey, Channel Islands" />
        </div>
        <div>
          <label className="label" htmlFor="website">Website</label>
          <input id="website" name="website" className="field" placeholder="https://…" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">What does your business do?</label>
        <textarea id="description" name="description" rows={3} className="field resize-none"
          placeholder="A short description clients will see on your profile." />
      </div>

      <GlobalFieldset />

      {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full disabled:opacity-60">
        {pending ? 'Saving…' : 'Continue to dashboard →'}
      </button>
    </form>
  );
}
