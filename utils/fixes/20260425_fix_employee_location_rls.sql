-- Fix: employees see "No Location Assigned" even when a row exists in
-- user_location_assignments.
--
-- Root cause: the RLS policies on user_location_assignments only allowed
-- admin and super_admin to SELECT. Employees (role = 'employee'/'member')
-- had no policy, so the query returned 0 rows → .single() threw PGRST116
-- → the layout's error handler showed "No Location Assigned".
--
-- Fix: add a policy that lets any authenticated user read their own rows.

CREATE POLICY "Users read own assignment" ON user_location_assignments
  FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));
