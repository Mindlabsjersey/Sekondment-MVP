'use client';

import { useState } from 'react';
import { createLead } from './crm-actions';

export function AddLeadForm() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ company_name: '', contact_name: '', contact_email: '', country: '', industry: '', estimated_value: '', lead_source: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function save() {
    setSaving(true); setMsg(null);
    const r = await createLead({
      company_name: f.company_name, contact_name: f.contact_name, contact_email: f.contact_email,
      country: f.country, industry: f.industry, lead_source: f.lead_source,
      estimated_value: f.estimated_value ? Number(f.estimated_value) : undefined,
    });
    setSaving(false);
    if (r.ok) { setF({ company_name: '', contact_name: '', contact_email: '', country: '', industry: '', estimated_value: '', lead_source: '' }); setOpen(false); }
    else setMsg(r.error ?? 'Failed.');
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="bg-moss text-white rounded-lg px-4 py-2 text-sm font-medium mb-4">+ Add lead</button>
  );

  return (
    <div className="card mb-4">
      <h2 className="font-serif text-lg mb-3">New lead</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Company *" value={f.company_name} onChange={set('company_name')} />
        <Field label="Contact name" value={f.contact_name} onChange={set('contact_name')} />
        <Field label="Contact email" value={f.contact_email} onChange={set('contact_email')} />
        <Field label="Country" value={f.country} onChange={set('country')} />
        <Field label="Industry" value={f.industry} onChange={set('industry')} />
        <Field label="Est. value (£)" value={f.estimated_value} onChange={set('estimated_value')} inputMode="decimal" />
        <Field label="Lead source" value={f.lead_source} onChange={set('lead_source')} />
      </div>
      {msg && <p className="text-sm text-[#a14b3d] mt-2">{msg}</p>}
      <div className="flex gap-2 mt-3">
        <button onClick={save} disabled={saving} className="bg-moss text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save lead'}</button>
        <button onClick={() => setOpen(false)} className="border border-[var(--line)] rounded-lg px-4 py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; inputMode?: 'decimal' }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input value={value} onChange={onChange} inputMode={inputMode}
        className="w-full border border-[var(--line)] rounded-lg px-3 py-2 text-sm mt-1" />
    </label>
  );
}
