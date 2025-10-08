-- Fix the foreign key constraint on matches.created_by
-- The constraint should reference public.profiles(user_id), not auth.users(id)

-- 1. Drop the existing foreign key constraint
ALTER TABLE public.matches
DROP CONSTRAINT IF EXISTS matches_created_by_fkey;

-- 2. Add the correct foreign key constraint referencing public.profiles(user_id)
ALTER TABLE public.matches
ADD CONSTRAINT matches_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 3. Verify the constraint is correct
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'matches'
AND kcu.column_name = 'created_by';

-- 4. Check if the user exists in profiles table
SELECT user_id, full_name, phone, role, points
FROM public.profiles 
WHERE user_id = '2bb35937-b0a1-47cf-8f74-8d8d20c51412';

-- 5. Re-enable RLS with proper policies
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- 6. Create proper RLS policies that work with profiles table
CREATE POLICY "Allow match creation for authenticated users" ON public.matches
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow match updates for authenticated users" ON public.matches
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow match selection for authenticated users" ON public.matches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow match deletion for authenticated users" ON public.matches
  FOR DELETE TO authenticated USING (true);

-- 7. Create policies for match_players
CREATE POLICY "Allow match player creation for authenticated users" ON public.match_players
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow match player updates for authenticated users" ON public.match_players
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow match player selection for authenticated users" ON public.match_players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow match player deletion for authenticated users" ON public.match_players
  FOR DELETE TO authenticated USING (true);
