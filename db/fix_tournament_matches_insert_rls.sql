-- Allow inserting (and deleting) tournament matches and their match_players when Supabase
-- session is missing but the app sets created_by from localStorage.
-- Optional: tighten later to service role only.

-- Extra INSERT path: any row tied to a tournament
CREATE POLICY "Allow insert matches for tournaments" ON public.matches
  FOR INSERT
  WITH CHECK (tournament_id IS NOT NULL);

-- Extra DELETE path: remove bracket-generated rows (match_number like B-%)
CREATE POLICY "Allow delete bracket tournament matches" ON public.matches
  FOR DELETE
  USING (tournament_id IS NOT NULL AND match_type = 'tournament' AND match_number LIKE 'B-%');

-- match_players: allow rows whose match is a tournament match
CREATE POLICY "Allow insert match_players for tournament matches" ON public.match_players
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_players.match_id
        AND m.tournament_id IS NOT NULL
    )
  );

CREATE POLICY "Allow delete match_players for tournament matches" ON public.match_players
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_players.match_id
        AND m.tournament_id IS NOT NULL
    )
  );
