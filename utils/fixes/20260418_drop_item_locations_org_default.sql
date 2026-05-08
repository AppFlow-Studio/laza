-- FIX-A1: Remove hardcoded organization_id default from item_locations.
-- The default 'org_35np3xhDrzBRkcbl0rtmtl3MDeV' does not exist on staging,
-- causing FK violations on any INSERT that omits organization_id.
-- All app-side inserts now pass organization_id explicitly.
ALTER TABLE public.item_locations ALTER COLUMN organization_id DROP DEFAULT;
