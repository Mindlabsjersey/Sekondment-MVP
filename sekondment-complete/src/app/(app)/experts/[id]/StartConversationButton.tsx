'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrCreateConversation } from '@/app/(app)/messages/actions';

export default function StartConversationButton({
  expertAccountId,
  expertName,
}: {
  expertAccountId: string;
  expertName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    // getOrCreateConversation resolves the caller's business_id automatically.
    const res = await getOrCreateConversation({ expertAccountId });
    if ('error' in res) {
      setError(res.error ?? 'Something went wrong.');
      setPending(false);
      return;
    }
    router.push(`/messages/${res.conversationId}`);
  }

  return (
    <div>
      <button onClick={start} disabled={pending} className="btn btn-primary btn-lg w-full disabled:opacity-60">
        {pending ? 'Opening conversation…' : `Message ${expertName.split(' ')[0]} →`}
      </button>
      {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
    </div>
  );
}
