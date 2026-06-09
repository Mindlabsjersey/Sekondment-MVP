import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import ProfileEditor from './ProfileEditor';
import LogoUpload from './LogoUpload';
import VerificationUpload from './VerificationUpload';
import ExpertisePicker from './ExpertisePicker';
import CVImport from './CVImport';
import EmployerSettings from './EmployerSettings';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type, email').eq('id', user.id).single();
  if (!account) redirect('/sign-in');

  // Normalize legacy employer_partner -> business
  const type = account.account_type === 'employer_partner' ? 'business' : account.account_type;
  let profile: any = null;
  if (type === 'expert') {
    const { data } = await supabase.from('expert_profiles').select('*').eq('account_id', user.id).single();
    profile = data;
  } else if (type === 'business') {
    const { data } = await supabase.from('business_profiles').select(`
      *,
      default_approval_required,
      default_revenue_share_employer_pct,
      default_revenue_share_employee_pct,
      max_hours_per_week,
      allow_external_projects
    `).eq('account_id', user.id).single();
    profile = data;
  }

  const showPayments = type === 'expert' || type === 'business';

  // Load this user's verification documents for the evidence panel.
  const { data: verifDocs } = await supabase
    .from('verification_documents')
    .select('id, doc_type, status, created_at')
    .eq('account_id', user.id)
    .order('created_at', { ascending: false });

  // For experts, load their structured expertise tags.
  let expertiseTags: any[] = [];
  if (type === 'expert' && profile) {
    const { data: pe } = await supabase
      .from('profile_expertise')
      .select('expertise_id, declared_level, verification_level, expertise_taxonomy(id, name, type)')
      .eq('profile_id', profile.id).eq('profile_type', 'expert');
    expertiseTags = (pe ?? []).map((r: any) => ({
      id: r.expertise_taxonomy?.id, name: r.expertise_taxonomy?.name,
      type: r.expertise_taxonomy?.type, verification_level: r.verification_level,
      declared_level: r.declared_level,
    })).filter((t: any) => t.id);
  }

  return (
    <AppShell accountType={type}>
      <h1 className="font-serif text-4xl tracking-tight mb-1">Settings</h1>
      <p className="text-muted mb-8">Manage your profile and account.</p>

      <div className="flex gap-2 mb-8 border-b border-[var(--line)]">
        <span className="px-1 pb-3 -mb-px border-b-2 border-moss font-medium text-sm">Profile</span>
        {showPayments && (
          <Link href="/settings/payments" className="px-4 pb-3 -mb-px text-sm text-muted hover:text-ink">Payments</Link>
        )}
      </div>

      {profile ? (
        <>
          {type === 'expert' ? (
            <LogoUpload accountId={user.id} current={profile.photo_url ?? null} label="Profile photo" rounded="rounded-full" />
          ) : (
            <LogoUpload accountId={user.id} current={profile.logo_url ?? null} label="Company logo" />
          )}
          <ProfileEditor type={type} profile={profile} email={account.email} />
          {type === 'expert' && <ExpertisePicker existing={expertiseTags} />}
          {type === 'expert' && <CVImport />}
          {type === 'business' && <EmployerSettings profile={profile} />}
          {type !== 'admin' && <VerificationUpload existing={verifDocs ?? []} />}
        </>
      ) : (
        <div className="card text-center py-12 text-muted">
          <p className="font-serif text-lg text-ink mb-2">Profile not set up yet</p>
          <Link href="/onboarding" className="btn btn-primary mt-2">Complete onboarding →</Link>
        </div>
      )}
    </AppShell>
  );
}
