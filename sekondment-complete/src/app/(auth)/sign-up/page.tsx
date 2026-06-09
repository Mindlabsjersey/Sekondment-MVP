'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp, signInWithOAuth } from '../actions';
import type { AccountType } from '@/lib/types/database';

// UI personas. 'employee' is an expert account whose onboarding asks about
// employer deployment — the DB account_type below stays business/expert.
type Persona = 'business' | 'expert' | 'employee';
const PERSONAS: { id: Persona; label: string }[] = [
  { id: 'business', label: 'Business' },
  { id: 'expert', label: 'Expert / Freelancer' },
  { id: 'employee', label: 'Employee' },
];
function accountTypeFor(role: Persona): AccountType {
  return role === 'business' ? 'business' : 'expert';
}

export default function SignUpPage() {
  const [role, setRole] = useState<Persona>('business');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set('account_type', accountTypeFor(role));
    formData.set('signup_intent', role);
    const res = await signUp(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 relative z-10">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2.5 font-serif font-semibold text-xl mb-8">
          <span className="w-6 h-6 rounded-md bg-moss relative after:content-[''] after:absolute after:top-1.5 after:right-1.5 after:w-2 after:h-2 after:rounded-sm after:bg-sand" />
          Sekondment
        </Link>

        <h1 className="font-serif text-3xl mb-2 tracking-tight">Create your account</h1>
        <p className="text-muted mb-7">Deploy expertise, not headcount.</p>

        {/* Persona toggle — defines the entire experience */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-paper-2 rounded-xl mb-6">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRole(p.id)}
              className={`py-2.5 px-1 rounded-lg text-xs font-medium leading-tight transition ${
                role === p.id ? 'bg-white shadow-sm text-[#0f1419]' : 'text-muted hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="text-[13px] text-muted mb-6 -mt-2">
          {role === 'business'
            ? 'Hire verified experts through secure, milestone-based work — and deploy your own team.'
            : role === 'expert'
            ? 'Deploy your expertise and find opportunities worth doing.'
            : 'Work independently or be deployed by your employer. You can match yourself to your company, who approves you before you go live.'}
        </p>

        <div className="space-y-2.5 mb-5">
          <button onClick={() => signInWithOAuth('google', accountTypeFor(role), role)} className="btn btn-ghost w-full">
            Continue with Google
          </button>
          <button onClick={() => signInWithOAuth('linkedin_oidc', accountTypeFor(role), role)} className="btn btn-ghost w-full">
            Continue with LinkedIn
          </button>
        </div>

        <div className="flex items-center gap-3 my-5 text-muted text-sm">
          <span className="h-px flex-1 bg-[var(--line)]" /> or <span className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label className="label" htmlFor="full_name">
              {role === 'business' ? 'Company name' : 'Full name'}
            </label>
            <input id="full_name" name="full_name" required className="field"
              placeholder={role === 'business' ? 'Acme Studio' : 'Jane Doe'} />
          </div>
          <div>
            <label className="label" htmlFor="email">Work email</label>
            <input id="email" name="email" type="email" required className="field" placeholder="you@company.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={8}
              className="field" placeholder="At least 8 characters" />
          </div>

          {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <label className="flex items-start gap-2.5 text-sm text-muted cursor-pointer">
            <input type="checkbox" name="accept_terms" required className="mt-0.5 accent-moss" />
            <span>
              I agree to the{' '}
              <a href="/terms" target="_blank" className="text-moss font-medium underline">Platform Terms</a>{' '}
              and{' '}
              <a href="/terms#privacy_policy" target="_blank" className="text-moss font-medium underline">Privacy Policy</a>.
            </span>
          </label>

          <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full disabled:opacity-60">
            {pending ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        <p className="text-sm text-muted text-center mt-6">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-moss font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
