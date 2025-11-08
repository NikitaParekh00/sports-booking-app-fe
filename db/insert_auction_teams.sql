-- Insert Auction Teams for Session ID: aa251ee5-144e-416b-b603-cd0a5e867948
-- This creates 8 teams with their names and initial budget

INSERT INTO public.auction_teams (
    session_id,
    team_number,
    name,
    budget,
    category_a_count,
    category_b_count,
    category_c_count
) VALUES
('aa251ee5-144e-416b-b603-cd0a5e867948', 1, 'Super Strikers', 111000, 0, 0, 0),
('aa251ee5-144e-416b-b603-cd0a5e867948', 2, 'Sunrisers', 111000, 0, 0, 0),
('aa251ee5-144e-416b-b603-cd0a5e867948', 3, 'Tirthankar Eleven Stars', 111000, 0, 0, 0),
('aa251ee5-144e-416b-b603-cd0a5e867948', 4, 'Sunil ke Gladiators', 111000, 0, 0, 0),
('aa251ee5-144e-416b-b603-cd0a5e867948', 5, 'Rising Royals', 111000, 0, 0, 0),
('aa251ee5-144e-416b-b603-cd0a5e867948', 6, 'Super Kings', 111000, 0, 0, 0),
('aa251ee5-144e-416b-b603-cd0a5e867948', 7, 'Power Paltan', 111000, 0, 0, 0),
('aa251ee5-144e-416b-b603-cd0a5e867948', 8, 'Team 8', 111000, 0, 0, 0)
ON CONFLICT (session_id, team_number) DO UPDATE SET
    name = EXCLUDED.name,
    budget = EXCLUDED.budget,
    category_a_count = EXCLUDED.category_a_count,
    category_b_count = EXCLUDED.category_b_count,
    category_c_count = EXCLUDED.category_c_count;

-- Verify the insert
SELECT 
    team_number,
    name,
    budget,
    category_a_count,
    category_b_count,
    category_c_count
FROM public.auction_teams
WHERE session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'
ORDER BY team_number;

