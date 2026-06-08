'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendMessage, markRead } from '../actions';
import { sendFileMessage } from '../../engagements/file-actions';

type Message = {
  id: string;
  sender_id: string;
  body: string;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
};

export default function ChatThread({
  conversationId,
  engagementId,
  initialMessages,
  currentUserId,
  counterpartyName,
}: {
  conversationId: string;
  engagementId: string | null;
  initialMessages: Message[];
  currentUserId: string;
  counterpartyName: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function attachFile(file: File) {
    if (!engagementId) return;
    setSending(true); setError(null);
    const fd = new FormData();
    fd.set('conversation_id', conversationId);
    fd.set('engagement_id', engagementId);
    fd.set('file', file);
    const res = await sendFileMessage(fd);
    if (res?.error) setError(res.error);
    if (fileRef.current) fileRef.current.value = '';
    setSending(false);
  }

  // Subscribe to new messages on this conversation via Supabase Realtime.
  useEffect(() => {
    markRead(conversationId);
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    setDraft('');

    // Optimistic append; Realtime will dedupe by id when the row arrives.
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      sender_id: currentUserId,
      body,
      flagged: false,
      flag_reason: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const res = await sendMessage(conversationId, body);
    if (res?.error) {
      setError(res.error);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(body);
    }
    setSending(false);
  }

  return (
    <div className="bg-white border border-[var(--line)] rounded-xl2 shadow-soft overflow-hidden flex flex-col" style={{ height: '70vh' }}>
      {/* header */}
      <div className="px-6 py-4 border-b border-[var(--line)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-moss to-moss-2 text-white flex items-center justify-center font-serif font-semibold text-sm">
          {counterpartyName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className="font-semibold">{counterpartyName}</p>
          <p className="text-xs text-muted">On-platform conversation</p>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted text-sm py-10">No messages yet. Say hello.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  mine ? 'bg-moss text-white rounded-br-sm' : 'bg-paper-2 text-ink rounded-bl-sm'
                }`}>
                  {m.body}
                </div>
                {m.flagged && (
                  <p className="text-xs text-[#a14b3d] mt-1 flex items-center gap-1">
                    ⚠ Flagged ({m.flag_reason}) — keep payments and contact on-platform
                  </p>
                )}
                <p className={`text-[11px] text-muted mt-1 ${mine ? 'text-right' : ''}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="border-t border-[var(--line)] p-4">
        {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg mb-2">{error}</p>}
        <div className="flex gap-2">
          {engagementId && (
            <>
              <input ref={fileRef} type="file" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) attachFile(e.target.files[0]); }} />
              <button onClick={() => fileRef.current?.click()} disabled={sending}
                title="Attach a file securely"
                className="btn btn-ghost flex-none disabled:opacity-50" aria-label="Attach file">📎</button>
            </>
          )}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message…"
            className="field flex-1"
          />
          <button onClick={send} disabled={sending || !draft.trim()}
            className="btn btn-primary disabled:opacity-50">
            {sending ? '…' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          Messages mentioning off-platform contact or payment are flagged for review to protect both parties.
        </p>
      </div>
    </div>
  );
}
