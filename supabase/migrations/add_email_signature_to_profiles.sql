-- Add email_signature column to profiles table
-- This allows users to store their custom email signature for CRM emails

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'email_signature'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN email_signature TEXT;

        RAISE NOTICE 'Added email_signature column to profiles table';
    ELSE
        RAISE NOTICE 'email_signature column already exists in profiles table';
    END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN profiles.email_signature IS 'User''s custom email signature in HTML format, appended to CRM emails';
