'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { markAllNotificationsRead, markNotificationRead } from './notification-actions';

type Notif = {
  id: string; type: string; title: string; body: string | null;
  link: string | null; read_at: string | null; created_at: string;
};

export default function NotificationBell({ userId, initial }: { userId: string; initial: Notif[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const unread = items.filter((n) => !n.read_at).length;

  // Realtime: new notifications appear live.
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `account_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new as Notif, ...prev].slice(0, 20)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function openBell() {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      await markAllNotificationsRead();
    }
  }

  async function go(n: Notif) {
    setOpen(false);
    if (!n.read_at) await markNotificationRead(n.id);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={openBell} aria-label="Notifications"
        className="relative w-9 h-9 rounded-xl border flex items-center justify-center text-base hover:bg-paper-2 transition"
        style={{ borderColor: 'var(--line)' }}>
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: 'var(--c-gold)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-32px)] bg-surface border rounded-xl2 shadow-soft overflow-hidden z-50"
          style={{ borderColor: 'var(--line)' }}>
          <div className="px-4 py-3 border-b font-serif font-semibold" style={{ borderColor: 'var(--line)' }}>
            Notifications
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-muted text-sm">You're all caught up.</p>
            ) : (
              items.map((n) => (
                <button key={n.id} onClick={() => go(n)}
                  className="w-full text-left px-4 py-3 border-b hover:bg-paper-2 transition block"
                  style={{ borderColor: 'var(--line)', background: n.read_at ? 'transparent' : 'var(--c-surface2)' }}>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[11px] text-muted mt-1">
                    {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
