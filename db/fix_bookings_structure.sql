-- Fix bookings table structure to match our application needs
-- This script will ensure the table has the correct columns

-- First, let's see what we have
SELECT 'Current table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- If player_id exists and is NOT NULL, we need to either:
-- 1. Make it nullable, or 
-- 2. Add a default value, or
-- 3. Remove the constraint

-- Option 1: Make player_id nullable if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'player_id' 
        AND table_schema = 'public'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings ALTER COLUMN player_id DROP NOT NULL;
        RAISE NOTICE 'Made player_id nullable';
    END IF;
END $$;

-- Option 2: If player_id doesn't exist but we need it, add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'player_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN player_id UUID;
        RAISE NOTICE 'Added player_id column';
    END IF;
END $$;

-- Option 3: If we want to use user_id instead of player_id, 
-- we can drop player_id and ensure user_id exists
DO $$ 
BEGIN
    -- Check if user_id exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'user_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN user_id UUID;
        RAISE NOTICE 'Added user_id column';
    END IF;
    
    -- If both exist, we can drop player_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'player_id' 
        AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'user_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings DROP COLUMN IF EXISTS player_id;
        RAISE NOTICE 'Dropped player_id column (using user_id instead)';
    END IF;
END $$;

-- Final check
SELECT 'Final table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public'
ORDER BY ordinal_position;
