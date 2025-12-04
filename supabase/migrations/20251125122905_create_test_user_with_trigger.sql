/*
  # Créer un utilisateur de test prêteuse
  
  Compte créé:
  - Email: test@test.fr
  - Mot de passe: Password123!
  - Rôle: preteuse
  
  Le trigger handle_new_user() créera automatiquement le profil.
*/

-- Créer l'utilisateur (le trigger créera le profil automatiquement)
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'test@test.fr',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nom":"Test","prenom":"Utilisateur","role":"preteuse"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    test_user_id,
    test_user_id::text,
    jsonb_build_object('sub', test_user_id::text, 'email', 'test@test.fr'),
    'email',
    now(),
    now(),
    now()
  );

  RAISE NOTICE '✓ Utilisateur créé: test@test.fr / Password123!';
END $$;
