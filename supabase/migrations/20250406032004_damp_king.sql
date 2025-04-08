/*
  # Add weaning plan generation trigger

  1. New Functions
    - `generate_weaning_schedule`: Creates a weaning plan and schedule days
    - `calculate_daily_value`: Helper function for linear interpolation
    - Trigger function to run on first habits entry

  2. Changes
    - Add trigger on current_habits table
    - Add helper functions for calculations
    - Implement automatic schedule generation

  3. Notes
    - Only generates plan on first habits entry
    - Uses linear reduction for all values
    - Rounds values appropriately
*/

-- Helper function to calculate daily value changes
CREATE OR REPLACE FUNCTION calculate_daily_value(
  start_value numeric,
  end_value numeric,
  total_days integer,
  current_day integer,
  round_to integer DEFAULT 0
)
RETURNS numeric AS $$
BEGIN
  -- Linear interpolation: start_value + (end_value - start_value) * (current_day / (total_days - 1))
  RETURN ROUND(
    start_value + (end_value - start_value) * (current_day::numeric / (total_days - 1)::numeric),
    round_to
  );
END;
$$ LANGUAGE plpgsql;

-- Main function to generate weaning schedule
CREATE OR REPLACE FUNCTION generate_weaning_schedule(
  p_user_id uuid,
  p_start_date date,
  p_quit_date date,
  p_initial_pouches numeric,
  p_initial_duration numeric,
  p_initial_time_between numeric
)
RETURNS uuid AS $$
DECLARE
  v_plan_id uuid;
  v_total_days integer;
  v_current_day integer;
  v_current_date date;
  v_pouches integer;
  v_duration integer;
  v_time_between integer;
  
  -- Constants for target values
  v_target_pouches constant integer := 0;
  v_target_duration constant integer := 5; -- 5 minutes minimum
  v_target_time_between constant integer := 240; -- 4 hours maximum
BEGIN
  -- Calculate total days
  v_total_days := p_quit_date - p_start_date + 1;
  
  -- Create weaning plan
  INSERT INTO weaning_plans (user_id, start_date, quit_date)
  VALUES (p_user_id, p_start_date, p_quit_date)
  RETURNING id INTO v_plan_id;
  
  -- Generate schedule for each day
  FOR v_current_day IN 1..v_total_days LOOP
    v_current_date := p_start_date + (v_current_day - 1);
    
    -- Calculate values for current day
    v_pouches := calculate_daily_value(
      p_initial_pouches,
      v_target_pouches::numeric,
      v_total_days,
      v_current_day - 1
    )::integer;
    
    v_duration := calculate_daily_value(
      p_initial_duration,
      v_target_duration::numeric,
      v_total_days,
      v_current_day - 1
    )::integer;
    
    v_time_between := calculate_daily_value(
      p_initial_time_between,
      v_target_time_between::numeric,
      v_total_days,
      v_current_day - 1
    )::integer;
    
    -- Insert schedule day
    INSERT INTO weaning_schedule_days (
      weaning_plan_id,
      day_number,
      date,
      pouches_allowed,
      duration_per_pouch,
      time_between_pouches,
      stage
    )
    VALUES (
      v_plan_id,
      v_current_day,
      v_current_date,
      v_pouches,
      GREATEST(v_duration, v_target_duration), -- Ensure we don't go below minimum
      LEAST(v_time_between, v_target_time_between), -- Ensure we don't exceed maximum
      calculate_stage(v_current_day)
    );
  END LOOP;
  
  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to generate weaning plan on first habits entry
CREATE OR REPLACE FUNCTION generate_weaning_plan_on_first_habits()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_plan_count integer;
  v_quit_date date;
BEGIN
  -- Check if this is the first habits entry for the user
  SELECT COUNT(*)
  INTO v_existing_plan_count
  FROM weaning_plans
  WHERE user_id = NEW.user_id;
  
  IF v_existing_plan_count = 0 THEN
    -- Get quit date from user_goals
    SELECT target_date
    INTO v_quit_date
    FROM user_goals
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_quit_date IS NOT NULL THEN
      -- Generate weaning schedule
      PERFORM generate_weaning_schedule(
        NEW.user_id,
        NEW.date,
        v_quit_date,
        NEW.pouches_per_day,
        NEW.duration_per_pouch,
        NEW.time_between_pouches
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on current_habits table
CREATE TRIGGER generate_weaning_plan_trigger
  AFTER INSERT ON current_habits
  FOR EACH ROW
  EXECUTE FUNCTION generate_weaning_plan_on_first_habits();