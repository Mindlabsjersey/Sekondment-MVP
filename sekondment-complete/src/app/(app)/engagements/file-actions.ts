'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { uploadEngagementFile } from '@/lib/storage/files';
import { revalidatePath } from 'next/cache';

async function assertParty(engagementId: string, userId: string) {
  const svc = createServiceClient();
  const { data: eng } = await svc
    .from('engagements')
    .select('id, business_profiles!inner(account_id), expert_profiles!inner(account_id)')
    .eq('id', engagementId).single();
  if (!eng) return false;
  const b = (eng as any).business_profiles.account_id;
  const x = (eng as any).expert_profiles.account_id;
  return userId === b || userId === x;
}

/** Expert uploads a deliverable file against a milestone. */
export async function uploadDeliverable(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const engagementId = String(formData.get('engagement_id'));
  const milestoneId = String(formData.get('milestone_id'));
  const title = String(formData.get('title') || 'Deliverable').trim();
  const note = String(formData.get('note') || '') || null;
  const file = formData.get('file') as File | null;

  if (!(await assertParty(engagementId, user.id))) return { error: 'Not part of this engagement.' };
  if (!file || file.size === 0) return { error: 'Please choose a file.' };
  if (file.size > 25 * 1024 * 1024) return { error: 'File must be under 25MB.' };

  const up = await uploadEngagementFile(engagementId, file);
  if ('error' in up) return { error: up.error };

  const svc = createServiceClient();
  const { error } = await svc.from('deliverables').insert({
    milestone_id: milestoneId,
    title,
    note,
    file_url: up.path,
    file_name: up.name,
    file_size: up.size,
    uploaded_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/engagements/${engagementId}`);
  return { success: true };
}

/** Attach a file to a message (sends a message row with file metadata). */
export async function sendFileMessage(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const conversationId = String(formData.get('conversation_id'));
  const engagementId = String(formData.get('engagement_id') || '');
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'Please choose a file.' };
  if (file.size > 25 * 1024 * 1024) return { error: 'File must be under 25MB.' };

  // Files require an engagement context for the secure bucket path.
  if (!engagementId) return { error: 'Files can be shared within an active engagement.' };
  if (!(await assertParty(engagementId, user.id))) return { error: 'Not part of this engagement.' };

  const up = await uploadEngagementFile(engagementId, file);
  if ('error' in up) return { error: up.error };

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: `📎 ${up.name}`,
    file_url: up.path,
  });
  if (error) return { error: error.message };

  revalidatePath(`/messages/${conversationId}`);
  return { success: true };
}
