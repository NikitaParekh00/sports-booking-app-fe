-- Step 2: Clean up old columns (run this after verifying step 1 works)
-- Only run this after you've verified the new role_new column works correctly

-- 1. Drop the old role and roles columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS roles;

-- 2. Rename role_new to role
ALTER TABLE public.profiles RENAME COLUMN role_new TO role;

-- 3. Update RLS policies to work with new role column
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;

CREATE POLICY "Users can view their own profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Verify the final structure
SELECT user_id, phone, role, full_name 
FROM public.profiles 
ORDER BY phone, role;
