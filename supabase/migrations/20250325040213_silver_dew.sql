/*
  # Remove time per pouch column

  1. Changes
    - Remove `time_per_pouch` column from `current_habits` table as it's no longer needed
    - This change simplifies the habits tracking by focusing on duration and time between pouches

  2. Security
    - No changes to RLS policies needed
*/

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'current_habits' 
    AND column_name = 'time_per_pouch'
  ) THEN
    ALTER TABLE current_habits DROP COLUMN time_per_pouch;
  END IF;
END $$;