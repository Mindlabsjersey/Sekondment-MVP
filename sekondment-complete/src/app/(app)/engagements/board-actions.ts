'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/* Trello-style board, one per engagement. Parties collaborate on cards. */

async function partyGuard(engagementId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' as const };
  const svc = createServiceClient();
  const { data: eng } = await svc
    .from('engagements')
    .select('id, business_profiles!inner(account_id), expert_profiles!inner(account_id)')
    .eq('id', engagementId).single();
  if (!eng) return { error: 'Engagement not found.' as const };
  const ok = [(eng as any).business_profiles.account_id, (eng as any).expert_profiles.account_id].includes(user.id);
  if (!ok) return { error: 'Forbidden.' as const };
  return { user, svc };
}

/** Get or create the board for an engagement, seeding default columns. */
export async function ensureBoard(engagementId: string) {
  const g = await partyGuard(engagementId);
  if ('error' in g) return g;
  const { svc } = g;

  let { data: board } = await svc.from('boards').select('id').eq('engagement_id', engagementId).maybeSingle();
  if (!board) {
    const { data: created } = await svc.from('boards').insert({ engagement_id: engagementId }).select('id').single();
    board = created;
    if (board) {
      const defaults = ['To do', 'In progress', 'In review', 'Done'];
      await svc.from('board_columns').insert(
        defaults.map((title, i) => ({ board_id: board!.id, title, position: i }))
      );
    }
  }
  return { boardId: board!.id };
}

export async function addCard(engagementId: string, columnId: string, title: string) {
  const g = await partyGuard(engagementId);
  if ('error' in g) return g;
  if (!title.trim()) return { error: 'Card needs a title.' };
  const { svc, user } = g;
  const { count } = await svc.from('board_cards').select('id', { count: 'exact', head: true }).eq('column_id', columnId);
  const { error } = await svc.from('board_cards').insert({
    column_id: columnId, title: title.trim(), position: count ?? 0, created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/engagements/${engagementId}`);
  return { success: true };
}

export async function moveCard(engagementId: string, cardId: string, toColumnId: string, toPosition: number) {
  const g = await partyGuard(engagementId);
  if ('error' in g) return g;
  const { svc } = g;
  const { error } = await svc.from('board_cards')
    .update({ column_id: toColumnId, position: toPosition, updated_at: new Date().toISOString() })
    .eq('id', cardId);
  if (error) return { error: error.message };
  revalidatePath(`/engagements/${engagementId}`);
  return { success: true };
}

export async function updateCard(engagementId: string, cardId: string, fields: { title?: string; description?: string }) {
  const g = await partyGuard(engagementId);
  if ('error' in g) return g;
  const { svc } = g;
  const { error } = await svc.from('board_cards')
    .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', cardId);
  if (error) return { error: error.message };
  revalidatePath(`/engagements/${engagementId}`);
  return { success: true };
}

export async function deleteCard(engagementId: string, cardId: string) {
  const g = await partyGuard(engagementId);
  if ('error' in g) return g;
  const { svc } = g;
  await svc.from('board_cards').delete().eq('id', cardId);
  revalidatePath(`/engagements/${engagementId}`);
  return { success: true };
}

export async function addColumn(engagementId: string, boardId: string, title: string) {
  const g = await partyGuard(engagementId);
  if ('error' in g) return g;
  if (!title.trim()) return { error: 'Column needs a title.' };
  const { svc } = g;
  const { count } = await svc.from('board_columns').select('id', { count: 'exact', head: true }).eq('board_id', boardId);
  const { error } = await svc.from('board_columns').insert({ board_id: boardId, title: title.trim(), position: count ?? 0 });
  if (error) return { error: error.message };
  revalidatePath(`/engagements/${engagementId}`);
  return { success: true };
}
