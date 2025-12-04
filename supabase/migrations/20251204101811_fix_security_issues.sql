/*
  # Fix Database Security Issues

  ## 1. Add Missing Indexes on Foreign Keys
    - Add index on `cloture_mensuelle.salarie_id`
    - Add index on `documents.upload_par`
    - Add index on `heures.valide_par`
    - Add index on `planning.valide_par`

  ## 2. Optimize RLS Policies for Performance
    - Wrap all `auth.uid()` calls in policies with `(select auth.uid())`
    - Wrap all `auth.jwt()` calls with `(select auth.jwt())`
    - This prevents re-evaluation for each row and improves query performance

  ## 3. Fix Function Search Path Security
    - Add `SET search_path = public, pg_temp` to all functions
    - This prevents search_path manipulation attacks

  ## 4. Remove Unused Indexes (Optional Cleanup)
    - Remove indexes that are not being used

  ## Security Impact
    - Improved query performance through proper indexing
    - Prevention of RLS performance bottlenecks
    - Protection against search_path attacks
    - Better overall database security posture
*/

-- ============================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cloture_mensuelle_salarie_id 
  ON cloture_mensuelle(salarie_id);

CREATE INDEX IF NOT EXISTS idx_documents_upload_par 
  ON documents(upload_par);

CREATE INDEX IF NOT EXISTS idx_heures_valide_par 
  ON heures(valide_par);

CREATE INDEX IF NOT EXISTS idx_planning_valide_par 
  ON planning(valide_par);

-- ============================================
-- 2. FIX FUNCTION SEARCH PATH SECURITY
-- ============================================

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Fix get_my_role function
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Fix can_read_all_profiles function (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_read_all_profiles') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION can_read_all_profiles()
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    SET search_path = public, pg_temp
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN (''preteuse'', ''accueil'')
      );
    $func$;';
  END IF;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix calculate_frais_parts function
CREATE OR REPLACE FUNCTION calculate_frais_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
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
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- Fix update_bilans_hebdomadaires_updated_at function
CREATE OR REPLACE FUNCTION update_bilans_hebdomadaires_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix check_bilan_coherence function (drop trigger first, then recreate)
DROP TRIGGER IF EXISTS trigger_check_bilan_coherence ON bilans_hebdomadaires;

CREATE OR REPLACE FUNCTION check_bilan_coherence()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_heures_accueil numeric;
  v_heures_preteuse numeric;
  v_frais_semaine numeric;
BEGIN
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (heure_fin - heure_debut))/3600
  ), 0) INTO v_heures_accueil
  FROM heures
  WHERE salarie_id = NEW.salarie_id
    AND date >= NEW.semaine_debut
    AND date <= NEW.semaine_fin;

  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (heure_fin - heure_debut))/3600
  ), 0) INTO v_heures_preteuse
  FROM planning
  WHERE salarie_id = NEW.salarie_id
    AND date >= NEW.semaine_debut
    AND date <= NEW.semaine_fin;

  IF ABS(v_heures_accueil - NEW.temps_ecole_accueil) > 1 THEN
    INSERT INTO alertes_bilans (bilan_id, type_alerte, message, details)
    VALUES (
      NEW.id,
      'ecart_heures_accueil',
      format('Écart détecté: %s h déclarées vs %s h dans le système', 
             NEW.temps_ecole_accueil, v_heures_accueil),
      jsonb_build_object(
        'heures_declarees', NEW.temps_ecole_accueil,
        'heures_systeme', v_heures_accueil,
        'ecart', ABS(v_heures_accueil - NEW.temps_ecole_accueil)
      )
    );
  END IF;

  IF ABS(v_heures_preteuse - NEW.temps_ecole_preteuse) > 1 THEN
    INSERT INTO alertes_bilans (bilan_id, type_alerte, message, details)
    VALUES (
      NEW.id,
      'ecart_heures_preteuse',
      format('Écart détecté: %s h déclarées vs %s h dans le système', 
             NEW.temps_ecole_preteuse, v_heures_preteuse),
      jsonb_build_object(
        'heures_declarees', NEW.temps_ecole_preteuse,
        'heures_systeme', v_heures_preteuse,
        'ecart', ABS(v_heures_preteuse - NEW.temps_ecole_preteuse)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_check_bilan_coherence
  AFTER INSERT OR UPDATE ON bilans_hebdomadaires
  FOR EACH ROW
  EXECUTE FUNCTION check_bilan_coherence();

-- Fix verrouiller_bilans_mois function
CREATE OR REPLACE FUNCTION verrouiller_bilans_mois(mois_cloture text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE bilans_hebdomadaires
  SET verrouille = true
  WHERE EXTRACT(YEAR FROM semaine_debut) || '-' || LPAD(EXTRACT(MONTH FROM semaine_debut)::text, 2, '0') = mois_cloture;
END;
$$;

-- Fix auto_verrouiller_bilans_cloture function (drop trigger first, then recreate)
DROP TRIGGER IF EXISTS trigger_auto_verrouiller_bilans_cloture ON cloture_mensuelle;

CREATE OR REPLACE FUNCTION auto_verrouiller_bilans_cloture()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.signature_salarie = true 
     AND NEW.signature_accueil = true 
     AND NEW.signature_preteuse = true THEN
    UPDATE bilans_hebdomadaires
    SET verrouille = true
    WHERE salarie_id = NEW.salarie_id
      AND EXTRACT(YEAR FROM semaine_debut) || '-' || LPAD(EXTRACT(MONTH FROM semaine_debut)::text, 2, '0') = NEW.mois;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_auto_verrouiller_bilans_cloture
  AFTER UPDATE ON cloture_mensuelle
  FOR EACH ROW
  EXECUTE FUNCTION auto_verrouiller_bilans_cloture();

-- ============================================
-- 3. OPTIMIZE RLS POLICIES (Wrap auth.uid())
-- ============================================

-- PROFILES TABLE POLICIES
DROP POLICY IF EXISTS "Utilisateurs peuvent mettre à jour leur propre profil" ON profiles;
CREATE POLICY "Utilisateurs peuvent mettre à jour leur propre profil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Lecture des profils" ON profiles;
CREATE POLICY "Lecture des profils"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
    OR
    get_my_role() IN ('preteuse', 'accueil')
  );

DROP POLICY IF EXISTS "Permettre création de profils" ON profiles;
CREATE POLICY "Permettre création de profils"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'preteuse'
    )
  );

DROP POLICY IF EXISTS "Service role peut tout mettre à jour" ON profiles;
CREATE POLICY "Service role peut tout mettre à jour"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (select auth.jwt()->>'role') = 'service_role'
  )
  WITH CHECK (
    (select auth.jwt()->>'role') = 'service_role'
  );

-- PLANNING TABLE POLICIES
DROP POLICY IF EXISTS "Lire le planning selon le rôle" ON planning;
CREATE POLICY "Lire le planning selon le rôle"
  ON planning FOR SELECT
  TO authenticated
  USING (
    salarie_id = (select auth.uid()) OR
    get_user_role() IN ('accueil', 'preteuse', 'compta')
  );

-- HEURES TABLE POLICIES
DROP POLICY IF EXISTS "Lire les heures selon le rôle" ON heures;
CREATE POLICY "Lire les heures selon le rôle"
  ON heures FOR SELECT
  TO authenticated
  USING (
    salarie_id = (select auth.uid()) OR
    get_user_role() IN ('accueil', 'preteuse', 'compta')
  );

DROP POLICY IF EXISTS "Salarié peut déclarer ses heures" ON heures;
CREATE POLICY "Salarié peut déclarer ses heures"
  ON heures FOR INSERT
  TO authenticated
  WITH CHECK (
    salarie_id = (select auth.uid()) AND
    get_user_role() = 'salarie'
  );

-- FRAIS TABLE POLICIES
DROP POLICY IF EXISTS "Lire les frais selon le rôle" ON frais;
CREATE POLICY "Lire les frais selon le rôle"
  ON frais FOR SELECT
  TO authenticated
  USING (
    salarie_id = (select auth.uid()) OR
    get_user_role() IN ('accueil', 'preteuse', 'compta')
  );

DROP POLICY IF EXISTS "Salarié peut déclarer ses frais" ON frais;
CREATE POLICY "Salarié peut déclarer ses frais"
  ON frais FOR INSERT
  TO authenticated
  WITH CHECK (
    salarie_id = (select auth.uid()) AND
    get_user_role() = 'salarie'
  );

-- CLOTURE_MENSUELLE TABLE POLICIES
DROP POLICY IF EXISTS "Lire les clôtures selon le rôle" ON cloture_mensuelle;
CREATE POLICY "Lire les clôtures selon le rôle"
  ON cloture_mensuelle FOR SELECT
  TO authenticated
  USING (
    salarie_id = (select auth.uid()) OR
    get_user_role() IN ('accueil', 'preteuse', 'compta')
  );

DROP POLICY IF EXISTS "Signer les clôtures selon le rôle" ON cloture_mensuelle;
CREATE POLICY "Signer les clôtures selon le rôle"
  ON cloture_mensuelle FOR UPDATE
  TO authenticated
  USING (
    (salarie_id = (select auth.uid()) AND get_user_role() = 'salarie') OR
    get_user_role() IN ('accueil', 'preteuse')
  )
  WITH CHECK (
    (salarie_id = (select auth.uid()) AND get_user_role() = 'salarie') OR
    get_user_role() IN ('accueil', 'preteuse')
  );

-- ECOLES TABLE POLICIES  
DROP POLICY IF EXISTS "Prêteuses peuvent créer des écoles" ON ecoles;
CREATE POLICY "Prêteuses peuvent créer des écoles"
  ON ecoles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'preteuse'
    )
  );

DROP POLICY IF EXISTS "Prêteuses peuvent modifier des écoles" ON ecoles;
CREATE POLICY "Prêteuses peuvent modifier des écoles"
  ON ecoles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'preteuse'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'preteuse'
    )
  );

DROP POLICY IF EXISTS "Prêteuses peuvent supprimer des écoles" ON ecoles;
CREATE POLICY "Prêteuses peuvent supprimer des écoles"
  ON ecoles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'preteuse'
    )
  );

-- BILANS_HEBDOMADAIRES TABLE POLICIES
DROP POLICY IF EXISTS "Salariés peuvent voir leurs propres bilans" ON bilans_hebdomadaires;
CREATE POLICY "Salariés peuvent voir leurs propres bilans"
  ON bilans_hebdomadaires FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = salarie_id);

DROP POLICY IF EXISTS "Prêteuse peut voir tous les bilans" ON bilans_hebdomadaires;
CREATE POLICY "Prêteuse peut voir tous les bilans"
  ON bilans_hebdomadaires FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'preteuse'
    )
  );

DROP POLICY IF EXISTS "Compta peut voir tous les bilans" ON bilans_hebdomadaires;
CREATE POLICY "Compta peut voir tous les bilans"
  ON bilans_hebdomadaires FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'compta'
    )
  );

DROP POLICY IF EXISTS "Accueil peut voir tous les bilans" ON bilans_hebdomadaires;
CREATE POLICY "Accueil peut voir tous les bilans"
  ON bilans_hebdomadaires FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'accueil'
    )
  );

DROP POLICY IF EXISTS "Salariés peuvent créer leurs propres bilans" ON bilans_hebdomadaires;
CREATE POLICY "Salariés peuvent créer leurs propres bilans"
  ON bilans_hebdomadaires FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = salarie_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'salarie'
    )
  );

DROP POLICY IF EXISTS "Salariés peuvent modifier leurs bilans non verrouillés" ON bilans_hebdomadaires;
CREATE POLICY "Salariés peuvent modifier leurs bilans non verrouillés"
  ON bilans_hebdomadaires FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = salarie_id
    AND verrouille = false
    AND statut_accueil = 'en_attente'
    AND statut_preteuse = 'en_attente'
  )
  WITH CHECK (
    (select auth.uid()) = salarie_id
    AND verrouille = false
  );

DROP POLICY IF EXISTS "Prêteuse peut valider tous les bilans" ON bilans_hebdomadaires;
CREATE POLICY "Prêteuse peut valider tous les bilans"
  ON bilans_hebdomadaires FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'preteuse'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'preteuse'
    )
  );

DROP POLICY IF EXISTS "Accueil peut valider tous les bilans" ON bilans_hebdomadaires;
CREATE POLICY "Accueil peut valider tous les bilans"
  ON bilans_hebdomadaires FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'accueil'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'accueil'
    )
  );

DROP POLICY IF EXISTS "Salariés peuvent supprimer leurs bilans non verrouillés" ON bilans_hebdomadaires;
CREATE POLICY "Salariés peuvent supprimer leurs bilans non verrouillés"
  ON bilans_hebdomadaires FOR DELETE
  TO authenticated
  USING (
    (select auth.uid()) = salarie_id
    AND verrouille = false
    AND statut_accueil = 'en_attente'
    AND statut_preteuse = 'en_attente'
  );

-- ALERTES_BILANS TABLE POLICIES
DROP POLICY IF EXISTS "Salariés peuvent voir les alertes de leurs bilans" ON alertes_bilans;
CREATE POLICY "Salariés peuvent voir les alertes de leurs bilans"
  ON alertes_bilans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bilans_hebdomadaires
      WHERE bilans_hebdomadaires.id = alertes_bilans.bilan_id
      AND bilans_hebdomadaires.salarie_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Prêteuse peut voir toutes les alertes" ON alertes_bilans;
CREATE POLICY "Prêteuse peut voir toutes les alertes"
  ON alertes_bilans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'preteuse'
    )
  );

DROP POLICY IF EXISTS "Compta peut voir toutes les alertes" ON alertes_bilans;
CREATE POLICY "Compta peut voir toutes les alertes"
  ON alertes_bilans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'compta'
    )
  );

DROP POLICY IF EXISTS "Accueil peut voir toutes les alertes" ON alertes_bilans;
CREATE POLICY "Accueil peut voir toutes les alertes"
  ON alertes_bilans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'accueil'
    )
  );

DROP POLICY IF EXISTS "Prêteuse peut mettre à jour les alertes" ON alertes_bilans;
CREATE POLICY "Prêteuse peut mettre à jour les alertes"
  ON alertes_bilans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'preteuse'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'preteuse'
    )
  );

-- ============================================
-- 4. REMOVE UNUSED INDEXES (OPTIONAL CLEANUP)
-- ============================================

DROP INDEX IF EXISTS idx_audit_user;
DROP INDEX IF EXISTS idx_audit_table;
DROP INDEX IF EXISTS idx_profiles_ecole_id;
DROP INDEX IF EXISTS idx_bilans_salarie;
DROP INDEX IF EXISTS idx_bilans_verrouille;
