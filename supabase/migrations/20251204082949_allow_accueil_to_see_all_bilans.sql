/*
  # Permettre à l'accueil de voir tous les bilans

  1. Modifications
    - Suppression de la politique restrictive pour l'accueil basée sur l'école
    - Ajout d'une nouvelle politique permettant à l'accueil de voir tous les bilans (comme la prêteuse)
    - Mise à jour de la politique d'UPDATE pour permettre à l'accueil de valider tous les bilans
    - Mise à jour de la politique des alertes pour permettre à l'accueil de voir toutes les alertes

  2. Justification
    - L'accueil doit pouvoir superviser tous les bilans, pas seulement ceux de son école
    - Cela permet une gestion centralisée et plus flexible
*/

-- Supprimer l'ancienne politique restrictive pour l'accueil (SELECT)
DROP POLICY IF EXISTS "Accueil peut voir les bilans de son école" ON bilans_hebdomadaires;

-- Créer une nouvelle politique permettant à l'accueil de voir tous les bilans
CREATE POLICY "Accueil peut voir tous les bilans"
  ON bilans_hebdomadaires FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'accueil'
    )
  );

-- Supprimer l'ancienne politique restrictive pour l'accueil (UPDATE)
DROP POLICY IF EXISTS "Accueil peut valider les bilans de son école" ON bilans_hebdomadaires;

-- Créer une nouvelle politique permettant à l'accueil de valider tous les bilans
CREATE POLICY "Accueil peut valider tous les bilans"
  ON bilans_hebdomadaires FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'accueil'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'accueil'
    )
  );

-- Supprimer l'ancienne politique restrictive pour les alertes
DROP POLICY IF EXISTS "Accueil peut voir les alertes des bilans de son école" ON alertes_bilans;

-- Créer une nouvelle politique permettant à l'accueil de voir toutes les alertes
CREATE POLICY "Accueil peut voir toutes les alertes"
  ON alertes_bilans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'accueil'
    )
  );
