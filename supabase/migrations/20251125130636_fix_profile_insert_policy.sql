/*
  # Correction des politiques RLS pour les profils

  1. Problème identifié
    - La politique d'insertion utilise `get_user_role()` qui échoue lors de la création d'un nouveau profil
    - Le service role (Edge Function) ne peut pas créer de profils

  2. Solution
    - Supprimer l'ancienne politique d'insertion restrictive
    - Ajouter une nouvelle politique qui permet:
      a) Au service role (utilisé dans les Edge Functions) de créer n'importe quel profil
      b) Aux prêteuses de créer des profils de salariés
*/

-- Supprimer l'ancienne politique d'insertion
DROP POLICY IF EXISTS "Prêteuse peut créer des profils" ON profiles;

-- Nouvelle politique pour permettre la création de profils
CREATE POLICY "Permettre création de profils"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Le service role peut tout créer (utilisé dans les Edge Functions)
    auth.jwt()->>'role' = 'service_role'
    OR
    -- Les prêteuses peuvent créer des profils de salariés
    (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'preteuse'
      )
      AND role = 'salarie'
    )
  );

-- Politique pour permettre au service role de tout mettre à jour
CREATE POLICY "Service role peut tout mettre à jour"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR
    id = auth.uid()
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
    OR
    id = auth.uid()
  );
