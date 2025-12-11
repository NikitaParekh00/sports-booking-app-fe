-- Add new fields to auction_player_pool table to match actual data structure
-- Only the fields provided by the user

-- Add new fields
ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS played_s1 VARCHAR(3) CHECK (played_s1 IN ('Yes', 'No')),
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS active_sport TEXT,
ADD COLUMN IF NOT EXISTS skill TEXT,
ADD COLUMN IF NOT EXISTS batting_hand VARCHAR(5) CHECK (batting_hand IN ('Right', 'Left')),
ADD COLUMN IF NOT EXISTS s1_ranking TEXT,
ADD COLUMN IF NOT EXISTS s2_ranking TEXT,
ADD COLUMN IF NOT EXISTS s3_ranking TEXT;

