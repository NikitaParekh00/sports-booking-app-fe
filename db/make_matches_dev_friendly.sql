-- Make matches table development-friendly
-- This allows match creation with localStorage user IDs

-- 1. Drop existing foreign key constraints that might be causing issues
ALTER TABLE public.matches 
DROP CONSTRAINT IF EXISTS matches_created_by_fkey;

ALTER TABLE public.match_players 
DROP CONSTRAINT IF EXISTS match_players_user_id_fkey;

-- 2. Make created_by nullable for development
ALTER TABLE public.matches 
ALTER COLUMN created_by DROP NOT NULL;

-- 3. Make user_id nullable in match_players for development
ALTER TABLE public.match_players 
ALTER COLUMN user_id DROP NOT NULL;

-- 4. Create more flexible foreign key constraints
-- These allow NULL values and don't enforce strict auth.users reference
ALTER TABLE public.matches 
ADD CONSTRAINT matches_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.match_players 
ADD CONSTRAINT match_players_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- 5. Update RLS policies to be more permissive for development
DROP POLICY IF EXISTS "Users can manage their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can manage match players" ON public.match_players;

-- Allow authenticated users to create matches
CREATE POLICY "Allow match creation" ON public.matches
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Allow authenticated users to read matches
CREATE POLICY "Allow match reading" ON public.matches
  FOR SELECT TO authenticated 
  USING (true);

-- Allow authenticated users to create match players
CREATE POLICY "Allow match player creation" ON public.match_players
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Allow authenticated users to read match players
CREATE POLICY "Allow match player reading" ON public.match_players
  FOR SELECT TO authenticated 
  USING (true);

-- 6. Verify the constraints
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
AND tc.table_name IN ('matches', 'match_players')
ORDER BY tc.table_name, tc.constraint_name;
