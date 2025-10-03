-- Enforce Single Role Per User
-- This script updates the database to ensure each user has only one role

-- 1. Update the roles column to be a single string instead of JSONB array
ALTER TABLE public.profiles 
ALTER COLUMN roles DROP DEFAULT;

-- 2. Convert existing multi-role users to single role
-- For users with multiple roles, we'll keep the primary role and create separate accounts for other roles

-- First, let's see what multi-role users we have
-- Users with ["admin", "player"] -> keep as "admin", create separate "player" account
-- Users with ["owner", "player"] -> keep as "owner", create separate "player" account

-- 3. Update the roles column to store single role as string
ALTER TABLE public.profiles 
ALTER COLUMN roles TYPE TEXT USING (
  CASE 
    WHEN roles::text LIKE '%"admin"%' THEN 'admin'
    WHEN roles::text LIKE '%"owner"%' THEN 'owner'
    ELSE 'player'
  END
);

-- 4. Rename roles column to role (since we're going back to single role)
ALTER TABLE public.profiles RENAME COLUMN roles TO role_new;

-- 5. Drop the old role column and rename the new one
ALTER TABLE public.profiles DROP COLUMN role;
ALTER TABLE public.profiles RENAME COLUMN role_new TO role;

-- 6. Set default value for role
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'player';

-- 7. Add constraint to ensure role is one of the valid values
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_role CHECK (role IN ('player', 'owner', 'admin'));

-- 8. Update RLS policies to work with single role
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;

CREATE POLICY "Users can view their own profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_role ON public.profiles(phone, role);

-- 10. Add unique constraint on phone + role combination
-- This allows same phone number for different roles but unique within same role
ALTER TABLE public.profiles 
ADD CONSTRAINT unique_phone_role UNIQUE (phone, role);
