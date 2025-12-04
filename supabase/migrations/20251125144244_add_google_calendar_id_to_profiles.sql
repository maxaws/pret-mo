/*
  # Ajout du champ Google Calendar ID aux profils

  1. Modifications
    - Ajoute une colonne `google_calendar_id` à la table `profiles`
    - Cette colonne permet aux salariés de lier leur Google Agenda pour synchroniser leur planning
    - Le champ est optionnel (nullable) car tous les utilisateurs n'utiliseront pas forcément cette fonctionnalité
  
  2. Utilisation
    - Les salariés pourront saisir leur ID de calendrier Google dans leurs paramètres
    - Cet ID servira pour l'intégration avec l'API Google Calendar
*/

-- Ajouter la colonne google_calendar_id à la table profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'google_calendar_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN google_calendar_id text;
  END IF;
END $$;
