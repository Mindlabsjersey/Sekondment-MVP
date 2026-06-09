'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getPlatformRole, auditLog } from '@/lib/platform/access';
import { revalidatePath } from 'next/cache';

/* Create a CRM lead. Any active platform staff may add leads. */
export async function createLead(input: {
  company_name: string; contact_name?: string; contact_email?: string;
  country?: string; industry?: string; estimated_value?: number; stage?: string; lead_source?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const role = await getPlatformRole();
  if (!role) return { ok: false, error: 'Staff only.' };
  if (!input.company_name?.trim()) return { ok: false, error: 'Company name is required.' };

  const { data: { user } } = await (await createClient()).auth.getUser();
  const svc = createServiceClient();
  const { error } = await svc.from('crm_leads').insert({
    company_name: input.company_name.trim(),
    contact_name: input.contact_name || null,
    contact_email: input.contact_email || null,
    country: input.country || null,
    industry: input.industry || null,
    estimated_value: input.estimated_value ?? null,
    stage: input.stage || 'lead',
    lead_source: input.lead_source || null,
    assigned_to: user?.id ?? null,
  });
  if (error) return { ok: false, error: error.message };

  await auditLog({ actorId: user?.id ?? null, actorRole: role, action: 'created_crm_lead', entityType: 'crm_leads', metadata: { company: input.company_name } });
  revalidatePath('/platform/crm');
  return { ok: true };
}

/* Move a lead to a new stage. */
export async function updateLeadStage(id: string, stage: string): Promise<{ ok: boolean; error?: string }> {
  const role = await getPlatformRole();
  if (!role) return { ok: false, error: 'Staff only.' };

  const { data: { user } } = await (await createClient()).auth.getUser();
  const svc = createServiceClient();
  const { error } = await svc.from('crm_leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  await auditLog({ actorId: user?.id ?? null, actorRole: role, action: 'updated_crm_stage', entityType: 'crm_leads', entityId: id, metadata: { stage } });
  revalidatePath('/platform/crm');
  return { ok: true };
}
