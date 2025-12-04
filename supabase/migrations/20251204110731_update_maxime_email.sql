/*
  # Update Maxime Email Address

  1. Changes
    - Update the authentication email for Maxime Gacher from 'test@test.fr' to 'maxime.gacher@edp-fer-ensemble.fr'
    - This ensures the login email matches the profile email
  
  2. Security
    - No RLS changes needed
*/

-- Update the email in auth.users table
UPDATE auth.users
SET email = 'maxime.gacher@edp-fer-ensemble.fr',
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      '"maxime.gacher@edp-fer-ensemble.fr"'::jsonb
    )
WHERE id = '36ad0873-edb6-4972-a1db-5138207d7aea';
