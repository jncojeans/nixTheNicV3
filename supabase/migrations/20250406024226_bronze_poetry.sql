/*
  # Add Weaning Plan Tables

  1. New Tables
    - `weaning_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `start_date` (date)
      - `quit_date` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `weaning_schedule_days`
      - `id` (uuid, primary key)
      - `weaning_plan_id` (uuid, references weaning_plans)
      - `day_number` (integer)
      - `date` (date)
      - `pouches_allowed` (integer)
      - `duration_per_pouch` (integer)
      - `time_between_pouches` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to:
      - Create and read their own weaning plans
      - Create and read their own schedule days
      - Update their own plans and schedules

  3. Constraints
    - Ensure start_date is before quit_date
    - Ensure positive values for pouches and durations
    - Ensure unique day numbers per plan
*/

-- Create weaning_plans table
CREATE TABLE weaning_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  quit_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure start_date is before quit_date
  CONSTRAINT valid_date_range CHECK (start_date < quit_date)
);

-- Create weaning_schedule_days table
CREATE TABLE weaning_schedule_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weaning_plan_id uuid NOT NULL REFERENCES weaning_plans(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number > 0),
  date date NOT NULL,
  pouches_allowed integer NOT NULL CHECK (pouches_allowed >= 0),
  duration_per_pouch integer NOT NULL CHECK (duration_per_pouch > 0),
  time_between_pouches integer NOT NULL CHECK (time_between_pouches > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique day numbers per plan
  UNIQUE (weaning_plan_id, day_number),
  -- Ensure unique dates per plan
  UNIQUE (weaning_plan_id, date)
);

-- Enable RLS
ALTER TABLE weaning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weaning_schedule_days ENABLE ROW LEVEL SECURITY;

-- Policies for weaning_plans
CREATE POLICY "Users can create their own weaning plans"
  ON weaning_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own weaning plans"
  ON weaning_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own weaning plans"
  ON weaning_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for weaning_schedule_days
CREATE POLICY "Users can create schedule days for their plans"
  ON weaning_schedule_days
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weaning_plans
      WHERE id = weaning_plan_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view schedule days for their plans"
  ON weaning_schedule_days
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weaning_plans
      WHERE id = weaning_plan_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update schedule days for their plans"
  ON weaning_schedule_days
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weaning_plans
      WHERE id = weaning_plan_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weaning_plans
      WHERE id = weaning_plan_id
      AND user_id = auth.uid()
    )
  );

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_weaning_plans_updated_at
  BEFORE UPDATE ON weaning_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weaning_schedule_days_updated_at
  BEFORE UPDATE ON weaning_schedule_days
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();