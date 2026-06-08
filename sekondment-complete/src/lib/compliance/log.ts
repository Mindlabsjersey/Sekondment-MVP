import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';

/* ============================================================================
   Compliance audit trail. Logs permanent events for admin oversight. Never
   throws into a server action; logs on failure. Service-client write (the
   compliance_events table is admin-read-only via RLS).
   ========================================================================== */

export type ComplianceEventType =
  | 'identity_submitted' | 'business_verified' | 'expert_verified' | 'right_to_work_noted'
  | 'contract_accepted' | 'nda_accepted' | 'secondment_approved' | 'milestone_funded'
  | 'payment_released' | 'dispute_raised' | 'dispute_resolved' | 'off_platform_flag'
  | 'account_warned' | 'account_suspended' | 'employer_resource_approved'
  | 'verification_document_uploaded' | 'verification_document_rejected';

export async function logCompliance(args: {
  type: ComplianceEventType;
  accountId?: string | null;
  engagementId?: string | null;
  actorId?: string | null;
  detail?: Record<string, any>;
}): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from('compliance_events').insert({
      event_type: args.type,
      account_id: args.accountId ?? null,
      engagement_id: args.engagementId ?? null,
      actor_id: args.actorId ?? null,
      detail: args.detail ?? null,
    });
  } catch (e) {
    console.error('[compliance:error]', (e as Error).message);
  }
}
