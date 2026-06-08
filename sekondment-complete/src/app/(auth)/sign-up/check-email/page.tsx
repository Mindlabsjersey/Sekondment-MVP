import Link from 'next/link';

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative z-10">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-moss/10 flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-moss fill-none" strokeWidth={1.7}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl mb-3 tracking-tight">Check your email</h1>
        <p className="text-muted mb-7">
          We've sent a verification link to confirm your account. Click it to activate your
          Sekondment profile and get started.
        </p>
        <Link href="/sign-in" className="btn btn-ghost btn-lg">Back to sign in</Link>
      </div>
    </div>
  );
}
