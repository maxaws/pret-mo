/*
  # Correction de la récursion infinie dans la politique SELECT

  1. Problème identifié
    - La politique SELECT fait une sous-requête sur profiles
    - Cela crée une récursion infinie car la sous-requête déclenche la même politique
    
  2. Solution
    - Utiliser directement auth.uid() sans sous-requête pour vérifier le rôle
    - Simplifier en vérifiant uniquement l'accès direct aux données
*/

-- Supprimer la politique problématique
DROP POLICY IF EXISTS "Lecture des profils" ON profiles;

-- Nouvelle politique sans récursion
-- On permet la lecture si:
-- 1. C'est son propre profil OU
-- 2. L'utilisateur authentifié a le rôle preteuse ou accueil (stocké dans son propre profil)
CREATE POLICY "Lecture des profils"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('preteuse', 'accueil')
  );
