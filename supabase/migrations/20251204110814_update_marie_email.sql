/*
  # Update Marie Email Address

  1. Changes
    - Update the authentication email for Marie Charron from 'marie@test.fr' to 'marie.charron@edp-fer-ensemble.fr'
    - This ensures the login email matches the professional email
  
  2. Security
    - No RLS changes needed
*/

-- Update the email in auth.users table
UPDATE auth.users
SET email = 'marie.charron@edp-fer-ensemble.fr',
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      '"marie.charron@edp-fer-ensemble.fr"'::jsonb
    )
WHERE id = '2c74190f-851c-442e-92b9-c57c465516a4';
