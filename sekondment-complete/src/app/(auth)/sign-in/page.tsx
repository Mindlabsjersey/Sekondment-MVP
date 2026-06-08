'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn, signInWithOAuth } from '../actions';

export default function SignInPage() {
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set('redirect', redirect);
    const res = await signIn(formData);
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

        <h1 className="font-serif text-3xl mb-2 tracking-tight">Welcome back</h1>
        <p className="text-muted mb-7">Sign in to your account.</p>

        <div className="space-y-2.5 mb-5">
          <button onClick={() => signInWithOAuth('google')} className="btn btn-ghost w-full">
            Continue with Google
          </button>
          <button onClick={() => signInWithOAuth('linkedin_oidc')} className="btn btn-ghost w-full">
            Continue with LinkedIn
          </button>
        </div>

        <div className="flex items-center gap-3 my-5 text-muted text-sm">
          <span className="h-px flex-1 bg-[var(--line)]" /> or <span className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="field" placeholder="you@company.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required className="field" placeholder="Your password" />
          </div>

          {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full disabled:opacity-60">
            {pending ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <p className="text-sm text-muted text-center mt-6">
          New to Sekondment?{' '}
          <Link href="/sign-up" className="text-moss font-medium hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
