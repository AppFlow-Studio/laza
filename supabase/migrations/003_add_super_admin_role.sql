-- Only run if users table exists (defensive guard for fresh environments)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'admin', 'employee'));
ELSE
    RAISE EXCEPTION 'users table does not exist — apply 001_admin_schema.sql first';
END IF;
END;
$$;