-- Check matches table constraints and structure
-- This will help identify what's causing the 409 Conflict error

-- 1. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check foreign key constraints
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
AND tc.table_name = 'matches';

-- 3. Check RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'matches'
ORDER BY policyname;

-- 4. Check if there are any unique constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'matches'
AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY tc.constraint_name;
