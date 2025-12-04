/*
  # Ajout du contrôle de cohérence automatique

  1. Fonction de contrôle
    - Compare les temps déclarés dans le bilan avec les heures réelles et le planning
    - Génère des alertes en cas d'incohérence
    - Vérifie la cohérence pour la semaine concernée

  2. Trigger
    - S'exécute après insertion ou mise à jour d'un bilan
    - Calcule les écarts entre temps estimé et temps réel
    - Crée des alertes si écart > 20%

  3. Fonction de verrouillage
    - Verrouille tous les bilans du mois lors de la clôture
    - Appelée automatiquement lors de la finalisation de la clôture mensuelle
*/

-- Fonction pour vérifier la cohérence d'un bilan
CREATE OR REPLACE FUNCTION check_bilan_coherence()
RETURNS TRIGGER AS $$
DECLARE
  total_heures_accueil numeric;
  total_heures_preteuse numeric;
  total_planning_accueil numeric;
  total_planning_preteuse numeric;
  ecart_accueil numeric;
  ecart_preteuse numeric;
  seuil_alerte numeric := 0.20;
BEGIN
  -- Supprimer les anciennes alertes non résolues pour ce bilan
  DELETE FROM alertes_bilans 
  WHERE bilan_id = NEW.id AND resolue = false;

  -- Calculer les heures réelles déclarées pour la période (école d'accueil)
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (heure_fin::time - heure_debut::time)) / 3600
  ), 0)
  INTO total_heures_accueil
  FROM heures
  WHERE salarie_id = NEW.salarie_id
    AND date >= NEW.semaine_debut
    AND date <= NEW.semaine_fin;

  -- Calculer les heures planifiées pour la période (école d'accueil)
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (heure_fin::time - heure_debut::time)) / 3600
  ), 0)
  INTO total_planning_accueil
  FROM planning
  WHERE salarie_id = NEW.salarie_id
    AND date >= NEW.semaine_debut
    AND date <= NEW.semaine_fin
    AND statut = 'valide';

  -- Calculer les écarts
  IF NEW.temps_ecole_accueil > 0 THEN
    ecart_accueil := ABS(total_heures_accueil - NEW.temps_ecole_accueil) / NEW.temps_ecole_accueil;
    
    IF ecart_accueil > seuil_alerte THEN
      INSERT INTO alertes_bilans (bilan_id, type_alerte, message, details)
      VALUES (
        NEW.id,
        'ecart_heures_accueil',
        format('Écart de %.1f%% entre le temps déclaré (%.1fh) et les heures réelles (%.1fh) pour l''école d''accueil',
          ecart_accueil * 100, NEW.temps_ecole_accueil, total_heures_accueil),
        jsonb_build_object(
          'temps_declare', NEW.temps_ecole_accueil,
          'heures_reelles', total_heures_accueil,
          'heures_planifiees', total_planning_accueil,
          'ecart_pourcent', ecart_accueil * 100
        )
      );
    END IF;
  END IF;

  IF NEW.temps_ecole_preteuse > 0 THEN
    -- Pour l'école prêteuse, on peut aussi vérifier la cohérence
    ecart_preteuse := ABS(total_planning_accueil - NEW.temps_ecole_preteuse) / GREATEST(NEW.temps_ecole_preteuse, 1);
    
    IF ecart_preteuse > seuil_alerte AND total_planning_accueil > 0 THEN
      INSERT INTO alertes_bilans (bilan_id, type_alerte, message, details)
      VALUES (
        NEW.id,
        'ecart_planning_preteuse',
        format('Écart de %.1f%% entre le temps déclaré (%.1fh) et le planning validé (%.1fh) pour l''école prêteuse',
          ecart_preteuse * 100, NEW.temps_ecole_preteuse, total_planning_accueil),
        jsonb_build_object(
          'temps_declare', NEW.temps_ecole_preteuse,
          'heures_planifiees', total_planning_accueil,
          'ecart_pourcent', ecart_preteuse * 100
        )
      );
    END IF;
  END IF;

  -- Vérifier si le total hebdomadaire est cohérent (pas plus de 40h par semaine)
  IF (NEW.temps_ecole_accueil + NEW.temps_ecole_preteuse) > 48 THEN
    INSERT INTO alertes_bilans (bilan_id, type_alerte, message, details)
    VALUES (
      NEW.id,
      'depassement_temps_total',
      format('Le temps total déclaré (%.1fh) dépasse les limites raisonnables pour une semaine',
        NEW.temps_ecole_accueil + NEW.temps_ecole_preteuse),
      jsonb_build_object(
        'temps_accueil', NEW.temps_ecole_accueil,
        'temps_preteuse', NEW.temps_ecole_preteuse,
        'temps_total', NEW.temps_ecole_accueil + NEW.temps_ecole_preteuse
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour vérifier la cohérence après insertion ou mise à jour
DROP TRIGGER IF EXISTS trigger_check_bilan_coherence ON bilans_hebdomadaires;
CREATE TRIGGER trigger_check_bilan_coherence
  AFTER INSERT OR UPDATE ON bilans_hebdomadaires
  FOR EACH ROW
  EXECUTE FUNCTION check_bilan_coherence();

-- Fonction pour verrouiller les bilans d'un mois
CREATE OR REPLACE FUNCTION verrouiller_bilans_mois(mois_cloture text)
RETURNS void AS $$
DECLARE
  date_debut date;
  date_fin date;
BEGIN
  -- Calculer le premier et dernier jour du mois
  date_debut := (mois_cloture || '-01')::date;
  date_fin := (date_debut + interval '1 month - 1 day')::date;

  -- Verrouiller tous les bilans du mois
  UPDATE bilans_hebdomadaires
  SET verrouille = true
  WHERE semaine_debut >= date_debut
    AND semaine_debut <= date_fin
    AND verrouille = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour verrouiller automatiquement les bilans lors de la clôture mensuelle
CREATE OR REPLACE FUNCTION auto_verrouiller_bilans_cloture()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la clôture passe au statut "finalisé", verrouiller les bilans du mois
  IF NEW.statut = 'finalise' AND (OLD.statut IS NULL OR OLD.statut != 'finalise') THEN
    PERFORM verrouiller_bilans_mois(NEW.mois);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_verrouiller_bilans ON cloture_mensuelle;
CREATE TRIGGER trigger_auto_verrouiller_bilans
  AFTER UPDATE ON cloture_mensuelle
  FOR EACH ROW
  EXECUTE FUNCTION auto_verrouiller_bilans_cloture();
