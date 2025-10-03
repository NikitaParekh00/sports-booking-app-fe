-- Enable Multi-Role System for Sports Booking App
-- This allows users to have multiple roles (owner + player + admin)

-- 1. Update the profiles table to support multiple roles
-- Add a new column for roles (JSON array instead of single role)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '["player"]'::jsonb;

-- 2. Migrate existing role data to new roles column
UPDATE public.profiles 
SET roles = CASE 
  WHEN role = 'owner' THEN '["owner", "player"]'::jsonb
  WHEN role = 'player' THEN '["player"]'::jsonb
  WHEN role = 'admin' THEN '["admin", "player"]'::jsonb
  ELSE '["player"]'::jsonb
END;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON public.profiles USING GIN (roles);

-- 4. Create helper functions for role management
CREATE OR REPLACE FUNCTION has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = has_role.user_id 
    AND roles ? role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to add role to user
CREATE OR REPLACE FUNCTION add_user_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles 
  SET roles = roles || jsonb_build_array(role_name)
  WHERE profiles.user_id = add_user_role.user_id
  AND NOT (roles ? role_name);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to remove role from user
CREATE OR REPLACE FUNCTION remove_user_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles 
  SET roles = roles - role_name
  WHERE profiles.user_id = remove_user_role.user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update RLS policies to work with multi-role system
-- Drop old policies
DROP POLICY IF EXISTS "Users can manage their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can manage match players for their matches" ON public.match_players;

-- Create new policies that work with multi-role system
CREATE POLICY "Multi-role match management" ON public.matches
  FOR ALL USING (
    auth.uid() = created_by OR 
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Multi-role match player management" ON public.match_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_players.match_id 
      AND (matches.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION has_role TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_role TO authenticated;
