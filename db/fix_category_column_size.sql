-- Fix category column size to allow longer values
-- The category column is currently VARCHAR(10), which is too small for some category values

-- Update auction_player_pool table
ALTER TABLE public.auction_player_pool 
ALTER COLUMN category TYPE VARCHAR(50);

-- Update auction_players table
ALTER TABLE public.auction_players 
ALTER COLUMN player_category TYPE VARCHAR(50);

-- Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('auction_player_pool', 'auction_players')
    AND column_name IN ('category', 'player_category')
ORDER BY table_name, column_name;

