/*
  # Désactivation du trigger automatique de création de profil

  1. Problème identifié
    - Le trigger `on_auth_user_created` essaie de créer le profil automatiquement
    - Les métadonnées utilisateur ne sont pas toujours disponibles immédiatement
    - Cela cause des erreurs "Database error creating new user"

  2. Solution
    - Désactiver le trigger automatique
    - Gérer la création du profil manuellement dans l'Edge Function
    - Cela donne un contrôle total sur le timing et les données
*/

-- Désactiver le trigger de création automatique de profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Optionnellement, on peut aussi supprimer la fonction si elle n'est plus utilisée
-- DROP FUNCTION IF EXISTS handle_new_user();
