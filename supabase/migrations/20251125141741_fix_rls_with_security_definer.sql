/*
  # Correction définitive de la récursion infinie RLS

  1. Problème identifié
    - Toute sous-requête sur profiles déclenche la politique RLS
    - Cela crée une récursion infinie
    
  2. Solution
    - Créer une fonction SECURITY DEFINER qui bypass RLS
    - Utiliser cette fonction dans la politique pour éviter la récursion
*/

-- Fonction sécurisée pour obtenir le rôle sans déclencher RLS
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Lecture des profils" ON profiles;

-- Nouvelle politique utilisant la fonction SECURITY DEFINER
CREATE POLICY "Lecture des profils"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    get_my_role() IN ('preteuse', 'accueil')
  );
