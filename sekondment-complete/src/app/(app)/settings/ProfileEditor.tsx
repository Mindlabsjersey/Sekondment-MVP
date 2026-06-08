'use client';

import { useState } from 'react';
import { updateExpertProfile, updateBusinessProfile, updatePartnerProfile } from './actions';

export default function ProfileEditor({ type, profile, email }: { type: string; profile: any; email: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [visibility, setVisibility] = useState<'listed' | 'unlisted'>(profile.visibility ?? 'listed');
  const [commission, setCommission] = useState<number>(Number(profile.default_commission_pct ?? 0.2));

  async function action(formData: FormData) {
    setPending(true); setError(null); setSaved(false);
    if (type === 'expert') formData.set('visibility', visibility);
    if (type === 'employer_partner') formData.set('default_commission_pct', String(commission));
    const fn = type === 'expert' ? updateExpertProfile
      : type === 'business' ? updateBusinessProfile : updatePartnerProfile;
    const res = await fn(formData);
    if (res?.error) { setError(res.error); setPending(false); return; }
    setSaved(true); setPending(false);
  }

  return (
    <form action={action} className="max-w-2xl space-y-5">
      <div className="card space-y-5">
        <div>
          <label className="label">Account email</label>
          <input value={email} disabled className="field opacity-60 cursor-not-allowed" />
        </div>

        {type === 'expert' && <>
          <Two>
            <Field label="Full name"><input name="name" required defaultValue={profile.name} className="field" /></Field>
            <Field label="Headline"><input name="headline" defaultValue={profile.headline ?? ''} className="field" placeholder="Fractional Marketing Director" /></Field>
          </Two>
          <Field label="Bio"><textarea name="bio" rows={3} defaultValue={profile.bio ?? ''} className="field resize-none" /></Field>
          <Field label="Skills (comma-separated)"><input name="skills" defaultValue={(profile.skills ?? []).join(', ')} className="field" /></Field>
          <Two>
            <Field label="Expertise areas"><input name="expertise_areas" defaultValue={(profile.expertise_areas ?? []).join(', ')} className="field" /></Field>
            <Field label="Industries"><input name="industries" defaultValue={(profile.industries ?? []).join(', ')} className="field" /></Field>
          </Two>
          <Two>
            <Field label="Day rate (£)"><input name="daily_rate" type="number" min="0" defaultValue={profile.daily_rate ?? ''} className="field" /></Field>
            <Field label="Hourly rate (£)"><input name="hourly_rate" type="number" min="0" defaultValue={profile.hourly_rate ?? ''} className="field" /></Field>
          </Two>
          <Two>
            <Field label="LinkedIn"><input name="linkedin_url" defaultValue={profile.linkedin_url ?? ''} className="field" /></Field>
            <Field label="Website"><input name="website" defaultValue={profile.website ?? ''} className="field" /></Field>
          </Two>
          <div>
            <label className="label">Profile visibility</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {([['listed', 'Listed', 'Discoverable in search.'], ['unlisted', 'Unlisted', 'Hidden — invite only.']] as const).map(([v, l, d]) => (
                <button type="button" key={v} onClick={() => setVisibility(v)}
                  className={`text-left p-3 rounded-xl border transition ${visibility === v ? 'bg-moss/5 border-moss' : 'bg-surface border-[var(--line)]'}`}>
                  <span className="font-medium text-sm">{l}</span>
                  <p className="text-xs text-muted mt-0.5">{d}</p>
                </button>
              ))}
            </div>
          </div>
        </>}

        {type === 'business' && <>
          <Field label="Company name"><input name="company_name" required defaultValue={profile.company_name} className="field" /></Field>
          <Field label="Description"><textarea name="description" rows={3} defaultValue={profile.description ?? ''} className="field resize-none" /></Field>
          <Two>
            <Field label="Industry"><input name="industry" defaultValue={profile.industry ?? ''} className="field" /></Field>
            <Field label="Company size"><input name="company_size" defaultValue={profile.company_size ?? ''} className="field" placeholder="11–50" /></Field>
          </Two>
          <Two>
            <Field label="Location"><input name="location" defaultValue={profile.location ?? ''} className="field" /></Field>
            <Field label="Website"><input name="website" defaultValue={profile.website ?? ''} className="field" /></Field>
          </Two>
        </>}

        {type === 'employer_partner' && <>
          <Field label="Company name"><input name="company_name" required defaultValue={profile.company_name} className="field" /></Field>
          <Field label="Description"><textarea name="description" rows={3} defaultValue={profile.description ?? ''} className="field resize-none" /></Field>
          <Two>
            <Field label="Industry"><input name="industry" defaultValue={profile.industry ?? ''} className="field" /></Field>
            <Field label="Company size"><input name="company_size" defaultValue={profile.company_size ?? ''} className="field" /></Field>
          </Two>
          <Two>
            <Field label="Location"><input name="location" defaultValue={profile.location ?? ''} className="field" /></Field>
            <Field label="Website"><input name="website" defaultValue={profile.website ?? ''} className="field" /></Field>
          </Two>
          <div>
            <label className="label">Default commission · {Math.round(commission * 100)}%</label>
            <input type="range" min="0" max="0.4" step="0.05" value={commission}
              onChange={(e) => setCommission(+e.target.value)} className="w-full accent-moss" />
          </div>
        </>}
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {saved && <p className="text-sm text-moss bg-moss/8 px-3 py-2 rounded-lg">✓ Saved</p>}

      <button type="submit" disabled={pending} className="btn btn-primary btn-lg disabled:opacity-60">
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
function Two({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}
