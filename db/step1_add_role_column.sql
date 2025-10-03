-- Step 1: Add new role column and populate it
-- Run this first to safely add the new role column

-- 1. Add a new role column as TEXT
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_new TEXT;

-- 2. Convert existing roles to single role (keep the first/primary role)
UPDATE public.profiles 
SET role_new = CASE 
  WHEN roles::text LIKE '%"admin"%' THEN 'admin'
  WHEN roles::text LIKE '%"owner"%' THEN 'owner'
  ELSE 'player'
END
WHERE role_new IS NULL;

-- 3. Set default value for new role column
ALTER TABLE public.profiles 
ALTER COLUMN role_new SET DEFAULT 'player';

-- 4. Add constraint to ensure role is one of the valid values
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_role_new CHECK (role_new IN ('player', 'owner', 'admin'));

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_new ON public.profiles(role_new);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_new ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_role_new ON public.profiles(phone, role_new);

-- 6. Add unique constraint on phone + role combination
ALTER TABLE public.profiles 
ADD CONSTRAINT unique_phone_role_new UNIQUE (phone, role_new);

-- 7. Verify the data looks correct
SELECT user_id, phone, role, roles, role_new 
FROM public.profiles 
ORDER BY phone, role_new;
