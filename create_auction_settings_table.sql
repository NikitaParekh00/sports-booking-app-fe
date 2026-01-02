-- Create auction_settings table
CREATE TABLE IF NOT EXISTS public.auction_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.auction_sessions(id) ON DELETE CASCADE,
    minimum_bid NUMERIC(12, 2) NOT NULL DEFAULT 5000,
    players_per_team INTEGER NOT NULL DEFAULT 11,
    default_bid_increment NUMERIC(12, 2) NOT NULL DEFAULT 5000,
    bid_increment_1_threshold NUMERIC(12, 2) NOT NULL DEFAULT 100000,
    bid_increment_1_amount NUMERIC(12, 2) NOT NULL DEFAULT 10000,
    bid_increment_2_threshold NUMERIC(12, 2) NOT NULL DEFAULT 200000,
    bid_increment_2_amount NUMERIC(12, 2) NOT NULL DEFAULT 20000,
    bid_increment_3_threshold NUMERIC(12, 2) NOT NULL DEFAULT 400000,
    bid_increment_3_amount NUMERIC(12, 2) NOT NULL DEFAULT 30000,
    bid_increment_4_threshold NUMERIC(12, 2) NOT NULL DEFAULT 700000,
    bid_increment_4_amount NUMERIC(12, 2) NOT NULL DEFAULT 50000,
    category_color_mapping JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id)
);

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_auction_settings_session_id ON public.auction_settings(session_id);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE public.auction_settings ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations for authenticated users (adjust based on your security requirements)
CREATE POLICY "Allow all operations for authenticated users" ON public.auction_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Or if you want more restrictive policies:
-- CREATE POLICY "Users can view auction settings" ON public.auction_settings
--     FOR SELECT
--     USING (true);
-- 
-- CREATE POLICY "Admins can insert auction settings" ON public.auction_settings
--     FOR INSERT
--     WITH CHECK (true);
-- 
-- CREATE POLICY "Admins can update auction settings" ON public.auction_settings
--     FOR UPDATE
--     USING (true)
--     WITH CHECK (true);
-- 
-- CREATE POLICY "Admins can delete auction settings" ON public.auction_settings
--     FOR DELETE
--     USING (true);

-- Add comment to table
COMMENT ON TABLE public.auction_settings IS 'Stores auction configuration settings for each auction session';

