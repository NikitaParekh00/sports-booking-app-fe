-- Fix profiles table foreign key constraint for development
-- This allows us to create profiles without requiring users to exist in auth.users

-- Option 1: Drop the foreign key constraint temporarily
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Option 2: Create a function to handle user creation
-- This is safer as it maintains data integrity while allowing development

-- Create a function to safely create a profile with user_id
CREATE OR REPLACE FUNCTION create_profile_with_user(
    p_user_id UUID,
    p_full_name TEXT,
    p_phone TEXT,
    p_email TEXT DEFAULT NULL,
    p_referral_code TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'customer'
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        -- Create a minimal user record in auth.users for development
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            phone,
            phone_confirmed_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            last_sign_in_at,
            app_metadata,
            user_metadata,
            identities,
            factors,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user,
            deleted_at
        ) VALUES (
            p_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            COALESCE(p_email, p_user_id::text || '@temp.com'),
            crypt('temp_password', gen_salt('bf')),
            NOW(),
            p_phone,
            NOW(),
            '',
            '',
            '',
            '',
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            false,
            NOW(),
            '{}',
            '{}',
            '[]',
            '[]',
            NULL,
            '',
            NULL,
            false,
            NULL
        );
    END IF;
    
    -- Now create the profile
    INSERT INTO public.profiles (
        user_id,
        full_name,
        phone,
        email,
        referral_code,
        role,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_full_name,
        p_phone,
        p_email,
        p_referral_code,
        p_role,
        NOW(),
        NOW()
    );
    
    RETURN p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_profile_with_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_profile_with_user TO anon;
