-- Complete database schema fix for sports booking app
-- This script fixes both the roles column issue and adds the points system

-- 1. Fix roles column issue
-- Drop the old 'roles' column if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS roles;

-- Ensure 'role' column exists and is properly configured
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'player';

-- Make sure role column is NOT NULL
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

-- Update any NULL values to 'player'
UPDATE public.profiles SET role = 'player' WHERE role IS NULL;

-- Add unique constraint on phone + role if it doesn't exist
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS unique_phone_role;
ALTER TABLE public.profiles ADD CONSTRAINT unique_phone_role UNIQUE (phone, role);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_role ON public.profiles(phone, role);

-- 2. Add points system
-- Add points columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Add points_earned column to track total points earned
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;

-- Add points_spent column to track total points spent
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS points_spent INTEGER DEFAULT 0;

-- Create points_transactions table to track all point activities
CREATE TABLE IF NOT EXISTS public.points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'penalty')),
    description TEXT NOT NULL,
    reference_id UUID, -- Can reference matches, bookings, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_points ON public.profiles(points);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON public.points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON public.points_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON public.points_transactions(created_at);

-- Enable RLS on points_transactions
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for points_transactions
DROP POLICY IF EXISTS "Users can view their own points transactions" ON public.points_transactions;
DROP POLICY IF EXISTS "System can insert points transactions" ON public.points_transactions;

CREATE POLICY "Users can view their own points transactions" ON public.points_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert points transactions" ON public.points_transactions
  FOR INSERT WITH CHECK (true);

-- Create function to add points to user
CREATE OR REPLACE FUNCTION add_points_to_user(
    p_user_id UUID,
    p_points INTEGER,
    p_transaction_type TEXT,
    p_description TEXT,
    p_reference_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Insert transaction record
    INSERT INTO public.points_transactions (
        user_id, points, transaction_type, description, reference_id
    ) VALUES (
        p_user_id, p_points, p_transaction_type, p_description, p_reference_id
    );
    
    -- Update user's points
    UPDATE public.profiles 
    SET 
        points = points + p_points,
        points_earned = CASE 
            WHEN p_points > 0 THEN points_earned + p_points 
            ELSE points_earned 
        END,
        points_spent = CASE 
            WHEN p_points < 0 THEN points_spent + ABS(p_points) 
            ELSE points_spent 
        END,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award 10 points to existing users for registration bonus
UPDATE public.profiles 
SET 
    points = points + 10,
    points_earned = points_earned + 10,
    updated_at = NOW()
WHERE points_earned = 0; -- Only for users who haven't earned any points yet

-- Insert registration bonus transactions for existing users
INSERT INTO public.points_transactions (user_id, points, transaction_type, description)
SELECT 
    user_id, 
    10, 
    'bonus', 
    'Welcome bonus - Account registration'
FROM public.profiles 
WHERE points_earned = 10; -- Users who just got the bonus

-- 3. Fix matches table foreign key constraint
-- Drop existing foreign key constraint if it references auth.users
ALTER TABLE public.matches
DROP CONSTRAINT IF EXISTS matches_created_by_fkey;

-- Add new foreign key constraint referencing public.profiles(user_id)
ALTER TABLE public.matches
ADD CONSTRAINT matches_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 4. Verify the schema is correct
SELECT 
    'Schema verification complete' as status,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'player') as player_count,
    (SELECT COUNT(*) FROM public.profiles WHERE points > 0) as users_with_points;

-- 5. Show current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
