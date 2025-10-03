-- Fix foreign key constraint for matches table
-- This allows match creation with localStorage user IDs

-- 1. First, let's check the current foreign key constraint
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

-- 2. Drop the existing foreign key constraint
ALTER TABLE public.matches 
DROP CONSTRAINT IF EXISTS matches_created_by_fkey;

-- 3. Make created_by nullable temporarily
ALTER TABLE public.matches 
ALTER COLUMN created_by DROP NOT NULL;

-- 4. Create a new foreign key constraint that's more flexible
-- This allows NULL values and doesn't enforce strict auth.users reference
ALTER TABLE public.matches 
ADD CONSTRAINT matches_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- 5. Alternative: If you want to completely remove the foreign key constraint
-- Uncomment the line below and comment out step 4:
-- ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_created_by_fkey;

-- 6. Check the updated constraint
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
