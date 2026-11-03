-- Per-store toggle: when true, employee quantity updates create an
-- inventory_update_requests row for admin approval instead of applying directly.
ALTER TABLE public.locations
    ADD COLUMN IF NOT EXISTS require_update_approval boolean NOT NULL DEFAULT false;
