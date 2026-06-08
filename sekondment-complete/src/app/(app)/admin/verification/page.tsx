import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import VerificationCard from './VerificationCard';
import VerificationDocRow from './VerificationDocRow';

export default async function AdminVerificationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'admin') redirect('/dashboard');

  // Pending/unverified experts and businesses.
  const { data: experts } = await supabase
    .from('expert_profiles')
    .select('id, name, headline, linkedin_url, certifications, email_verified, identity_verified, linkedin_verified, certification_verified, verification_status, trust_score')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: businesses } = await supabase
    .from('business_profiles')
    .select('id, company_name, website, email_verified, company_verified, director_verified, verification_status, trust_score')
    .order('created_at', { ascending: false })
    .limit(50);

  const pendingExperts = (experts ?? []).filter((e) => e.verification_status !== 'verified');
  const pendingBusinesses = (businesses ?? []).filter((b) => b.verification_status !== 'verified');

  // Uploaded verification documents awaiting review.
  const { createServiceClient } = await import('@/lib/supabase/server');
  const svc = createServiceClient();
  const { data: docs } = await svc
    .from('verification_documents')
    .select('id, doc_type, file_path, status, created_at, accounts:account_id(full_name, email)')
    .eq('status', 'submitted')
    .order('created_at', { ascending: false })
    .limit(50);
  const pendingDocs = docs ?? [];

  return (
    <AppShell accountType="admin">
      <h1 className="font-serif text-4xl tracking-tight mb-1">Verification queue</h1>
      <p className="text-muted mb-8">Review and verify experts and businesses. Each change recalculates their Trust Score.</p>

      {pendingDocs.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-xl mb-4">
            Documents to review <span className="text-muted font-normal text-base">({pendingDocs.length})</span>
          </h2>
          <div className="grid gap-2.5">
            {pendingDocs.map((d: any) => (
              <VerificationDocRow key={d.id} doc={d} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="font-serif text-xl mb-4">
          Experts <span className="text-muted font-normal text-base">({pendingExperts.length} unverified)</span>
        </h2>
        {pendingExperts.length === 0 ? (
          <div className="card text-center py-8 text-muted text-sm">All experts verified.</div>
        ) : (
          <div className="grid gap-3">
            {pendingExperts.map((e) => (
              <VerificationCard
                key={e.id}
                kind="expert"
                id={e.id}
                name={e.name}
                subtitle={e.headline ?? undefined}
                meta={[
                  e.linkedin_url ? `LinkedIn: ${e.linkedin_url}` : null,
                  e.certifications?.length ? `${e.certifications.length} certifications` : null,
                ].filter(Boolean) as string[]}
                trustScore={e.trust_score}
                flags={{
                  email_verified: e.email_verified,
                  identity_verified: e.identity_verified,
                  linkedin_verified: e.linkedin_verified,
                  certification_verified: e.certification_verified,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-xl mb-4">
          Businesses <span className="text-muted font-normal text-base">({pendingBusinesses.length} unverified)</span>
        </h2>
        {pendingBusinesses.length === 0 ? (
          <div className="card text-center py-8 text-muted text-sm">All businesses verified.</div>
        ) : (
          <div className="grid gap-3">
            {pendingBusinesses.map((b) => (
              <VerificationCard
                key={b.id}
                kind="business"
                id={b.id}
                name={b.company_name}
                subtitle={b.website ?? undefined}
                meta={[]}
                trustScore={b.trust_score}
                flags={{
                  email_verified: b.email_verified,
                  company_verified: b.company_verified,
                  director_verified: b.director_verified,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
