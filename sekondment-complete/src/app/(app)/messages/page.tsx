import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: account } = await supabase
    .from('accounts').select('account_type').eq('id', user.id).single();
  if (!account) redirect('/sign-in');

  // RLS scopes conversations to the caller automatically.
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id, created_at,
      business_profiles(company_name),
      expert_profiles(name),
      messages(body, created_at, sender_id, read_at)
    `)
    .order('created_at', { ascending: false });

  const isB = account.account_type === 'business';

  // Derive a last-message + unread count per conversation.
  const rows = (conversations ?? []).map((c: any) => {
    const msgs = (c.messages ?? []).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
    const last = msgs[msgs.length - 1];
    const unread = msgs.filter((m: any) => m.sender_id !== user.id && !m.read_at).length;
    const name = isB ? c.expert_profiles?.name : c.business_profiles?.company_name;
    return { id: c.id, name: name ?? 'Conversation', last, unread };
  });

  return (
    <AppShell accountType={account.account_type}>
      <h1 className="font-serif text-4xl tracking-tight mb-1">Messages</h1>
      <p className="text-muted mb-8">All communication stays on-platform and on the record.</p>

      {rows.length === 0 ? (
        <div className="card text-center py-14 text-muted">
          <p className="font-serif text-xl text-ink mb-2">No conversations yet</p>
          <p className="text-sm">
            {isB ? 'Message an expert from their profile or a proposal to start talking.'
                 : 'When a business reaches out, your conversations appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Link key={r.id} href={`/messages/${r.id}`}
              className="bg-white border border-[var(--line)] rounded-xl p-5 flex items-center gap-4 hover:shadow-soft transition">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-moss to-moss-2 text-white flex items-center justify-center font-serif font-semibold flex-none">
                {r.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-muted truncate">
                  {r.last ? r.last.body : 'No messages yet'}
                </p>
              </div>
              {r.unread > 0 && (
                <span className="flex-none text-xs font-semibold bg-moss text-white rounded-full px-2 py-0.5">
                  {r.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
