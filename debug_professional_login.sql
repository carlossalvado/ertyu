-- Debug professional login issues

-- Check if professional exists and has credentials
SELECT
  p.id,
  p.name,
  p.email,
  p.password_hash,
  p.active,
  p.role
FROM professionals p
WHERE p.email IS NOT NULL
ORDER BY p.name;

-- Test the authenticate_professional function manually
-- Replace 'test@example.com' and 'testpassword' with actual credentials
-- SELECT * FROM authenticate_professional('test@example.com', 'testpassword');

-- Check if the function exists
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'authenticate_professional'
AND routine_type = 'FUNCTION';

-- Check if the function has proper permissions
SELECT
  grantee,
  privilege_type
FROM information_schema.role_routine_grants
WHERE routine_name = 'authenticate_professional';

-- Test password hashing (this should match what the function does)
-- Replace 'testpassword' with the actual password
-- SELECT crypt('testpassword', gen_salt('bf'));

-- Check if professional_auth view exists and works
SELECT * FROM professional_auth LIMIT 5;

-- Check if there are any RLS policies that might be blocking access
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'professionals';