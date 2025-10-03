-- Check the current structure of the matches table
-- This will help identify what columns exist and what's missing

-- 1. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if the table exists
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'matches' 
AND table_schema = 'public';

-- 3. Check for any constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints AS tc 
LEFT JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'matches'
AND tc.table_schema = 'public';
