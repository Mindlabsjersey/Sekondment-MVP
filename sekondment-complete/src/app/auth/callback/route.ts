import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { AccountType } from '@/lib/types/database';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const accountType = searchParams.get('account_type') as AccountType | null;
  const signupIntent = searchParams.get('signup_intent');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Persist the UI persona (business/expert/employee) onto the user so the
      // onboarding page can ask the employee deployment question.
      if (signupIntent) {
        await supabase.auth.updateUser({ data: { signup_intent: signupIntent } });
      }
      // OAuth can't carry account_type through the provider, so the
      // handle_new_user trigger may have defaulted a new user to 'expert'.
      // If this OAuth flow specified a different intended type AND the account
      // is brand new (no profile yet), correct it here.
      if (accountType && ['business', 'expert', 'employer_partner'].includes(accountType)) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const svc = createServiceClient();
          const { data: acc } = await svc
            .from('accounts').select('account_type').eq('id', user.id).single();
          // Only correct if no profile exists yet (i.e. they haven't onboarded),
          // so we never reassign an established account.
          const tables = { business: 'business_profiles', expert: 'expert_profiles', employer_partner: 'employer_partners' } as const;
          let hasProfile = false;
          if (acc) {
            const t = tables[acc.account_type as keyof typeof tables];
            if (t) {
              const { data: p } = await svc.from(t).select('id').eq('account_id', user.id).maybeSingle();
              hasProfile = !!p;
            }
          }
          if (acc && acc.account_type !== accountType && !hasProfile) {
            await svc.from('accounts').update({ account_type: accountType }).eq('id', user.id);
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
