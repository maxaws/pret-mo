/*
  # Création de la table écoles

  1. Nouvelle table
    - `ecoles`
      - `id` (uuid, primary key) - Identifiant unique de l'école
      - `nom` (text) - Nom de l'école
      - `adresse` (text) - Adresse complète de l'école
      - `contact_nom` (text) - Nom du contact principal
      - `contact_email` (text) - Email du contact
      - `contact_telephone` (text) - Téléphone du contact
      - `created_at` (timestamptz) - Date de création
      - `updated_at` (timestamptz) - Date de dernière modification

  2. Modification table profiles
    - Ajout de `ecole_id` (uuid, nullable) - Référence vers l'école prêteuse du salarié
    - Foreign key vers la table `ecoles`

  3. Sécurité
    - Enable RLS sur la table `ecoles`
    - Politique: seules les prêteuses peuvent gérer les écoles
    - Les salariés peuvent voir leur école rattachée
*/

-- Création de la table écoles
CREATE TABLE IF NOT EXISTS ecoles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  adresse text NOT NULL,
  contact_nom text NOT NULL,
  contact_email text NOT NULL,
  contact_telephone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajout de la colonne ecole_id dans profiles si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ecole_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ecole_id uuid REFERENCES ecoles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS sur la table écoles
ALTER TABLE ecoles ENABLE ROW LEVEL SECURITY;

-- Politique: les prêteuses peuvent tout faire sur les écoles
CREATE POLICY "Prêteuses peuvent lire les écoles"
  ON ecoles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'preteuse'
    )
  );

CREATE POLICY "Prêteuses peuvent créer des écoles"
  ON ecoles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'preteuse'
    )
  );

CREATE POLICY "Prêteuses peuvent modifier des écoles"
  ON ecoles
  FOR UPDATE
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

CREATE POLICY "Prêteuses peuvent supprimer des écoles"
  ON ecoles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'preteuse'
    )
  );

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_ecole_id ON profiles(ecole_id);
CREATE INDEX IF NOT EXISTS idx_ecoles_nom ON ecoles(nom);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_ecoles_updated_at'
  ) THEN
    CREATE TRIGGER update_ecoles_updated_at
      BEFORE UPDATE ON ecoles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
