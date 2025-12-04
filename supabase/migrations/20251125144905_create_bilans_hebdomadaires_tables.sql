/*
  # Création du module Bilans Hebdomadaires

  1. Nouvelle table `bilans_hebdomadaires`
    - `id` (uuid, primary key)
    - `salarie_id` (uuid, foreign key vers profiles)
    - `semaine_debut` (date) - Premier jour de la semaine
    - `semaine_fin` (date) - Dernier jour de la semaine
    - `contenu_ecole_accueil` (text) - Description des activités école accueil
    - `temps_ecole_accueil` (numeric) - Temps en heures école accueil
    - `contenu_ecole_preteuse` (text) - Description des activités école prêteuse
    - `temps_ecole_preteuse` (numeric) - Temps en heures école prêteuse
    - `commentaire` (text, nullable)
    - `date_declaration` (timestamptz) - Date de soumission
    - `statut_accueil` (text) - Statut validation école accueil
    - `statut_preteuse` (text) - Statut validation école prêteuse
    - `commentaire_accueil` (text, nullable) - Commentaire de l'école accueil
    - `commentaire_preteuse` (text, nullable) - Commentaire de l'école prêteuse
    - `verrouille` (boolean) - Verrouillé à la clôture
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Nouvelle table `alertes_bilans`
    - `id` (uuid, primary key)
    - `bilan_id` (uuid, foreign key vers bilans_hebdomadaires)
    - `type_alerte` (text) - Type d'incohérence détectée
    - `message` (text) - Description de l'alerte
    - `details` (jsonb) - Détails de la comparaison
    - `resolue` (boolean) - Alerte résolue ou non
    - `created_at` (timestamptz)

  3. Sécurité
    - Enable RLS sur les deux tables
    - Policies restrictives pour chaque rôle
*/

-- Création de la table bilans_hebdomadaires
CREATE TABLE IF NOT EXISTS bilans_hebdomadaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salarie_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  semaine_debut date NOT NULL,
  semaine_fin date NOT NULL,
  contenu_ecole_accueil text DEFAULT '',
  temps_ecole_accueil numeric(5,2) DEFAULT 0,
  contenu_ecole_preteuse text DEFAULT '',
  temps_ecole_preteuse numeric(5,2) DEFAULT 0,
  commentaire text,
  date_declaration timestamptz DEFAULT now(),
  statut_accueil text DEFAULT 'en_attente' CHECK (statut_accueil IN ('en_attente', 'valide', 'refuse')),
  statut_preteuse text DEFAULT 'en_attente' CHECK (statut_preteuse IN ('en_attente', 'valide', 'refuse')),
  commentaire_accueil text,
  commentaire_preteuse text,
  verrouille boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(salarie_id, semaine_debut)
);

-- Création de la table alertes_bilans
CREATE TABLE IF NOT EXISTS alertes_bilans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id uuid NOT NULL REFERENCES bilans_hebdomadaires(id) ON DELETE CASCADE,
  type_alerte text NOT NULL,
  message text NOT NULL,
  details jsonb DEFAULT '{}',
  resolue boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_bilans_salarie ON bilans_hebdomadaires(salarie_id);
CREATE INDEX IF NOT EXISTS idx_bilans_semaine ON bilans_hebdomadaires(semaine_debut, semaine_fin);
CREATE INDEX IF NOT EXISTS idx_bilans_verrouille ON bilans_hebdomadaires(verrouille);
CREATE INDEX IF NOT EXISTS idx_alertes_bilan ON alertes_bilans(bilan_id);
CREATE INDEX IF NOT EXISTS idx_alertes_resolue ON alertes_bilans(resolue);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_bilans_hebdomadaires_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bilans_hebdomadaires_updated_at ON bilans_hebdomadaires;
CREATE TRIGGER trigger_update_bilans_hebdomadaires_updated_at
  BEFORE UPDATE ON bilans_hebdomadaires
  FOR EACH ROW
  EXECUTE FUNCTION update_bilans_hebdomadaires_updated_at();

-- Enable RLS
ALTER TABLE bilans_hebdomadaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertes_bilans ENABLE ROW LEVEL SECURITY;
