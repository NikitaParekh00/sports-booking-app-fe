-- Add category_limits column to auction_settings table
ALTER TABLE public.auction_settings
ADD COLUMN IF NOT EXISTS category_limits JSONB DEFAULT '{}'::jsonb;

-- Add comment to column
COMMENT ON COLUMN public.auction_settings.category_limits IS 'Category-wise player limits per team. Format: {"A+": 2, "A": 3, "B": 4}. If a category is not present or value is null, no limit is enforced.';

