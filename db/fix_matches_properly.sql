-- Fix matches table properly - keep data integrity
-- This maintains created_by as NOT NULL but fixes the foreign key reference

-- 1. Drop the problematic foreign key constraint
ALTER TABLE public.matches 
DROP CONSTRAINT IF EXISTS matches_created_by_fkey;

-- 2. Keep created_by as NOT NULL (data integrity)
-- ALTER TABLE public.matches 
-- ALTER COLUMN created_by SET NOT NULL;

-- 3. Create foreign key constraint to profiles table instead of auth.users
-- This allows using user_id from localStorage (profiles table)
ALTER TABLE public.matches 
ADD CONSTRAINT matches_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- 4. Update RLS policies to work with profiles table
DROP POLICY IF EXISTS "Users can manage their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can manage match players" ON public.match_players;

-- Allow users to manage matches they created
CREATE POLICY "Users can manage their own matches" ON public.matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = matches.created_by 
      AND profiles.user_id = auth.uid()
    )
  );

-- Allow users to manage match players for their matches
CREATE POLICY "Users can manage match players" ON public.match_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_players.match_id 
      AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = matches.created_by 
        AND profiles.user_id = auth.uid()
      )
    )
  );

-- 5. For development, create a more permissive policy
-- This allows match creation during development
CREATE POLICY "Dev: Allow match creation" ON public.matches
  FOR INSERT TO authenticated 
  WITH CHECK (created_by IS NOT NULL);

-- 6. Verify the constraint
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
