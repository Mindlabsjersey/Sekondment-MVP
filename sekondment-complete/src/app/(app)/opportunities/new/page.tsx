'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createOpportunity } from '../actions';
import { OUTCOME_LABELS } from '@/lib/types/database';
import type { OutcomeType } from '@/lib/types/database';
import { SUPPORTED_CURRENCIES, currencySymbol } from '@/lib/currency';
import ProjectBuilder from './ProjectBuilder';

const OUTCOMES = Object.entries(OUTCOME_LABELS) as [OutcomeType, string][];
const RATE_TYPES = [
  { v: 'fixed', l: 'Fixed price' },
  { v: 'daily', l: 'Day rate' },
  { v: 'hourly', l: 'Hourly' },
  { v: 'retainer', l: 'Retainer' },
];
const MODES = [
  { v: 'remote', l: 'Remote' },
  { v: 'hybrid', l: 'Hybrid' },
  { v: 'on_site', l: 'On-site' },
];

export default function NewOpportunityPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [outcome, setOutcome] = useState<OutcomeType | null>(null);
  const [rateType, setRateType] = useState('fixed');
  const [mode, setMode] = useState('remote');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [currency, setCurrency] = useState('GBP');
  const [engagementKind, setEngagementKind] = useState('freelancer');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function action(formData: FormData) {
    if (!outcome) return setError('Please select an outcome.');
    setPending(true);
    setError(null);
    formData.set('desired_outcome', outcome);
    formData.set('rate_type', rateType);
    formData.set('currency', currency);
    formData.set('work_mode', mode);
    formData.set('engagement_kind', engagementKind);
    formData.set('visibility', visibility);
    const res = await createOpportunity(formData);
    if (res?.error) { setError(res.error); setPending(false); }
    // on success, createOpportunity redirects — no further action needed
  }

  return (
    <div className="max-w-2xl">
      <Link href="/opportunities" className="text-muted text-sm hover:text-ink transition mb-5 inline-block">
        ← Back to opportunities
      </Link>

      {/* stepper */}
      <div className="flex gap-2 mb-7">
        {['Outcome', 'Details', 'Terms'].map((s, i) => {
          const n = i + 1;
          return (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full transition-all ${n <= step ? 'bg-moss' : 'bg-paper-2'}`} />
              <p className={`text-xs mt-2 font-medium ${n <= step ? 'text-moss' : 'text-muted'}`}>
                {n < step ? '✓ ' : `${n}. `}{s}
              </p>
            </div>
          );
        })}
      </div>

      <form action={action}>
        {/* STEP 1 — outcome */}
        {step === 1 && (
          <div>
            <ProjectBuilder />
            <h1 className="font-serif text-3xl tracking-tight mb-2">What are you trying to <em className="not-italic text-moss">achieve?</em></h1>
            <p className="text-muted mb-6">Start with the outcome. We match you with expertise that delivers it.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-7">
              {OUTCOMES.map(([v, l]) => (
                <button key={v} type="button" onClick={() => setOutcome(v)}
                  className={`text-left p-4 rounded-xl border transition text-sm font-medium
                    ${outcome === v
                      ? 'bg-moss text-white border-moss shadow-soft'
                      : 'bg-white border-[var(--line)] text-muted hover:text-ink hover:border-moss/30'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — details */}
        {step === 2 && (
          <div>
            <h1 className="font-serif text-3xl tracking-tight mb-2">Describe the <em className="not-italic text-moss">work.</em></h1>
            <p className="text-muted mb-6">Selected outcome: <strong className="text-ink">{outcome && OUTCOME_LABELS[outcome]}</strong></p>
            <div className="space-y-5">
              <div>
                <label className="label">Title *</label>
                <input name="title" required className="field" placeholder="e.g. Fractional CMO for Q3 product launch" />
              </div>
              <div>
                <label className="label">What does success look like?</label>
                <textarea name="description" rows={4} className="field resize-none"
                  placeholder="Describe the outcome, context, and any constraints…" />
              </div>
              <div>
                <label className="label">Required expertise <span className="text-muted font-normal">(comma-separated)</span></label>
                <input name="required_expertise" className="field" placeholder="Brand strategy, Go-to-market, Positioning" />
              </div>
              <div>
                <label className="label">Industry</label>
                <input name="industry" className="field" placeholder="e.g. B2B SaaS" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — terms */}
        {step === 3 && (
          <div>
            <h1 className="font-serif text-3xl tracking-tight mb-2">Set the <em className="not-italic text-moss">terms.</em></h1>
            <p className="text-muted mb-6">Experts filter by these. Realistic numbers get better matches.</p>
            <div className="space-y-5">
              <div>
                <label className="label">Engagement type</label>
                <div className="flex gap-2 flex-wrap">
                  {RATE_TYPES.map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setRateType(v)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition
                        ${rateType === v ? 'bg-moss text-white border-moss' : 'bg-white border-[var(--line)] text-muted hover:text-ink'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="field">
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} · {c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Engagement type</label>
                <select value={engagementKind} onChange={(e) => setEngagementKind(e.target.value)} className="field">
                  <option value="freelancer">Freelancer</option>
                  <option value="consultant">Consultant</option>
                  <option value="employer_resource">Employer-backed resource</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="country">Country / jurisdiction</label>
                  <input id="country" name="country" className="field" placeholder="e.g. Jersey, UK, UAE" />
                </div>
                <div>
                  <label className="label" htmlFor="timezone_overlap">Timezone overlap needed</label>
                  <input id="timezone_overlap" name="timezone_overlap" className="field" placeholder="e.g. ± 3h of GMT" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" name="local_knowledge_required" value="true" className="accent-moss" />
                Local knowledge required
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Budget from ({currencySymbol(currency)})</label>
                  <input name="budget_min" type="number" min="0" className="field" placeholder="3000" />
                </div>
                <div>
                  <label className="label">Budget to ({currencySymbol(currency)})</label>
                  <input name="budget_max" type="number" min="0" className="field" placeholder="8000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Duration</label>
                  <input name="duration" className="field" placeholder="e.g. 3 months" />
                </div>
                <div>
                  <label className="label">Start date</label>
                  <input name="start_date" type="date" className="field" />
                </div>
              </div>
              <div>
                <label className="label">Work mode</label>
                <div className="flex gap-2">
                  {MODES.map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setMode(v)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition
                        ${mode === v ? 'bg-moss text-white border-moss' : 'bg-white border-[var(--line)] text-muted hover:text-ink'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {mode !== 'remote' && (
                <div>
                  <label className="label">Location</label>
                  <input name="location" className="field" placeholder="e.g. Jersey, Channel Islands" />
                </div>
              )}

              <div>
                <label className="label">Visibility</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {([
                    { v: 'public', l: 'Public', d: 'Discoverable by anyone browsing Sekondment, including logged-out visitors.' },
                    { v: 'private', l: 'Private', d: 'Hidden from discovery. Only visible to experts you directly invite.' },
                  ] as const).map(({ v, l, d }) => (
                    <button key={v} type="button" onClick={() => setVisibility(v)}
                      className={`text-left p-3.5 rounded-xl border transition
                        ${visibility === v ? 'bg-moss/5 border-moss' : 'bg-white border-[var(--line)] hover:border-moss/40'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-4 h-4 rounded-full border-2 flex-none flex items-center justify-center
                          ${visibility === v ? 'border-moss' : 'border-[var(--line)]'}`}>
                          {visibility === v && <span className="w-2 h-2 rounded-full bg-moss" />}
                        </span>
                        <span className="font-medium text-sm">{l}</span>
                      </div>
                      <p className="text-xs text-muted leading-snug pl-6">{d}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg mt-4">{error}</p>}

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-[var(--line)]">
          <button type="button" onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="btn btn-ghost disabled:opacity-40">← Back</button>
          {step < 3
            ? <button type="button" onClick={() => { if (step === 1 && !outcome) return setError('Please choose an outcome.'); setError(null); setStep(s => s + 1); }}
                className="btn btn-primary btn-lg">Continue →</button>
            : <button type="submit" disabled={pending}
                className="btn btn-primary btn-lg disabled:opacity-60">
                {pending ? 'Publishing…' : 'Publish Opportunity →'}
              </button>}
        </div>
      </form>
    </div>
  );
}
