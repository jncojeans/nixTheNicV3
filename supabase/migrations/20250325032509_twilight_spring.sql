/*
  # Create user goals table

  1. New Tables
    - `user_goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `goal_type` (text, either 'quit' or 'control')
      - `target_date` (date, when they want to achieve their goal)
      - `pouches_per_day` (numeric, nullable, only for 'control' goal type)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their own goals
*/

CREATE TABLE user_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_type text NOT NULL CHECK (goal_type IN ('quit', 'control')),
  target_date date NOT NULL,
  pouches_per_day numeric CHECK (pouches_per_day > 0),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_pouches_per_day CHECK (
    (goal_type = 'control' AND pouches_per_day IS NOT NULL) OR
    (goal_type = 'quit' AND pouches_per_day IS NULL)
  )
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own goals"
  ON user_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own goals"
  ON user_goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON user_goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);