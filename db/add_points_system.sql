-- Add points system to the sports booking app
-- This implements a gamification system with points for user engagement

-- 1. Add points column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 2. Add points_earned column to track total points earned
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;

-- 3. Add points_spent column to track total points spent
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS points_spent INTEGER DEFAULT 0;

-- 4. Create points_transactions table to track all point activities
CREATE TABLE IF NOT EXISTS public.points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'penalty')),
    description TEXT NOT NULL,
    reference_id UUID, -- Can reference matches, bookings, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_points ON public.profiles(points);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON public.points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON public.points_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON public.points_transactions(created_at);

-- 6. Enable RLS on points_transactions
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for points_transactions
CREATE POLICY "Users can view their own points transactions" ON public.points_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert points transactions" ON public.points_transactions
  FOR INSERT WITH CHECK (true);

-- 8. Create function to add points to user
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

-- 9. Award 10 points to existing users for registration bonus
UPDATE public.profiles 
SET 
    points = points + 10,
    points_earned = points_earned + 10,
    updated_at = NOW()
WHERE points_earned = 0; -- Only for users who haven't earned any points yet

-- 10. Insert registration bonus transactions for existing users
INSERT INTO public.points_transactions (user_id, points, transaction_type, description)
SELECT 
    user_id, 
    10, 
    'bonus', 
    'Welcome bonus - Account registration'
FROM public.profiles 
WHERE points_earned = 10; -- Users who just got the bonus

-- 11. Verify the points system is working
SELECT 
    user_id, 
    full_name, 
    points, 
    points_earned, 
    points_spent 
FROM public.profiles 
ORDER BY points DESC 
LIMIT 5;
