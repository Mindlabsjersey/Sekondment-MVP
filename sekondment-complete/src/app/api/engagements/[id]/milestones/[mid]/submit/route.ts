import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { notify } from '@/lib/email/notify';

/**
 * POST /api/engagements/[id]/milestones/[mid]/submit
 * Expert marks a funded milestone as submitted for review.
 * Notifies the business owner so they can approve promptly.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const { id, mid } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClient();

  const { data: eng } = await supabase
    .from('engagements')
    .select('title, expert_profiles!inner(accounts!inner(id)), business_profiles!inner(account_id)')
    .eq('id', id).single();

  const expertAccountId = (eng as any)?.expert_profiles?.accounts?.id;
  if (expertAccountId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: milestone } = await supabase
    .from('milestones').select('id, title, status').eq('id', mid).eq('engagement_id', id).single();

  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  if (milestone.status !== 'funded') {
    return NextResponse.json({ error: `Milestone must be funded before submitting (current: ${milestone.status})` }, { status: 409 });
  }

  await svc.from('milestones')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', mid);

  await svc.from('activity_events').insert({
    engagement_id: id,
    actor_id: user.id,
    event_type: 'milestone_submitted',
    detail: { milestone_id: mid },
  });

  // Notify the business to review.
  try {
    const bizAccountId = (eng as any)?.business_profiles?.account_id;
    if (bizAccountId) {
      const { data: biz } = await svc.from('accounts').select('email').eq('id', bizAccountId).single();
      if (biz?.email) await notify.workSubmitted(biz.email, (milestone as any).title ?? 'Milestone', id);
    }
  } catch (e) { console.error('[notify workSubmitted]', (e as Error).message); }

  return NextResponse.json({ submitted: true });
}
