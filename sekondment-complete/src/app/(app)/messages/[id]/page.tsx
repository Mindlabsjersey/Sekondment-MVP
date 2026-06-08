import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import ChatThread from './ChatThread';

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (!account) redirect('/sign-in');

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, engagement_id, business_profiles(company_name), expert_profiles(name)')
    .eq('id', id)
    .single();
  if (!conv) redirect('/messages');

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at');

  const isB = account.account_type === 'business';
  const counterpartyName = isB
    ? (conv as any).expert_profiles?.name
    : (conv as any).business_profiles?.company_name;

  return (
    <AppShell accountType={account.account_type}>
      <Link href="/messages" className="text-muted text-sm hover:text-ink transition mb-5 inline-block">
        ← All messages
      </Link>
      <ChatThread
        conversationId={id}
        engagementId={(conv as any).engagement_id ?? null}
        initialMessages={messages ?? []}
        currentUserId={user.id}
        counterpartyName={counterpartyName ?? 'Conversation'}
      />
    </AppShell>
  );
}
