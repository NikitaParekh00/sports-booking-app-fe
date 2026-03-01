-- Fix: "insert or update on table matches violates foreign key constraint matches_created_by_fkey"
-- The app uses user_id from profiles (localStorage), but created_by was referencing auth.users(id).
-- Run this in Supabase SQL Editor.

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_created_by_fkey;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
