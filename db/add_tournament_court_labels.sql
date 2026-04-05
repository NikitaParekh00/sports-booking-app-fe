-- Optional display names for schedule columns (Court 1, Court 2, …). Run in Supabase SQL editor.
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS court_labels JSONB DEFAULT NULL;

COMMENT ON COLUMN public.tournaments.court_labels IS 'JSON array of strings, index 0 = court 1 label; empty strings mean default "Court N". Null = all defaults.';
