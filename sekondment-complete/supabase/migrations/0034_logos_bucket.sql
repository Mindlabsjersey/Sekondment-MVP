-- =============================================================================
-- SEKONDMENT — 0034  PUBLIC LOGOS BUCKET
-- A public storage bucket for company logos and expert profile photos. Objects
-- are keyed by <account_id>/<file>; anyone can read (public URLs), but only the
-- owner can upload/replace/delete their own files.
-- Idempotent — safe to re-run.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "logos: public read" on storage.objects;
create policy "logos: public read" on storage.objects for select
  using (bucket_id = 'logos');

drop policy if exists "logos: owner insert" on storage.objects;
create policy "logos: owner insert" on storage.objects for insert
  with check (bucket_id = 'logos' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "logos: owner update" on storage.objects;
create policy "logos: owner update" on storage.objects for update
  using (bucket_id = 'logos' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "logos: owner delete" on storage.objects;
create policy "logos: owner delete" on storage.objects for delete
  using (bucket_id = 'logos' and split_part(name, '/', 1) = auth.uid()::text);
