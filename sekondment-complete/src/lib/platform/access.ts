import 'server-only';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/* ============================================================================
   Platform Operations Centre — internal role + audit helpers.
   Internal platform roles are SEPARATE from marketplace account types.
   ========================================================================== */

export type PlatformRole =
  | 'platform_owner' | 'platform_director' | 'operations_manager'
  | 'compliance_manager' | 'finance_manager' | 'marketplace_manager' | 'support_team';

// Which roles may view which modules. platform_owner implicitly sees all.
export const MODULE_ACCESS: Record<string, PlatformRole[]> = {
  executive:   ['platform_owner', 'platform_director'],
  revenue:     ['platform_owner', 'platform_director', 'finance_manager'],
  payments:    ['platform_owner', 'platform_director', 'finance_manager'],
  marketplace: ['platform_owner', 'platform_director', 'marketplace_manager', 'operations_manager'],
  expertise:   ['platform_owner', 'platform_director', 'marketplace_manager'],
  capacity:    ['platform_owner', 'platform_director', 'marketplace_manager', 'operations_manager'],
  geographic:  ['platform_owner', 'platform_director', 'marketplace_manager'],
  compliance:  ['platform_owner', 'platform_director', 'compliance_manager', 'operations_manager'],
  trust:       ['platform_owner', 'platform_director', 'operations_manager', 'compliance_manager'],
  growth:      ['platform_owner', 'platform_director', 'marketplace_manager'],
  team:        ['platform_owner', 'platform_director'],
  crm:         ['platform_owner', 'platform_director', 'marketplace_manager', 'support_team'],
  audit:       ['platform_owner', 'platform_director', 'compliance_manager'],
  system:      ['platform_owner', 'platform_director'],
};

/** Returns the current user's platform role, or null if not internal staff. */
export async function getPlatformRole(): Promise<PlatformRole | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('platform_team_members')
    .select('role, is_active')
    .eq('account_id', user.id)
    .maybeSingle();
  if (!data || !data.is_active) return null;
  return data.role as PlatformRole;
}

/** True if the role may access a given module. Owner sees everything. */
export function canAccess(role: PlatformRole | null, moduleKey: string): boolean {
  if (!role) return false;
  if (role === 'platform_owner') return true;
  return (MODULE_ACCESS[moduleKey] ?? []).includes(role);
}

/** Append an audit-log entry. Never throws into a caller; logs on failure. */
export async function auditLog(args: {
  actorId: string | null;
  actorRole?: PlatformRole | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from('audit_logs').insert({
      actor_id: args.actorId,
      actor_role: args.actorRole ?? null,
      action: args.action,
      entity_type: args.entityType ?? null,
      entity_id: args.entityId ?? null,
      metadata: args.metadata ?? null,
    });
  } catch (e) {
    console.error('[audit]', (e as Error).message);
  }
}
