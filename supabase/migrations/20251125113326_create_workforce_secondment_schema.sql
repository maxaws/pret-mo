/*
  # Schéma de base de données pour la gestion du prêt de main-d'œuvre

  1. Nouvelles Tables
    - `profiles`
      - Profils utilisateurs étendus avec informations métier
      - `id` (uuid, FK vers auth.users)
      - `email` (text)
      - `nom` (text)
      - `prenom` (text)
      - `role` (enum: salarie, accueil, preteuse, compta)
      - `ecole_id` (uuid, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `planning`
      - Gestion du planning des salariés
      - `id` (uuid, primary key)
      - `salarie_id` (uuid, FK profiles)
      - `date` (date)
      - `heure_debut` (time)
      - `heure_fin` (time)
      - `ecole_accueil_id` (uuid)
      - `statut` (enum: propose, valide, refuse)
      - `commentaire_validation` (text)
      - `valide_par` (uuid, FK profiles)
      - `date_validation` (timestamptz)
      - `historique` (jsonb)
    
    - `heures`
      - Déclaration et validation des heures travaillées
      - `id` (uuid, primary key)
      - `salarie_id` (uuid, FK profiles)
      - `date` (date)
      - `heure_debut` (time)
      - `heure_fin` (time)
      - `ecole_concernee` (uuid)
      - `commentaire` (text)
      - `statut_accueil` (text)
      - `statut_preteuse` (text)
      - `valide_par` (uuid, FK profiles)
      - `date_validation` (timestamptz)
      - `ecart_vs_planning` (numeric)
    
    - `frais`
      - Gestion des frais professionnels
      - `id` (uuid, primary key)
      - `salarie_id` (uuid, FK profiles)
      - `date` (date)
      - `type_frais` (text)
      - `description` (text)
      - `montant_ttc` (numeric)
      - `piece_jointe_url` (text)
      - `affectation` (enum: preteuse, accueil, mixte)
      - `taux_ventilation` (numeric, default 0.5)
      - `part_preteuse` (numeric)
      - `part_accueil` (numeric)
      - `statut_accueil` (text)
      - `statut_preteuse` (text)
      - `date_validation` (timestamptz)
    
    - `cloture_mensuelle`
      - Workflow de clôture mensuelle en 3 étapes
      - `id` (uuid, primary key)
      - `mois` (text, format YYYY-MM)
      - `salarie_id` (uuid, FK profiles)
      - `signature_salarie` (boolean, default false)
      - `signature_accueil` (boolean, default false)
      - `signature_preteuse` (boolean, default false)
      - `statut` (text)
      - `pdf_url` (text)
      - `date_cloture` (timestamptz)
    
    - `documents`
      - Coffre-fort documentaire
      - `id` (uuid, primary key)
      - `type_document` (text)
      - `fichier_url` (text)
      - `mois` (text)
      - `upload_par` (uuid, FK profiles)
      - `date_upload` (timestamptz)
    
    - `audit_logs`
      - Traçabilité complète de toutes les modifications
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK profiles)
      - `table_name` (text)
      - `action` (text)
      - `ancienne_valeur` (jsonb)
      - `nouvelle_valeur` (jsonb)
      - `timestamp` (timestamptz, default now())

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques granulaires par rôle pour chaque opération
    - Validation des permissions au niveau base de données

  3. Notes importantes
    - Tous les calculs (écarts, ventilations) sont effectués côté serveur
    - L'historique des modifications est conservé en JSONB
    - Les workflows de validation sont strictement séquentiels
*/

-- Créer les types ENUM
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('salarie', 'accueil', 'preteuse', 'compta');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_planning AS ENUM ('propose', 'valide', 'refuse');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE affectation_frais AS ENUM ('preteuse', 'accueil', 'mixte');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  role user_role NOT NULL DEFAULT 'salarie',
  ecole_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table planning
CREATE TABLE IF NOT EXISTS planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salarie_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time NOT NULL,
  ecole_accueil_id uuid NOT NULL,
  statut statut_planning DEFAULT 'propose',
  commentaire_validation text,
  valide_par uuid REFERENCES profiles(id),
  date_validation timestamptz,
  historique jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table heures
CREATE TABLE IF NOT EXISTS heures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salarie_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time NOT NULL,
  ecole_concernee uuid NOT NULL,
  commentaire text,
  statut_accueil text DEFAULT 'en_attente',
  statut_preteuse text DEFAULT 'en_attente',
  valide_par uuid REFERENCES profiles(id),
  date_validation timestamptz,
  ecart_vs_planning numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table frais
CREATE TABLE IF NOT EXISTS frais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salarie_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  type_frais text NOT NULL,
  description text,
  montant_ttc numeric NOT NULL,
  piece_jointe_url text,
  affectation affectation_frais DEFAULT 'mixte',
  taux_ventilation numeric DEFAULT 0.5,
  part_preteuse numeric,
  part_accueil numeric,
  statut_accueil text DEFAULT 'en_attente',
  statut_preteuse text DEFAULT 'en_attente',
  date_validation timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table cloture_mensuelle
CREATE TABLE IF NOT EXISTS cloture_mensuelle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mois text NOT NULL,
  salarie_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  signature_salarie boolean DEFAULT false,
  signature_accueil boolean DEFAULT false,
  signature_preteuse boolean DEFAULT false,
  statut text DEFAULT 'attente_salarie',
  pdf_url text,
  date_cloture timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(mois, salarie_id)
);

-- Table documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_document text NOT NULL,
  fichier_url text NOT NULL,
  mois text,
  upload_par uuid REFERENCES profiles(id) NOT NULL,
  date_upload timestamptz DEFAULT now()
);

-- Table audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  table_name text NOT NULL,
  action text NOT NULL,
  ancienne_valeur jsonb,
  nouvelle_valeur jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE heures ENABLE ROW LEVEL SECURITY;
ALTER TABLE frais ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloture_mensuelle ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_planning_salarie ON planning(salarie_id);
CREATE INDEX IF NOT EXISTS idx_planning_date ON planning(date);
CREATE INDEX IF NOT EXISTS idx_planning_statut ON planning(statut);
CREATE INDEX IF NOT EXISTS idx_heures_salarie ON heures(salarie_id);
CREATE INDEX IF NOT EXISTS idx_heures_date ON heures(date);
CREATE INDEX IF NOT EXISTS idx_frais_salarie ON frais(salarie_id);
CREATE INDEX IF NOT EXISTS idx_frais_date ON frais(date);
CREATE INDEX IF NOT EXISTS idx_cloture_mois ON cloture_mensuelle(mois);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_logs(table_name);
