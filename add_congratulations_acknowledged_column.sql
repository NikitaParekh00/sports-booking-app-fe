-- Add congratulations_modal_acknowledged column to auction_sessions table
-- This flag controls whether the congratulations modal should be shown
-- When admin clicks Proceed, this is set to true, which hides the modal for everyone

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS congratulations_modal_acknowledged BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.auction_sessions.congratulations_modal_acknowledged IS 'When false, shows congratulations modal. Set to true when admin clicks Proceed to acknowledge and hide the modal.';
