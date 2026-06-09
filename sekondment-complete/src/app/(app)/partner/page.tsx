import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Legacy employer partner page - redirects to business dashboard
// All employer functionality is now handled through the Business persona
export default async function PartnerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  
  // Redirect business users to their dashboard
  // Legacy employer_partner accounts should migrate to business
  if (account?.account_type === 'business') {
    redirect('/dashboard');
  }
  
  // Redirect all others to dashboard
  redirect('/dashboard');
}
