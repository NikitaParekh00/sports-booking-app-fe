-- Make court_id nullable in bookings table
-- This allows bookings without specific court assignments

-- Check current constraint on court_id
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name = 'court_id'
AND table_schema = 'public';

-- Make court_id nullable if it's currently NOT NULL
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'court_id' 
        AND table_schema = 'public'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings ALTER COLUMN court_id DROP NOT NULL;
        RAISE NOTICE 'Made court_id nullable';
    ELSE
        RAISE NOTICE 'court_id is already nullable or does not exist';
    END IF;
END $$;

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name = 'court_id'
AND table_schema = 'public';
