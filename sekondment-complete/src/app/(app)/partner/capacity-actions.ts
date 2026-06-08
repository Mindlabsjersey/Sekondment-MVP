'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function myPartner(supabase: any, userId: string) {
  const { data } = await supabase.from('employer_partners').select('id').eq('account_id', userId).single();
  return data?.id ?? null;
}

/** Create a capacity listing for the partner. */
export async function createCapacity(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  const partnerId = await myPartner(supabase, user.id);
  if (!partnerId) return { error: 'Only Employer Partners can list capacity.' };

  const title = String(formData.get('title') || '').trim();
  if (!title) return { error: 'Title is required.' };

  const { data, error } = await supabase.from('capacity_profiles').insert({
    employer_partner_id: partnerId,
    title,
    available_hours_per_week: Number(formData.get('hours_per_week') || 0),
    available_days_per_month: Number(formData.get('days_per_month') || 0),
    availability_start: String(formData.get('availability_start') || '') || null,
    availability_end: String(formData.get('availability_end') || '') || null,
    timezone: String(formData.get('timezone') || '') || null,
    location: String(formData.get('location') || '') || null,
    work_mode: String(formData.get('work_mode') || 'remote'),
    hourly_rate: formData.get('hourly_rate') ? Number(formData.get('hourly_rate')) : null,
    day_rate: formData.get('day_rate') ? Number(formData.get('day_rate')) : null,
    rate_currency: String(formData.get('rate_currency') || 'GBP').toUpperCase().slice(0, 3),
    employer_commission_rule: Number(formData.get('employer_commission_rule') || 0),
    employee_bonus_rule: Number(formData.get('employee_bonus_rule') || 0),
    visibility: String(formData.get('visibility') || 'private') === 'public' ? 'public' : 'private',
    approval_status: 'approved', // partner self-lists; could route to admin later
  }).select('id').single();
  if (error) return { error: error.message };

  // Optional expertise tags (comma-separated taxonomy slugs/names matched loosely).
  const tagText = String(formData.get('expertise') || '').trim();
  if (tagText && data) {
    const names = tagText.split(',').map((s) => s.trim()).filter(Boolean);
    for (const n of names) {
      const { data: tax } = await supabase
        .from('expertise_taxonomy').select('id').ilike('name', n).limit(1).maybeSingle();
      if (tax) await supabase.from('capacity_tags').insert({ capacity_id: data.id, expertise_id: tax.id });
    }
  }

  revalidatePath('/partner');
  return { success: true };
}

export async function setCapacityVisibility(capacityId: string, visibility: 'public' | 'private') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  const { error } = await supabase.from('capacity_profiles')
    .update({ visibility }).eq('id', capacityId);
  if (error) return { error: error.message };
  revalidatePath('/partner');
  return { success: true };
}

export async function deleteCapacity(capacityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  await supabase.from('capacity_profiles').delete().eq('id', capacityId);
  revalidatePath('/partner');
  return { success: true };
}

/** A business requests a booking against a public capacity listing. */
export async function requestCapacityBooking(capacityId: string, hours: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  const { data: biz } = await supabase.from('business_profiles').select('id').eq('account_id', user.id).single();
  if (!biz) return { error: 'Only businesses can book capacity.' };

  const { data: booking, error } = await supabase.from('capacity_bookings').insert({
    capacity_id: capacityId, business_id: biz.id, hours_booked: hours, status: 'requested',
  }).select('id').single();
  if (error) return { error: error.message };

  // Utilisation event (service client — table is owner/admin read).
  const svc = createServiceClient();
  await svc.from('capacity_utilisation_events').insert({
    capacity_id: capacityId, booking_id: booking?.id, event_type: 'booked', hours,
  });

  revalidatePath('/capacity');
  return { success: true };
}
