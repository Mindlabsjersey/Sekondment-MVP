import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';

/* ============================================================================
   In-app notifications — inserts a row into `notifications` for the nav bell.
   Never throws into a server action; logs on failure.
   Paired with the email helpers in notify.ts (emails + in-app together).
   ========================================================================== */

type NotifType =
  | 'proposal_received' | 'proposal_accepted' | 'milestone_funded'
  | 'work_submitted' | 'funds_released' | 'dispute_raised' | 'message' | 'system';

export async function createNotification(args: {
  accountId: string;
  type: NotifType;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from('notifications').insert({
      account_id: args.accountId,
      type: args.type,
      title: args.title,
      body: args.body ?? null,
      link: args.link ?? null,
    });
  } catch (e) {
    console.error('[notification:error]', (e as Error).message);
  }
}
