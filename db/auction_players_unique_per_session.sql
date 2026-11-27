-- One sold roster row per player name per auction session (prevents timed lot double-resolve races).
-- If this fails, remove duplicate rows first, keeping the row with the winning team you want.
CREATE UNIQUE INDEX IF NOT EXISTS idx_auction_players_session_player_name
    ON public.auction_players (session_id, player_name);