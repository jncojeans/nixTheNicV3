/*
  # Create current habits table
  
  1. New Tables
    - `current_habits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `pouch_mgs` (numeric)
      - `first_pouch_time` (time)
      - `pouches_per_day` (numeric)
      - `duration_per_pouch` (numeric)
      - `time_per_pouch` (numeric)
      - `time_between_pouches` (numeric)
      - `last_pouch_time` (time)
      - `created_at` (timestamptz, default now())
      - `date` (date, default current_date)

  2. Security
    - Enable RLS on `current_habits` table
    - Add policies for authenticated users to:
      - Insert their own habits
      - Read their own habits
*/

CREATE TABLE IF NOT EXISTS current_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pouch_mgs numeric NOT NULL CHECK (pouch_mgs > 0),
  first_pouch_time time NOT NULL,
  pouches_per_day numeric NOT NULL CHECK (pouches_per_day > 0),
  duration_per_pouch numeric NOT NULL CHECK (duration_per_pouch > 0),
  time_per_pouch numeric NOT NULL CHECK (time_per_pouch > 0),
  time_between_pouches numeric NOT NULL CHECK (time_between_pouches > 0),
  last_pouch_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  date date DEFAULT CURRENT_DATE,
  
  CONSTRAINT valid_pouch_times CHECK (first_pouch_time < last_pouch_time)
);

ALTER TABLE current_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own habits"
  ON current_habits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own habits"
  ON current_habits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);