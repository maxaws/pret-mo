/*
  # Correction de la politique SELECT pour les profils

  1. Problème identifié
    - La politique SELECT actuelle utilise `get_user_role()` 
    - Cela peut créer des problèmes de performance et de dépendance circulaire
    - Les prêteuses ne peuvent pas voir la liste des salariés

  2. Solution
    - Remplacer par une politique plus directe
    - Permettre aux utilisateurs de voir leur propre profil
    - Permettre aux prêteuses et accueil de voir tous les profils
*/

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Utilisateurs peuvent lire leur propre profil" ON profiles;

-- Nouvelle politique SELECT plus simple et efficace
CREATE POLICY "Lecture des profils"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- L'utilisateur peut lire son propre profil
    id = auth.uid()
    OR
    -- Les prêteuses et accueil peuvent lire tous les profils
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('preteuse', 'accueil')
    )
  );
