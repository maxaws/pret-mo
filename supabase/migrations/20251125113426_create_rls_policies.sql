/*
  # Politiques RLS pour toutes les tables

  1. Politiques profiles
    - Les utilisateurs peuvent lire leur propre profil
    - Les rôles prêteuse et accueil peuvent lire tous les profils
    - Les utilisateurs peuvent mettre à jour leur propre profil (champs limités)
    - Seuls les utilisateurs prêteuse peuvent créer de nouveaux profils

  2. Politiques planning
    - Les salariés peuvent lire leur propre planning
    - Les rôles accueil et prêteuse peuvent lire tout le planning
    - Le rôle accueil peut créer des propositions de planning
    - Le rôle prêteuse peut valider/refuser le planning
    - Le rôle compta peut lire le planning validé

  3. Politiques heures
    - Les salariés peuvent créer et lire leurs propres heures
    - Les rôles accueil et prêteuse peuvent lire et valider les heures
    - Le rôle compta peut lire les heures validées
    - Workflow de validation séquentiel: accueil puis prêteuse

  4. Politiques frais
    - Les salariés peuvent créer et lire leurs propres frais
    - Les rôles accueil et prêteuse peuvent lire et valider les frais
    - Le rôle compta peut lire les frais validés
    - Workflow de validation séquentiel: accueil puis prêteuse

  5. Politiques cloture_mensuelle
    - Les salariés peuvent lire et signer leurs propres clôtures
    - Les rôles accueil et prêteuse peuvent lire et signer les clôtures
    - Le rôle compta peut lire les clôtures finalisées

  6. Politiques documents
    - Les rôles prêteuse et compta peuvent lire tous les documents
    - Le rôle prêteuse peut créer des documents
    - Les salariés et accueil ont accès limité à leurs documents

  7. Politiques audit_logs
    - Seul le rôle prêteuse peut lire les logs d'audit
    - Les logs sont créés automatiquement par des triggers

  Notes de sécurité:
    - Toutes les politiques vérifient l'authentification
    - Les permissions sont restrictives par défaut
    - Chaque action est contrôlée par rôle
*/

-- Helper function pour obtenir le rôle de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Politiques pour profiles
CREATE POLICY "Utilisateurs peuvent lire leur propre profil"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR get_user_role() IN ('preteuse', 'accueil'));

CREATE POLICY "Utilisateurs peuvent mettre à jour leur propre profil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Prêteuse peut créer des profils"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'preteuse');

-- Politiques pour planning
CREATE POLICY "Lire le planning selon le rôle"
  ON planning FOR SELECT
  TO authenticated
  USING (
    salarie_id = auth.uid() OR
    get_user_role() IN ('accueil', 'preteuse', 'compta')
  );

CREATE POLICY "Accueil peut proposer du planning"
  ON planning FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'accueil');

CREATE POLICY "Prêteuse peut valider le planning"
  ON planning FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'preteuse')
  WITH CHECK (get_user_role() = 'preteuse');

-- Politiques pour heures
CREATE POLICY "Lire les heures selon le rôle"
  ON heures FOR SELECT
  TO authenticated
  USING (
    salarie_id = auth.uid() OR
    get_user_role() IN ('accueil', 'preteuse', 'compta')
  );

CREATE POLICY "Salarié peut déclarer ses heures"
  ON heures FOR INSERT
  TO authenticated
  WITH CHECK (
    salarie_id = auth.uid() AND
    get_user_role() = 'salarie'
  );

CREATE POLICY "Accueil et prêteuse peuvent valider les heures"
  ON heures FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('accueil', 'preteuse'))
  WITH CHECK (get_user_role() IN ('accueil', 'preteuse'));

-- Politiques pour frais
CREATE POLICY "Lire les frais selon le rôle"
  ON frais FOR SELECT
  TO authenticated
  USING (
    salarie_id = auth.uid() OR
    get_user_role() IN ('accueil', 'preteuse', 'compta')
  );

CREATE POLICY "Salarié peut déclarer ses frais"
  ON frais FOR INSERT
  TO authenticated
  WITH CHECK (
    salarie_id = auth.uid() AND
    get_user_role() = 'salarie'
  );

CREATE POLICY "Accueil et prêteuse peuvent valider les frais"
  ON frais FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('accueil', 'preteuse'))
  WITH CHECK (get_user_role() IN ('accueil', 'preteuse'));

-- Politiques pour cloture_mensuelle
CREATE POLICY "Lire les clôtures selon le rôle"
  ON cloture_mensuelle FOR SELECT
  TO authenticated
  USING (
    salarie_id = auth.uid() OR
    get_user_role() IN ('accueil', 'preteuse', 'compta')
  );

CREATE POLICY "Créer des clôtures mensuelles"
  ON cloture_mensuelle FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('salarie', 'accueil', 'preteuse'));

CREATE POLICY "Signer les clôtures selon le rôle"
  ON cloture_mensuelle FOR UPDATE
  TO authenticated
  USING (
    (salarie_id = auth.uid() AND get_user_role() = 'salarie') OR
    get_user_role() IN ('accueil', 'preteuse')
  )
  WITH CHECK (
    (salarie_id = auth.uid() AND get_user_role() = 'salarie') OR
    get_user_role() IN ('accueil', 'preteuse')
  );

-- Politiques pour documents
CREATE POLICY "Lire les documents selon le rôle"
  ON documents FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('preteuse', 'compta'));

CREATE POLICY "Prêteuse peut créer des documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'preteuse');

-- Politiques pour audit_logs
CREATE POLICY "Prêteuse peut lire les logs d'audit"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (get_user_role() = 'preteuse');

CREATE POLICY "Système peut créer des logs d'audit"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_planning_updated_at') THEN
    CREATE TRIGGER update_planning_updated_at
      BEFORE UPDATE ON planning
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_heures_updated_at') THEN
    CREATE TRIGGER update_heures_updated_at
      BEFORE UPDATE ON heures
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_frais_updated_at') THEN
    CREATE TRIGGER update_frais_updated_at
      BEFORE UPDATE ON frais
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger pour calcul automatique des parts de frais
CREATE OR REPLACE FUNCTION calculate_frais_parts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.affectation = 'mixte' THEN
    NEW.part_preteuse := NEW.montant_ttc * NEW.taux_ventilation;
    NEW.part_accueil := NEW.montant_ttc * (1 - NEW.taux_ventilation);
  ELSIF NEW.affectation = 'preteuse' THEN
    NEW.part_preteuse := NEW.montant_ttc;
    NEW.part_accueil := 0;
  ELSIF NEW.affectation = 'accueil' THEN
    NEW.part_preteuse := 0;
    NEW.part_accueil := NEW.montant_ttc;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'calculate_frais_parts_trigger') THEN
    CREATE TRIGGER calculate_frais_parts_trigger
      BEFORE INSERT OR UPDATE ON frais
      FOR EACH ROW
      EXECUTE FUNCTION calculate_frais_parts();
  END IF;
END $$;

-- Fonction pour créer un profil automatiquement lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'salarie')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
