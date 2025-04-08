/*
  # Add preferred methods table and update profiles

  1. New Tables
    - `user_preferred_methods`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `reduce_time_per_pouch` (boolean)
      - `increase_time_between` (boolean)
      - `start_later` (boolean)
      - `stop_earlier` (boolean)
      - `no_preference` (boolean)
      - `created_at` (timestamp)

  2. Changes
    - Add `has_completed_preferences` to profiles table

  3. Security
    - Enable RLS on new table
    - Add policies for authenticated users
*/

-- Add new column to profiles
ALTER TABLE profiles ADD COLUMN has_completed_preferences boolean DEFAULT false NOT NULL;

-- Create preferred methods table
CREATE TABLE IF NOT EXISTS user_preferred_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reduce_time_per_pouch boolean DEFAULT false NOT NULL,
  increase_time_between boolean DEFAULT false NOT NULL,
  start_later boolean DEFAULT false NOT NULL,
  stop_earlier boolean DEFAULT false NOT NULL,
  no_preference boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure at least one preference is selected
  CONSTRAINT one_preference_selected CHECK (
    reduce_time_per_pouch = true OR
    increase_time_between = true OR
    start_later = true OR
    stop_earlier = true OR
    no_preference = true
  ),
  
  -- If no_preference is true, others must be false
  CONSTRAINT no_preference_exclusive CHECK (
    (no_preference = false) OR
    (
      reduce_time_per_pouch = false AND
      increase_time_between = false AND
      start_later = false AND
      stop_earlier = false
    )
  )
);

-- Enable RLS
ALTER TABLE user_preferred_methods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own preferences"
  ON user_preferred_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own preferences"
  ON user_preferred_methods
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferred_methods
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);