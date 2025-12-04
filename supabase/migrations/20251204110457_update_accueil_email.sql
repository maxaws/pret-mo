/*
  # Update Accueil Email Address

  1. Changes
    - Update the authentication email for the accueil account from 'accueil@test.com' to 'direction@lesprosdavenir.com'
    - This ensures the login email matches the profile email
  
  2. Security
    - No RLS changes needed
*/

-- Update the email in auth.users table
UPDATE auth.users
SET email = 'direction@lesprosdavenir.com',
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      '"direction@lesprosdavenir.com"'::jsonb
    )
WHERE id = 'f2c3d52c-2fab-44a8-8db6-35d28b9cfce1';
