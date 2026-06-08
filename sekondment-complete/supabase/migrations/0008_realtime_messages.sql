-- =============================================================================
-- SEKONDMENT — 0008  ENABLE REALTIME ON MESSAGES
-- Adds the messages table to the supabase_realtime publication so clients can
-- subscribe to INSERTs. RLS still governs which rows a client may receive.
-- =============================================================================

-- Create the publication if it does not already exist (Supabase ships with it,
-- but this keeps the migration self-contained for fresh local stacks).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table messages;

-- Ensure full row data is available to realtime payloads.
alter table messages replica identity full;
