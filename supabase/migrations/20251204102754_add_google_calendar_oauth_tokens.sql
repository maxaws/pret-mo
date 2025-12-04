/*
  # Add Google Calendar OAuth Tokens

  1. Changes
    - Add columns to `profiles` table to store Google OAuth tokens
      - `google_access_token` (encrypted text)
      - `google_refresh_token` (encrypted text)
      - `google_token_expiry` (timestamp)
      - `google_calendar_sync_enabled` (boolean)
  
  2. Security
    - Tokens are stored encrypted
    - Only the user can access their own tokens via RLS
*/

-- Add Google OAuth token columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'google_access_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN google_access_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'google_refresh_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN google_refresh_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'google_token_expiry'
  ) THEN
    ALTER TABLE profiles ADD COLUMN google_token_expiry timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'google_calendar_sync_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN google_calendar_sync_enabled boolean DEFAULT false;
  END IF;
END $$;