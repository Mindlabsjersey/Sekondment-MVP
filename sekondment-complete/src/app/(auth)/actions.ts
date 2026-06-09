'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { AccountType } from '@/lib/types/database';

export async function signUp(formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const fullName = String(formData.get('full_name'));
  const accountType = String(formData.get('account_type')) as AccountType;
  // UI persona: 'business' | 'expert' | 'employee'. 'employee' is an expert
  // account whose onboarding asks about employer deployment. We persist it so
  // onboarding can branch; the DB account_type is still business/expert.
  const signupIntent = String(formData.get('signup_intent') || '') || null;

  if (!['business', 'expert', 'employer_partner'].includes(accountType)) {
    return { error: 'Please choose how you want to use Sekondment.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // account_type is read by the handle_new_user() trigger to create the
      // correct account row. signup_intent is read by the onboarding page.
      data: { account_type: accountType, full_name: fullName, signup_intent: signupIntent },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  redirect('/sign-up/check-email');
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const redirectTo = String(formData.get('redirect') || '/dashboard');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function signInWithOAuth(
  provider: 'google' | 'linkedin_oidc',
  accountType?: AccountType,
  signupIntent?: string,
) {
  const supabase = await createClient();
  // account_type can't ride through the provider reliably, so we carry it on our
  // own callback URL and apply it after the session is created.
  const callback = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`);
  if (accountType) callback.searchParams.set('account_type', accountType);
  if (signupIntent) callback.searchParams.set('signup_intent', signupIntent);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callback.toString(),
    },
  });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
