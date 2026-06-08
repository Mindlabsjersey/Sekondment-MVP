import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import EngagementClient from './EngagementClient';

export default async function EngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type, stripe_onboarding_done').eq('id', user.id).single();
  if (!account) redirect('/sign-in');

  const { data: eng } = await supabase
    .from('engagements')
    .select(`
      id, title, status, total_amount, currency, payee_type,
      resource_split_to_expert, platform_fee_pct,
      business_profiles(company_name, account_id),
      expert_profiles(name, headline, employer_partner_id, employing_business_id, accounts(id))
    `)
    .eq('id', id)
    .single();

  if (!eng) redirect('/dashboard');

  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .eq('engagement_id', id)
    .order('sort_order');

  const { data: ledger } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('engagement_id', id)
    .order('created_at', { ascending: false });

  // Reviews on this engagement (both directions, if present).
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('engagement_id', id);

  // Disputes on this engagement.
  const { data: disputes } = await supabase
    .from('disputes')
    .select('*')
    .eq('engagement_id', id)
    .order('created_at', { ascending: false });

  const isB = account.account_type === 'business';
  const myReview = (reviews ?? []).find((r) => r.reviewer_id === user.id) ?? null;
  const theirReview = (reviews ?? []).find((r) => r.reviewer_id !== user.id) ?? null;

  const revieweeName = isB
    ? (eng as any).expert_profiles?.name
    : (eng as any).business_profiles?.company_name;

  // Ensure a board exists, then load its columns + cards.
  const { ensureBoard } = await import('../board-actions');
  const boardRes = await ensureBoard(id);
  let boardId: string | null = null;
  let boardColumns: any[] = [];
  let boardCards: any[] = [];
  if (boardRes && 'boardId' in boardRes) {
    boardId = boardRes.boardId;
    const { data: cols } = await supabase.from('board_columns').select('*').eq('board_id', boardId).order('position');
    boardColumns = cols ?? [];
    if (boardColumns.length > 0) {
      const { data: cds } = await supabase.from('board_cards')
        .select('*').in('column_id', boardColumns.map((c) => c.id));
      boardCards = cds ?? [];
    }
  }

  return (
    <AppShell accountType={account.account_type}>
      <EngagementClient
        engagement={eng as any}
        milestones={milestones ?? []}
        ledger={ledger ?? []}
        isB={isB}
        payeeOnboarded={account.stripe_onboarding_done}
        engagementId={id}
        myReview={myReview}
        theirReview={theirReview}
        revieweeName={revieweeName}
        disputes={disputes ?? []}
        userId={user.id}
        board={{ boardId, columns: boardColumns, cards: boardCards }}
      />
    </AppShell>
  );
}
