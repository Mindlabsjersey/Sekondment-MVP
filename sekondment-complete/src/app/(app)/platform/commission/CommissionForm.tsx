'use client';

import { useState } from 'react';
import { setSiteFee, setCompanyFee } from './commission-actions';

type Company = { id: string; name: string; override: number | null };

export function CommissionForm({ siteFee, isOwner, companies }: { siteFee: number; isOwner: boolean; companies: Company[] }) {
  const [site, setSite] = useState(siteFee);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const presets = [15, 12.5, 10];

  async function saveSite(val: number) {
    setSaving(true); setMsg(null);
    const r = await setSiteFee(val);
    setSaving(false);
    setMsg(r.ok ? `Site-wide fee set to ${val}%.` : r.error ?? 'Failed.');
    if (r.ok) setSite(val);
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-serif text-xl mb-1">Site-wide default</h2>
        <p className="text-muted text-sm mb-4">Applies to every new engagement unless a company has an override. Currently <strong className="text-ink">{site}%</strong>.</p>
        {!isOwner ? (
          <p className="text-sm text-muted">Only the platform owner can change this.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((p) => (
              <button key={p} disabled={saving} onClick={() => saveSite(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${site === p ? 'bg-moss text-white' : 'border border-[var(--line)] text-ink hover:bg-paper-2'}`}>
                {p}%
              </button>
            ))}
            <span className="text-xs text-muted ml-2">12.5% standard reduction · 10% for rare high-value deals</span>
          </div>
        )}
        {msg && <p className="text-sm mt-3 text-moss">{msg}</p>}
      </div>

      {isOwner && companies.length > 0 && (
        <div className="card">
          <h2 className="font-serif text-xl mb-1">Per-company overrides</h2>
          <p className="text-muted text-sm mb-4">Set a custom rate for specific companies (e.g. a 10% rate for a large client). Blank = uses the site default.</p>
          <div className="divide-y divide-[var(--line)]">
            {companies.map((c) => <CompanyRow key={c.id} company={c} siteFee={site} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function CompanyRow({ company, siteFee }: { company: Company; siteFee: number }) {
  const [val, setVal] = useState<string>(company.override != null ? String(company.override) : '');
  const [state, setState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true); setState(null);
    const pct = val.trim() === '' ? null : Number(val);
    const r = await setCompanyFee(company.id, pct);
    setSaving(false);
    setState(r.ok ? 'Saved' : (r.error ?? 'Failed'));
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-sm truncate flex-1">{company.name}</span>
      <span className="text-xs text-muted flex-none">default {siteFee}%</span>
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="—" inputMode="decimal"
        className="w-20 border border-[var(--line)] rounded-lg px-2 py-1.5 text-sm text-right" />
      <span className="text-sm text-muted">%</span>
      <button disabled={saving} onClick={save}
        className="px-3 py-1.5 rounded-lg text-sm bg-moss text-white disabled:opacity-50">{saving ? '…' : 'Save'}</button>
      {state && <span className="text-xs text-moss flex-none w-12">{state}</span>}
    </div>
  );
}
