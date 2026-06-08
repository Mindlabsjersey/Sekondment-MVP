'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/* ============================================================================
   Terms & agreement acceptance. Sekondment facilitates engagements; acceptance
   records provide an audit trail of who agreed to what version, when.
   ========================================================================== */

/** Record that the current user accepted the current version of a document kind. */
export async function acceptDocument(kind: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  // Find the current global document of this kind (jurisdiction logic can extend later).
  const { data: doc } = await supabase
    .from('legal_documents')
    .select('id')
    .eq('kind', kind)
    .eq('is_current', true)
    .eq('jurisdiction', 'global')
    .order('effective_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!doc) return { error: 'Document not found.' };

  const { error } = await supabase
    .from('document_acceptances')
    .insert({ account_id: user.id, document_id: doc.id });
  // 23505 = already accepted; treat as success.
  if (error && error.code !== '23505') return { error: error.message };

  return { success: true };
}

/** Has the current user accepted the current version of a document kind? */
export async function hasAcceptedDocument(kind: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: doc } = await supabase
    .from('legal_documents')
    .select('id')
    .eq('kind', kind).eq('is_current', true).eq('jurisdiction', 'global')
    .order('effective_at', { ascending: false }).limit(1).maybeSingle();
  if (!doc) return false;

  const { data: acc } = await supabase
    .from('document_acceptances')
    .select('id').eq('account_id', user.id).eq('document_id', doc.id).maybeSingle();
  return !!acc;
}

/** Both parties accept the engagement agreement before work/funding proceeds. */
export async function acceptEngagementAgreement(engagementId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const svc = createServiceClient();
  const { data: eng } = await svc
    .from('engagements')
    .select('id, terms_accepted_by_business_at, terms_accepted_by_expert_at, agreement_snapshot, business_profiles!inner(account_id), expert_profiles!inner(account_id)')
    .eq('id', engagementId).single();
  if (!eng) return { error: 'Engagement not found.' };

  const bAcc = (eng as any).business_profiles.account_id;
  const xAcc = (eng as any).expert_profiles.account_id;
  const isB = user.id === bAcc;
  const isX = user.id === xAcc;
  if (!isB && !isX) return { error: 'Not part of this engagement.' };

  const now = new Date().toISOString();
  const patch: Record<string, any> = {};
  if (isB) patch.terms_accepted_by_business_at = now;
  if (isX) patch.terms_accepted_by_expert_at = now;

  // Snapshot the current engagement terms on first acceptance.
  if (!eng.agreement_snapshot) {
    const { data: doc } = await svc
      .from('legal_documents').select('body, version').eq('kind', 'engagement_terms')
      .eq('is_current', true).eq('jurisdiction', 'global')
      .order('effective_at', { ascending: false }).limit(1).maybeSingle();
    if (doc) patch.agreement_snapshot = `[v${doc.version}] ${doc.body}`;
  }

  const { error } = await svc.from('engagements').update(patch).eq('id', engagementId);
  if (error) return { error: error.message };

  revalidatePath(`/engagements/${engagementId}`);
  return { success: true };
}
