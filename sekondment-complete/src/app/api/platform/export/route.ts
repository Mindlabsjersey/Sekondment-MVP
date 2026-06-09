import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getPlatformRole, canAccess, auditLog } from '@/lib/platform/access';

/* Data exports — CSV downloads of Ops Centre data, role-gated + audit-logged.
   GET /api/platform/export?type=revenue|crm|audit|expertise
   Returns a text/csv attachment. No Stripe, no money movement — read-only. */

type ExportType = 'revenue' | 'crm' | 'audit' | 'expertise';

// Which module each export belongs to (for the access check).
const MODULE: Record<ExportType, string> = {
  revenue: 'revenue', crm: 'crm', audit: 'audit', expertise: 'expertise',
};

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(','));
  return lines.join('\n');
}

export async function GET(req: NextRequest) {
  const role = await getPlatformRole();
  if (!role) return NextResponse.json({ error: 'Staff only' }, { status: 403 });

  const type = (req.nextUrl.searchParams.get('type') || '') as ExportType;
  if (!MODULE[type]) return NextResponse.json({ error: 'Unknown export type' }, { status: 400 });
  if (!canAccess(role, MODULE[type])) return NextResponse.json({ error: 'Not permitted for your role' }, { status: 403 });

  const svc = createServiceClient();
  let rows: Record<string, any>[] = [];

  if (type === 'revenue') {
    const { data } = await svc.from('ledger_entries')
      .select('created_at, entry_type, amount, currency, engagement_id, stripe_object_id')
      .order('created_at', { ascending: false });
    rows = (data ?? []).map((r) => ({
      date: r.created_at, type: r.entry_type, amount: r.amount, currency: r.currency,
      engagement_id: r.engagement_id, reference: r.stripe_object_id,
    }));
  } else if (type === 'crm') {
    const { data } = await svc.from('crm_leads')
      .select('company_name, contact_name, contact_email, country, industry, stage, estimated_value, lead_source, next_follow_up, created_at')
      .order('created_at', { ascending: false });
    rows = data ?? [];
  } else if (type === 'audit') {
    const { data } = await svc.from('audit_logs')
      .select('created_at, action, actor_role, entity_type, entity_id, metadata')
      .order('created_at', { ascending: false }).limit(5000);
    rows = (data ?? []).map((r) => ({ ...r, metadata: r.metadata ? JSON.stringify(r.metadata) : '' }));
  } else if (type === 'expertise') {
    const { data } = await svc.from('expertise_intelligence')
      .select('name, commercial_value_score, ai_resistance_score, demand_weight, times_requested, active_experts');
    rows = data ?? [];
  }

  const csv = toCsv(rows);
  const { data: { user } } = await (await createClient()).auth.getUser();
  await auditLog({ actorId: user?.id ?? null, actorRole: role, action: 'exported_data', entityType: type, metadata: { rows: rows.length } });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sekondment-${type}-${stamp}.csv"`,
    },
  });
}
