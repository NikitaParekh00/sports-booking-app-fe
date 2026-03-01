-- Fix: "violates foreign key constraint tournament_participants_user_id_fkey"
-- The app stores profile user_ids (from profiles table), but the column was referencing auth.users(id).
-- Run this in Supabase SQL Editor.

ALTER TABLE public.tournament_participants
  DROP CONSTRAINT IF EXISTS tournament_participants_user_id_fkey;

ALTER TABLE public.tournament_participants
  ADD CONSTRAINT tournament_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
