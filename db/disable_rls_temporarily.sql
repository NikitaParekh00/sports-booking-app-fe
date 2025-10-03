-- Temporarily disable RLS for testing
-- WARNING: This is for development only - NEVER use in production

-- Disable RLS on matches table
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;

-- Disable RLS on match_players table  
ALTER TABLE public.match_players DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename IN ('matches', 'match_players')
AND schemaname = 'public';

-- Test if you can now create matches
-- If this works, the issue was with RLS policies
-- If it still fails, the issue is with foreign key constraints
