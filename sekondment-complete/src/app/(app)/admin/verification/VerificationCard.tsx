'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setExpertVerification, setBusinessVerification } from './actions';

const EXPERT_FLAGS: { key: string; label: string }[] = [
  { key: 'email_verified', label: 'Email' },
  { key: 'identity_verified', label: 'Identity' },
  { key: 'linkedin_verified', label: 'LinkedIn' },
  { key: 'certification_verified', label: 'Certifications' },
];
const BUSINESS_FLAGS: { key: string; label: string }[] = [
  { key: 'email_verified', label: 'Email' },
  { key: 'company_verified', label: 'Company' },
  { key: 'director_verified', label: 'Director' },
];

export default function VerificationCard({
  kind, id, name, subtitle, meta, trustScore, flags,
}: {
  kind: 'expert' | 'business';
  id: string;
  name: string;
  subtitle?: string;
  meta: string[];
  trustScore: number;
  flags: Record<string, boolean>;
}) {
  const router = useRouter();
  const [state, setState] = useState(flags);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flagList = kind === 'expert' ? EXPERT_FLAGS : BUSINESS_FLAGS;

  async function toggle(key: string) {
    const next = !state[key];
    setPending(key); setError(null);
    setState((s) => ({ ...s, [key]: next })); // optimistic

    const res = kind === 'expert'
      ? await setExpertVerification(id, key as any, next)
      : await setBusinessVerification(id, key as any, next);

    if (res && 'error' in res && res.error) {
      setError(res.error);
      setState((s) => ({ ...s, [key]: !next })); // revert
    } else {
      router.refresh();
    }
    setPending(null);
  }

  return (
    <div className="bg-white border border-[var(--line)] rounded-xl p-5">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-moss to-moss-2 text-white flex items-center justify-center font-serif font-semibold text-sm flex-none">
            {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-serif font-semibold">{name}</p>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        <span className="text-sm text-muted">Trust {trustScore}</span>
      </div>

      {meta.length > 0 && (
        <div className="mt-3 text-xs text-muted space-y-0.5">
          {meta.map((m) => <p key={m}>{m}</p>)}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {flagList.map(({ key, label }) => {
          const on = state[key];
          return (
            <button key={key} onClick={() => toggle(key)} disabled={pending === key}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition disabled:opacity-50 ${
                on ? 'bg-moss text-white border-moss' : 'bg-white border-[var(--line)] text-muted hover:text-ink'
              }`}>
              {on ? '✓ ' : ''}{label}
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
    </div>
  );
}
