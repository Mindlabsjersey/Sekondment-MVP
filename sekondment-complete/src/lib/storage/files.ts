import { createClient, createServiceClient } from '@/lib/supabase/server';

/* ============================================================================
   Engagement file storage. Files live in the private 'engagement-files' bucket,
   keyed <engagement_id>/<uuid>-<filename>. RLS on storage.objects (migration
   0012) restricts access to the engagement's parties + admins.
   ========================================================================== */

const BUCKET = 'engagement-files';

/** Upload a file (server-side) and return its storage path. */
export async function uploadEngagementFile(
  engagementId: string,
  file: File
): Promise<{ path: string; name: string; size: number } | { error: string }> {
  const supabase = await createClient();
  const safeName = file.name.replace(/[^\w.\-]/g, '_');
  const path = `${engagementId}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });
  if (error) return { error: error.message };
  return { path, name: file.name, size: file.size };
}

/** Create a short-lived signed URL so a party can download a private file. */
export async function signedFileUrl(path: string, expiresIn = 300): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
