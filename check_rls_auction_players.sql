-- Check if RLS is enabled on auction_players table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'auction_players';

-- List all RLS policies on auction_players table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,  -- SELECT, INSERT, UPDATE, DELETE, or ALL
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'auction_players'
ORDER BY policyname;

-- More detailed view of RLS policies with full policy definition
SELECT 
    p.schemaname,
    p.tablename,
    p.policyname,
    p.permissive,
    p.roles,
    p.cmd,
    p.qual,
    p.with_check,
    pg_get_expr(p.qual, p.relid) as using_expression_full,
    pg_get_expr(p.with_check, p.relid) as with_check_expression_full
FROM pg_policy p
JOIN pg_class c ON c.oid = p.relid
WHERE c.relname = 'auction_players'
ORDER BY p.policyname;

-- Check specifically for DELETE policies
SELECT 
    policyname,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression,
    pg_get_expr(qual, relid) as full_using_expression
FROM pg_policies 
WHERE tablename = 'auction_players' 
    AND (cmd = 'DELETE' OR cmd = 'ALL')
ORDER BY policyname;

-- Check current user's permissions
SELECT 
    current_user as current_role,
    session_user as session_role;

-- Test if current user can delete (this will show what RLS sees)
-- Replace 'your-player-id-here' with an actual ID from auction_players
SELECT 
    id,
    player_name,
    session_id,
    team_id
FROM auction_players
WHERE id = 'your-player-id-here';
