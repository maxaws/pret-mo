/*
  # RLS Policies pour les Bilans Hebdomadaires

  1. Policies pour `bilans_hebdomadaires`
    - Les salariés peuvent voir leurs propres bilans
    - Les salariés peuvent créer leurs propres bilans (si non verrouillés)
    - Les salariés peuvent modifier leurs propres bilans (si non verrouillés et non validés)
    - L'accueil peut voir les bilans des salariés de son école
    - L'accueil peut mettre à jour le statut_accueil et commentaire_accueil
    - La prêteuse peut voir tous les bilans
    - La prêteuse peut mettre à jour le statut_preteuse et commentaire_preteuse

  2. Policies pour `alertes_bilans`
    - Les salariés peuvent voir les alertes de leurs bilans
    - L'accueil peut voir les alertes des bilans de son école
    - La prêteuse peut voir toutes les alertes
*/

-- Policies pour bilans_hebdomadaires - SELECT
CREATE POLICY "Salariés peuvent voir leurs propres bilans"
  ON bilans_hebdomadaires FOR SELECT
  TO authenticated
  USING (auth.uid() = salarie_id);

CREATE POLICY "Accueil peut voir les bilans de son école"
  ON bilans_hebdomadaires FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'accueil'
      AND profiles.ecole_id IN (
        SELECT ecole_id FROM profiles WHERE id = bilans_hebdomadaires.salarie_id
      )
    )
  );

CREATE POLICY "Prêteuse peut voir tous les bilans"
  ON bilans_hebdomadaires FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'preteuse'
    )
  );

CREATE POLICY "Compta peut voir tous les bilans"
  ON bilans_hebdomadaires FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compta'
    )
  );

-- Policies pour bilans_hebdomadaires - INSERT
CREATE POLICY "Salariés peuvent créer leurs propres bilans"
  ON bilans_hebdomadaires FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = salarie_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'salarie'
    )
  );

-- Policies pour bilans_hebdomadaires - UPDATE
CREATE POLICY "Salariés peuvent modifier leurs bilans non verrouillés"
  ON bilans_hebdomadaires FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = salarie_id
    AND verrouille = false
    AND statut_accueil = 'en_attente'
    AND statut_preteuse = 'en_attente'
  )
  WITH CHECK (
    auth.uid() = salarie_id
    AND verrouille = false
  );

CREATE POLICY "Accueil peut valider les bilans de son école"
  ON bilans_hebdomadaires FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'accueil'
      AND profiles.ecole_id IN (
        SELECT ecole_id FROM profiles WHERE id = bilans_hebdomadaires.salarie_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'accueil'
    )
  );

CREATE POLICY "Prêteuse peut valider tous les bilans"
  ON bilans_hebdomadaires FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'preteuse'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'preteuse'
    )
  );

-- Policies pour bilans_hebdomadaires - DELETE
CREATE POLICY "Salariés peuvent supprimer leurs bilans non verrouillés"
  ON bilans_hebdomadaires FOR DELETE
  TO authenticated
  USING (
    auth.uid() = salarie_id
    AND verrouille = false
    AND statut_accueil = 'en_attente'
    AND statut_preteuse = 'en_attente'
  );

-- Policies pour alertes_bilans - SELECT
CREATE POLICY "Salariés peuvent voir les alertes de leurs bilans"
  ON alertes_bilans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bilans_hebdomadaires
      WHERE bilans_hebdomadaires.id = alertes_bilans.bilan_id
      AND bilans_hebdomadaires.salarie_id = auth.uid()
    )
  );

CREATE POLICY "Accueil peut voir les alertes des bilans de son école"
  ON alertes_bilans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bilans_hebdomadaires
      INNER JOIN profiles ON profiles.id = bilans_hebdomadaires.salarie_id
      WHERE bilans_hebdomadaires.id = alertes_bilans.bilan_id
      AND EXISTS (
        SELECT 1 FROM profiles p2
        WHERE p2.id = auth.uid()
        AND p2.role = 'accueil'
        AND p2.ecole_id = profiles.ecole_id
      )
    )
  );

CREATE POLICY "Prêteuse peut voir toutes les alertes"
  ON alertes_bilans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'preteuse'
    )
  );

CREATE POLICY "Compta peut voir toutes les alertes"
  ON alertes_bilans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compta'
    )
  );

-- Policies pour alertes_bilans - INSERT (système uniquement via trigger)
CREATE POLICY "Système peut créer des alertes"
  ON alertes_bilans FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies pour alertes_bilans - UPDATE
CREATE POLICY "Prêteuse peut mettre à jour les alertes"
  ON alertes_bilans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'preteuse'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'preteuse'
    )
  );
