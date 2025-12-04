/*
  # Correction du trigger de cohérence - format()

  1. Modifications
    - Corrige l'utilisation de la fonction format() dans le trigger check_bilan_coherence
    - Remplace les format strings incorrects par des concaténations simples
  
  2. Notes
    - Le problème était l'utilisation de spécificateurs de format invalides
    - Utilisation de la concaténation de chaînes à la place
*/

-- Recréer la fonction avec la syntaxe corrigée
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
        'Écart de ' || ROUND(ecart_accueil * 100, 1)::text || '% entre le temps déclaré (' || 
        ROUND(NEW.temps_ecole_accueil, 1)::text || 'h) et les heures réelles (' || 
        ROUND(total_heures_accueil, 1)::text || 'h) pour l''école d''accueil',
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
        'Écart de ' || ROUND(ecart_preteuse * 100, 1)::text || '% entre le temps déclaré (' || 
        ROUND(NEW.temps_ecole_preteuse, 1)::text || 'h) et le planning validé (' || 
        ROUND(total_planning_accueil, 1)::text || 'h) pour l''école prêteuse',
        jsonb_build_object(
          'temps_declare', NEW.temps_ecole_preteuse,
          'heures_planifiees', total_planning_accueil,
          'ecart_pourcent', ecart_preteuse * 100
        )
      );
    END IF;
  END IF;

  -- Vérifier si le total hebdomadaire est cohérent (pas plus de 48h par semaine)
  IF (NEW.temps_ecole_accueil + NEW.temps_ecole_preteuse) > 48 THEN
    INSERT INTO alertes_bilans (bilan_id, type_alerte, message, details)
    VALUES (
      NEW.id,
      'depassement_temps_total',
      'Le temps total déclaré (' || ROUND(NEW.temps_ecole_accueil + NEW.temps_ecole_preteuse, 1)::text || 
      'h) dépasse les limites raisonnables pour une semaine',
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
