/*
  # Add timezone to profiles table
  
  1. Changes
    - Add timezone column to profiles table
    - Set default timezone for existing users
    - Add check constraint for valid timezone

  2. Security
    - No changes to RLS policies needed
*/

-- Add timezone column with Mountain Time as default
ALTER TABLE profiles
ADD COLUMN timezone text NOT NULL DEFAULT 'America/Denver';

-- Create function to validate timezone
CREATE OR REPLACE FUNCTION is_valid_timezone(tz text)
RETURNS boolean AS $$
BEGIN
  RETURN tz IN (SELECT name FROM pg_timezone_names());
END;
$$ LANGUAGE plpgsql;

-- Add check constraint for valid timezone
ALTER TABLE profiles
ADD CONSTRAINT valid_timezone CHECK (is_valid_timezone(timezone));