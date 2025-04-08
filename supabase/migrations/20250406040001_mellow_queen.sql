/*
  # Update weaning schedule generation to start from current date
  
  1. Changes
    - Modify generate_weaning_schedule function to use current date as start date
    - Update trigger function to use current date instead of habits date
    - Ensure proper date handling across timezones
*/

-- Update the generate_weaning_schedule function to use current date
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
  v_user_timezone text;
  
  -- Constants for target values
  v_target_pouches constant integer := 0;
  v_target_duration constant integer := 5; -- 5 minutes minimum
  v_target_time_between constant integer := 240; -- 4 hours maximum
BEGIN
  -- Get user's timezone
  SELECT timezone INTO v_user_timezone
  FROM profiles
  WHERE id = p_user_id;

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

-- Update the trigger function to use current date
CREATE OR REPLACE FUNCTION generate_weaning_plan_on_first_habits()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_plan_count integer;
  v_quit_date date;
  v_current_date date;
  v_user_timezone text;
BEGIN
  -- Check if this is the first habits entry for the user
  SELECT COUNT(*)
  INTO v_existing_plan_count
  FROM weaning_plans
  WHERE user_id = NEW.user_id;
  
  IF v_existing_plan_count = 0 THEN
    -- Get user's timezone
    SELECT timezone INTO v_user_timezone
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get current date in user's timezone
    v_current_date := (now() AT TIME ZONE v_user_timezone)::date;
    
    -- Get quit date from user_goals
    SELECT target_date
    INTO v_quit_date
    FROM user_goals
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_quit_date IS NOT NULL THEN
      -- Generate weaning schedule starting from current date
      PERFORM generate_weaning_schedule(
        NEW.user_id,
        v_current_date,
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