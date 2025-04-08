/*
  # Add pouches tracking table

  1. New Tables
    - `pouches`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `start_time` (timestamptz)
      - `target_duration` (numeric, minutes)
      - `end_time` (timestamptz, nullable)
      - `actual_duration` (numeric, calculated field in minutes)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `pouches` table
    - Add policies for authenticated users to:
      - Insert their own pouches
      - Update their own pouches
      - Read their own pouches
*/

-- Create pouches table
CREATE TABLE IF NOT EXISTS pouches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  target_duration numeric NOT NULL CHECK (target_duration > 0),
  end_time timestamptz,
  actual_duration numeric GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL 
      THEN EXTRACT(epoch FROM (end_time - start_time)) / 60 
      ELSE NULL 
    END
  ) STORED,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pouches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own pouches"
  ON pouches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pouches"
  ON pouches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own pouches"
  ON pouches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);