import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BusinessOnboardingForm from './BusinessOnboardingForm';
import ExpertOnboardingForm from './ExpertOnboardingForm';
import PartnerOnboardingForm from './PartnerOnboardingForm';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts')
    .select('account_type, full_name')
    .eq('id', user.id)
    .single();

  const type = account?.account_type;
  const isBusiness = type === 'business';
  const isPartner = type === 'employer_partner';
  // 'employee' is an expert account whose sign-up persona was Employee. They get
  // the extra "are you deployed by your employer?" question.
  const signupIntent = (user.user_metadata as { signup_intent?: string } | null)?.signup_intent;
  const isEmployee = type === 'expert' && signupIntent === 'employee';

  // For the employer picker, load businesses the employee can match themselves to.
  let businesses: { id: string; company_name: string }[] = [];
  if (isEmployee) {
    const { data } = await supabase
      .from('business_profiles')
      .select('id, company_name')
      .order('company_name', { ascending: true });
    businesses = data ?? [];
  }

  const heading = isBusiness ? 'Tell us about your business'
    : isPartner ? 'Set up your company'
    : isEmployee ? 'Set up your employee profile'
    : 'Build your expert profile';
  const sub = isBusiness
    ? 'This is what experts see when you engage them. You can refine it any time.'
    : isPartner
    ? 'Register your company so you can deploy employees through Sekondment and earn commission.'
    : isEmployee
    ? 'Tell us how you work. If your employer deploys you, match yourself to them — they approve you before you go live.'
    : 'This is your storefront. A complete profile earns a higher Trust Score and better opportunities.';

  return (
    <div className="min-h-screen px-6 py-14 relative z-10">
      <div className="max-w-2xl mx-auto">
        <span className="badge-verified mb-5">Step 1 of 2 · Profile</span>
        <h1 className="font-serif text-4xl tracking-tight mb-2">{heading}</h1>
        <p className="text-muted text-lg mb-9">{sub}</p>

        <div className="bg-white border border-[var(--line)] rounded-xl2 p-7 sm:p-9 shadow-soft">
          {isBusiness && <BusinessOnboardingForm defaultName={account?.full_name ?? undefined} />}
          {isPartner && <PartnerOnboardingForm defaultName={account?.full_name ?? undefined} />}
          {!isBusiness && !isPartner && (
            <ExpertOnboardingForm
              defaultName={account?.full_name ?? undefined}
              employeeIntent={isEmployee}
              businesses={businesses}
            />
          )}
        </div>
      </div>
    </div>
  );
}
