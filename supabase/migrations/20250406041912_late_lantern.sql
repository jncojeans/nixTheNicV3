/*
  # Add daily summary tracking
  
  1. New Tables
    - `daily_summary`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `number_of_pouches` (integer)
      - `duration_per_pouch` (numeric)
      - `time_between_pouches` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - `create_daily_summary`: Creates summary for a user on a specific date
    - `update_daily_summary`: Updates summary statistics when pouches are modified
    - `create_daily_summaries_for_timezone`: Creates new summaries at midnight in user's timezone

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create daily summary table
CREATE TABLE daily_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  number_of_pouches integer NOT NULL DEFAULT 0,
  duration_per_pouch numeric,
  time_between_pouches numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique user/date combinations
  UNIQUE (user_id, date)
);

-- Enable RLS
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own summaries"
  ON daily_summary
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create daily summary
CREATE OR REPLACE FUNCTION create_daily_summary(
  p_user_id uuid,
  p_date date
)
RETURNS void AS $$
BEGIN
  -- Create summary if it doesn't exist
  INSERT INTO daily_summary (user_id, date)
  VALUES (p_user_id, p_date)
  ON CONFLICT (user_id, date) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily summary
CREATE OR REPLACE FUNCTION update_daily_summary(
  p_user_id uuid,
  p_date date
)
RETURNS void AS $$
DECLARE
  v_number_of_pouches integer;
  v_avg_duration numeric;
  v_avg_time_between numeric;
  v_total_time_between numeric := 0;
  v_time_between_count integer := 0;
  r_pouch record;
BEGIN
  -- Ensure summary exists
  PERFORM create_daily_summary(p_user_id, p_date);

  -- Calculate number of pouches and average duration
  WITH pouch_stats AS (
    SELECT
      COUNT(*) as pouch_count,
      AVG(
        EXTRACT(epoch FROM (end_time - start_time - COALESCE(total_pause_duration, '0 seconds'::interval))) / 60
      ) as avg_duration
    FROM pouches
    WHERE user_id = p_user_id
      AND date_trunc('day', start_time AT TIME ZONE (
        SELECT timezone FROM profiles WHERE id = p_user_id
      ))::date = p_date
      AND end_time IS NOT NULL
  )
  SELECT
    pouch_count,
    avg_duration
  INTO
    v_number_of_pouches,
    v_avg_duration
  FROM pouch_stats;

  -- Calculate average time between pouches
  FOR r_pouch IN (
    SELECT
      end_time,
      LEAD(start_time) OVER (ORDER BY start_time) as next_start
    FROM pouches
    WHERE user_id = p_user_id
      AND date_trunc('day', start_time AT TIME ZONE (
        SELECT timezone FROM profiles WHERE id = p_user_id
      ))::date = p_date
      AND end_time IS NOT NULL
    ORDER BY start_time
  ) LOOP
    IF r_pouch.next_start IS NOT NULL THEN
      v_total_time_between := v_total_time_between + 
        EXTRACT(epoch FROM (r_pouch.next_start - r_pouch.end_time)) / 60;
      v_time_between_count := v_time_between_count + 1;
    END IF;
  END LOOP;

  -- Calculate average time between pouches
  IF v_time_between_count > 0 THEN
    v_avg_time_between := v_total_time_between / v_time_between_count;
  END IF;

  -- Update summary
  UPDATE daily_summary
  SET
    number_of_pouches = COALESCE(v_number_of_pouches, 0),
    duration_per_pouch = v_avg_duration,
    time_between_pouches = v_avg_time_between,
    updated_at = now()
  WHERE user_id = p_user_id
    AND date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update summary when pouches change
CREATE OR REPLACE FUNCTION update_summary_on_pouch_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_timezone text;
  v_date date;
BEGIN
  -- Get user's timezone
  SELECT timezone INTO v_user_timezone
  FROM profiles
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- Get date in user's timezone
  v_date := date_trunc('day', COALESCE(NEW.start_time, OLD.start_time) AT TIME ZONE v_user_timezone)::date;

  -- Update summary
  PERFORM update_daily_summary(COALESCE(NEW.user_id, OLD.user_id), v_date);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for pouch changes
CREATE TRIGGER update_summary_on_pouch_insert
  AFTER INSERT ON pouches
  FOR EACH ROW
  EXECUTE FUNCTION update_summary_on_pouch_change();

CREATE TRIGGER update_summary_on_pouch_update
  AFTER UPDATE ON pouches
  FOR EACH ROW
  EXECUTE FUNCTION update_summary_on_pouch_change();

-- Function to create summaries for all users at midnight in their timezone
CREATE OR REPLACE FUNCTION create_daily_summaries_for_timezone(p_timezone text)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_date date;
BEGIN
  -- Get current date in specified timezone
  v_date := (now() AT TIME ZONE p_timezone)::date;

  -- Create summaries for all users in this timezone
  FOR v_user_id IN
    SELECT id FROM profiles WHERE timezone = p_timezone
  LOOP
    PERFORM create_daily_summary(v_user_id, v_date);
  END LOOP;
END;
$$ LANGUAGE plpgsql;