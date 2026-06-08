'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logCompliance } from '@/lib/compliance/log';

const BUCKET = 'verification-docs';

/** User uploads a verification document (identity, insurance, certification, …). */
export async function uploadVerificationDoc(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const docType = String(formData.get('doc_type') || '');
  const note = String(formData.get('note') || '') || null;
  const file = formData.get('file') as File | null;
  if (!docType) return { error: 'Choose a document type.' };
  if (!file || file.size === 0) return { error: 'Choose a file.' };
  if (file.size > 15 * 1024 * 1024) return { error: 'File must be under 15MB.' };

  const safe = file.name.replace(/[^\w.\-]/g, '_');
  const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false, contentType: file.type || 'application/octet-stream',
  });
  if (upErr) return { error: upErr.message };

  const svc = createServiceClient();
  const { error } = await svc.from('verification_documents').insert({
    account_id: user.id, doc_type: docType, file_path: path, note, status: 'submitted',
  });
  if (error) return { error: error.message };

  await logCompliance({ type: 'verification_document_uploaded', accountId: user.id, detail: { doc_type: docType } });
  if (docType === 'identity') await logCompliance({ type: 'identity_submitted', accountId: user.id });
  if (docType === 'right_to_work') await logCompliance({ type: 'right_to_work_noted', accountId: user.id });

  revalidatePath('/settings');
  return { success: true };
}

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' as const };
  const { data: me } = await supabase.from('accounts').select('account_type').eq('id', user.id).single();
  if (me?.account_type !== 'admin') return { error: 'Admin only.' as const };
  return { svc: createServiceClient(), userId: user.id };
}

export async function reviewVerificationDoc(docId: string, decision: 'approved' | 'rejected', note?: string) {
  const g = await assertAdmin();
  if ('error' in g) return g;
  const { data: doc } = await g.svc.from('verification_documents').select('account_id, doc_type').eq('id', docId).single();
  const { error } = await g.svc.from('verification_documents')
    .update({ status: decision, reviewed_by: g.userId, reviewed_at: new Date().toISOString(), note: note ?? null })
    .eq('id', docId);
  if (error) return { error: error.message };

  if (decision === 'rejected') {
    await logCompliance({ type: 'verification_document_rejected', accountId: doc?.account_id, actorId: g.userId, detail: { doc_type: doc?.doc_type } });
  }
  revalidatePath('/admin/verification');
  return { success: true };
}
