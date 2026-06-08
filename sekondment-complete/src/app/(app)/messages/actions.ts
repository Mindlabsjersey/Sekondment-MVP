'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { screenMessage } from '@/lib/messaging/filter';
import { revalidatePath } from 'next/cache';

/* ============================================================================
   Messaging actions. Conversations are unique per (business, expert) pair.
   Sending runs the anti-circumvention filter and flags (not blocks) matches.
   ========================================================================== */

/** Resolve or create the conversation between the caller and a counterparty. */
export async function getOrCreateConversation(params: {
  businessId?: string;
  expertId?: string;
  expertAccountId?: string;   // alternative: resolve expert by their account_id
  engagementId?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  let { businessId, expertId } = params;

  // Resolve expertId from expertAccountId if provided (used by the expert profile CTA).
  if (params.expertAccountId && !expertId) {
    const { data: ep } = await supabase
      .from('expert_profiles').select('id').eq('account_id', params.expertAccountId).single();
    expertId = ep?.id;
  }

  // Fill in the caller's own side from their profile.
  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();

  if (account?.account_type === 'business') {
    const { data: b } = await supabase.from('business_profiles').select('id').eq('account_id', user.id).single();
    businessId = b?.id;
  } else if (account?.account_type === 'expert') {
    const { data: e } = await supabase.from('expert_profiles').select('id').eq('account_id', user.id).single();
    expertId = e?.id;
  }

  if (!businessId || !expertId) return { error: 'Both parties are required.' };

  const svc = createServiceClient();
  const { data: existing } = await svc
    .from('conversations').select('id')
    .eq('business_id', businessId).eq('expert_id', expertId).maybeSingle();

  if (existing) return { conversationId: existing.id };

  const { data: created, error } = await svc
    .from('conversations')
    .insert({ business_id: businessId, expert_id: expertId, engagement_id: params.engagementId ?? null })
    .select('id').single();
  if (error) return { error: error.message };
  return { conversationId: created.id };
}

export async function sendMessage(conversationId: string, body: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  if (!body.trim()) return { error: 'Empty message.' };

  // Verify the caller is a participant (RLS also enforces this).
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, business_profiles!inner(account_id), expert_profiles!inner(account_id)')
    .eq('id', conversationId).single();
  if (!conv) return { error: 'Conversation not found.' };
  const bAcc = (conv as any).business_profiles.account_id;
  const eAcc = (conv as any).expert_profiles.account_id;
  if (user.id !== bAcc && user.id !== eAcc) return { error: 'Forbidden.' };

  const { flagged, reason } = screenMessage(body);

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: body.trim(),
    flagged,
    flag_reason: reason,
  });
  if (error) return { error: error.message };

  revalidatePath(`/messages/${conversationId}`);
  return { success: true, flagged };
}

export async function markRead(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // Mark counterparty's unread messages as read.
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null);
}
