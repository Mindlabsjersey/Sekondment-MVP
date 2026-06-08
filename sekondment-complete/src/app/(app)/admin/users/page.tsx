import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import UserRow from './UserRow';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: account } = await supabase.from('accounts').select('account_type').eq('id', user.id).single();
  if (account?.account_type !== 'admin') redirect('/dashboard');

  const svc = createServiceClient();
  const { data: users } = await svc
    .from('accounts')
    .select('id, full_name, email, account_type, status, admin_notes, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = users ?? [];
  const counts = {
    total: rows.length,
    suspended: rows.filter((u: any) => u.status === 'suspended').length,
    warned: rows.filter((u: any) => u.status === 'warned').length,
  };

  return (
    <AppShell accountType="admin">
      <h1 className="font-serif text-4xl tracking-tight mb-1">User management</h1>
      <p className="text-muted mb-6">Warn, suspend or reinstate accounts, recompute Trust Score, and keep notes.</p>

      <div className="flex gap-3 mb-8 text-sm">
        <span className="text-muted">{counts.total} users</span>
        <span className="text-[#b8862f]">· {counts.warned} warned</span>
        <span className="text-[#a14b3d]">· {counts.suspended} suspended</span>
      </div>

      <div className="grid gap-2.5">
        {rows.map((u: any) => <UserRow key={u.id} user={u} />)}
      </div>
    </AppShell>
  );
}
