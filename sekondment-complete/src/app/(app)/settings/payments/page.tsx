'use client';

import { useEffect, useState } from 'react';

type Status = {
  connected: boolean;
  onboardingComplete?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
};

export default function PaymentsSettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/stripe/connect');
    setStatus(res.ok ? await res.json() : { connected: false });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function startOnboarding() {
    setStarting(true);
    const res = await fetch('/api/stripe/connect', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url; // hosted Stripe onboarding
    else setStarting(false);
  }

  const complete = status?.onboardingComplete;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <a href="/settings" className="text-muted text-sm hover:text-ink transition mb-6 inline-block">← Back to settings</a>
      <span className="badge-verified mb-5">Payments</span>
      <h1 className="font-serif text-4xl tracking-tight mb-2">Get paid through Sekondment</h1>
      <p className="text-muted text-lg mb-8">
        Connect a payout account so escrow funds can be released to you when milestones are approved.
        Onboarding is handled securely by Stripe.
      </p>

      {loading ? (
        <div className="card animate-pulse h-32" />
      ) : (
        <div className="bg-white border border-[var(--line)] rounded-xl2 p-7 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl mb-1">Payout account</h2>
              <p className="text-muted text-sm">
                {complete
                  ? 'Your account is fully set up — you can receive payouts.'
                  : status?.connected
                  ? 'Onboarding started but not finished. Resume to enable payouts.'
                  : 'Not connected yet. Set up to start receiving payouts.'}
              </p>
            </div>
            <StatusPill complete={complete} connected={status?.connected} />
          </div>

          {complete ? (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Check label="Charges enabled" ok={status?.chargesEnabled} />
              <Check label="Payouts enabled" ok={status?.payoutsEnabled} />
            </div>
          ) : (
            <button
              onClick={startOnboarding}
              disabled={starting}
              className="btn btn-primary btn-lg w-full mt-6 disabled:opacity-60"
            >
              {starting ? 'Opening secure onboarding…' : status?.connected ? 'Resume onboarding →' : 'Set up payouts →'}
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-muted mt-5 leading-relaxed">
        Sekondment holds funded milestone amounts on its platform balance and releases them via
        Stripe transfers when you approve work. This replicates escrow; it is not a regulated escrow
        account.
      </p>
    </div>
  );
}

function StatusPill({ complete, connected }: { complete?: boolean; connected?: boolean }) {
  const [label, cls] = complete
    ? ['Active', 'text-moss bg-moss/10']
    : connected
    ? ['In progress', 'text-[#b8862f] bg-[#b8862f]/12']
    : ['Not set up', 'text-muted bg-muted/10'];
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${cls}`}>{label}</span>;
}

function Check({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${ok ? 'bg-moss' : 'bg-muted/40'}`}>
        {ok ? '✓' : ''}
      </span>
      {label}
    </div>
  );
}
