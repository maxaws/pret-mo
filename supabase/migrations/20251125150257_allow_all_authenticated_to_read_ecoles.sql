/*
  # Permettre la lecture des écoles pour tous les utilisateurs authentifiés

  1. Modifications
    - Supprime la politique restrictive de lecture pour les prêteuses uniquement
    - Ajoute une politique permettant à tous les utilisateurs authentifiés de lire les écoles
  
  2. Sécurité
    - Tous les utilisateurs authentifiés peuvent consulter la liste des écoles
    - Seules les prêteuses peuvent créer/modifier/supprimer des écoles
*/

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Prêteuses peuvent lire les écoles" ON ecoles;

-- Créer une nouvelle politique permettant à tous les utilisateurs authentifiés de lire
CREATE POLICY "Utilisateurs authentifiés peuvent lire les écoles"
  ON ecoles
  FOR SELECT
  TO authenticated
  USING (true);
