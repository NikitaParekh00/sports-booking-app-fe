-- Enforce Single Role Per User - Simple Version
-- This script safely converts the database to single role per user

-- 1. First, let's backup the current data by creating a temporary table
CREATE TABLE IF NOT EXISTS profiles_backup AS 
SELECT * FROM public.profiles;

-- 2. Add a new role column as TEXT
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_new TEXT;

-- 3. Convert existing roles to single role (keep the first/primary role)
UPDATE public.profiles 
SET role_new = CASE 
  WHEN roles::text LIKE '%"admin"%' THEN 'admin'
  WHEN roles::text LIKE '%"owner"%' THEN 'owner'
  ELSE 'player'
END
WHERE role_new IS NULL;

-- 4. Set default value for new role column
ALTER TABLE public.profiles 
ALTER COLUMN role_new SET DEFAULT 'player';

-- 5. Add constraint to ensure role is one of the valid values
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_role_new CHECK (role_new IN ('player', 'owner', 'admin'));

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_new ON public.profiles(role_new);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_new ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_role_new ON public.profiles(phone, role_new);

-- 7. Add unique constraint on phone + role combination
-- This allows same phone number for different roles but unique within same role
ALTER TABLE public.profiles 
ADD CONSTRAINT unique_phone_role_new UNIQUE (phone, role_new);

-- 8. Update RLS policies to work with new role column
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;

CREATE POLICY "Users can view their own profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 9. Verify the data looks correct
SELECT user_id, phone, role, roles, role_new 
FROM public.profiles 
LIMIT 10;

-- 10. Once you verify the data is correct, you can:
-- - Drop the old role and roles columns
-- - Rename role_new to role
-- - Drop the backup table

-- Uncomment these lines after verifying the data:
-- ALTER TABLE public.profiles DROP COLUMN role;
-- ALTER TABLE public.profiles DROP COLUMN roles;
-- ALTER TABLE public.profiles RENAME COLUMN role_new TO role;
-- DROP TABLE profiles_backup;
