/*
  # Add stage column to weaning_schedule_days

  1. Changes
    - Add `stage` column to `weaning_schedule_days` table
    - Default value of 1 for existing rows
    - Create function to calculate stage from day_number
    - Update existing rows with correct stage values

  2. Formula
    stage = floor((day_number - 1) / 7) + 1
    
    Examples:
    - Day 1-7: Stage 1
    - Day 8-14: Stage 2
    - Day 15-21: Stage 3
*/

-- Add stage column with default value
ALTER TABLE weaning_schedule_days
ADD COLUMN stage integer NOT NULL DEFAULT 1;

-- Create function to calculate stage from day_number
CREATE OR REPLACE FUNCTION calculate_stage(day_number integer)
RETURNS integer AS $$
BEGIN
  RETURN floor((day_number - 1) / 7) + 1;
END;
$$ LANGUAGE plpgsql;

-- Update existing rows with correct stage values
DO $$
BEGIN
  UPDATE weaning_schedule_days
  SET stage = calculate_stage(day_number);
END $$;