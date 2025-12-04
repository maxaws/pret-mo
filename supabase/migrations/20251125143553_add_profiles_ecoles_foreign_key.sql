/*
  # Ajout de la foreign key entre profiles et ecoles

  1. Problème identifié
    - La colonne ecole_id existe dans profiles
    - Mais il manque la contrainte FOREIGN KEY vers ecoles
    - Supabase ne peut pas faire le JOIN automatique sans cette contrainte

  2. Solution
    - Ajouter la contrainte FOREIGN KEY sur profiles.ecole_id -> ecoles.id
*/

-- Ajouter la foreign key manquante
ALTER TABLE profiles
ADD CONSTRAINT profiles_ecole_id_fkey
FOREIGN KEY (ecole_id) REFERENCES ecoles(id) ON DELETE SET NULL;
