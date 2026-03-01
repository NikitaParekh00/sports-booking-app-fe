-- Fix: created_by UUID is not in profiles (e.g. app uses auth.users id or other source).
-- Drop the foreign key so matches can be created with any created_by value or null.
-- Run this in Supabase SQL Editor.

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_created_by_fkey;

-- created_by remains a UUID column; app can set it to whoever created the match (no DB enforcement).
