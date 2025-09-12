-- Update profiles table to add new fields for authentication flow
--- This script adds the missing columns to the existing profiles table

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Add referral_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
        ALTER TABLE public.profiles ADD COLUMN referral_code VARCHAR(50);
    END IF;
    
    -- Add receive_whatsapp_updates column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'receive_whatsapp_updates') THEN
        ALTER TABLE public.profiles ADD COLUMN receive_whatsapp_updates BOOLEAN DEFAULT true;
    END IF;
    
    -- Add receive_hudle_updates column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'receive_hudle_updates') THEN
        ALTER TABLE public.profiles ADD COLUMN receive_hudle_updates BOOLEAN DEFAULT true;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
        ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create updated_at trigger if it doesn't exist
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Update existing profiles to have default values for new boolean columns
UPDATE public.profiles 
SET 
    receive_whatsapp_updates = COALESCE(receive_whatsapp_updates, true),
    receive_hudle_updates = COALESCE(receive_hudle_updates, true),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE 
    receive_whatsapp_updates IS NULL 
    OR receive_hudle_updates IS NULL 
    OR created_at IS NULL 
    OR updated_at IS NULL;
