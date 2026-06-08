-- AUTO-GENERATED apply bundle: migrations 15-15 (run this whole file once in Supabase SQL Editor)

-- ===================== 0015_milestone_releasing_enum.sql =====================
-- =============================================================================
-- SEKONDMENT â€” 0015  MILESTONE 'releasing' STATUS
-- Transient claim status used by the release route to atomically move
-- submitted -> releasing, preventing double-release race conditions.
-- Enum value additions must be committed before use (own migration).
-- =============================================================================
alter type milestone_status add value if not exists 'releasing';


