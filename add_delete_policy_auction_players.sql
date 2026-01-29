-- Add DELETE policy for auction_players table
-- This allows authenticated users to delete auction players
-- (which is needed for the undo functionality)

-- Drop policy if it already exists (in case it was created with wrong role)
DROP POLICY IF EXISTS "Authenticated users can delete auction players" ON public.auction_players;

CREATE POLICY "Authenticated users can delete auction players"
ON public.auction_players
FOR DELETE
TO public
USING (true);

-- Alternative: More restrictive policy that only allows deletion of players in the same session
-- Uncomment this if you want more security:
/*
CREATE POLICY "Users can delete auction players from their session"
ON public.auction_players
FOR DELETE
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.auction_sessions
        WHERE auction_sessions.id = auction_players.session_id
        -- Add additional checks here if needed, e.g., user ownership
    )
);
*/

-- Verify the policy was created
SELECT 
    policyname,
    cmd as command,
    roles,
    qual as using_expression
FROM pg_policies 
WHERE tablename = 'auction_players' 
    AND cmd = 'DELETE';
