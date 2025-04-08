/*
  # Add pouch tracking columns and functions

  1. New Columns
    - `is_active` (boolean): Tracks if the pouch timer is currently active
    - `paused_at` (timestamptz): Records when the timer was paused
    - `total_pause_duration` (interval): Tracks total time spent paused

  2. Functions
    - `update_pouch_duration`: Function to update pouch duration and status
    - `auto_complete_pouches`: Function to automatically complete expired pouches

  3. Trigger
    - Automatically updates pouches when they exceed their duration
*/

-- Add new columns for tracking
ALTER TABLE pouches 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS paused_at timestamptz,
ADD COLUMN IF NOT EXISTS total_pause_duration interval DEFAULT '0 seconds'::interval;

-- Drop the existing actual_duration generated column
ALTER TABLE pouches DROP COLUMN IF EXISTS actual_duration;

-- Add new actual_duration column (not generated)
ALTER TABLE pouches
ADD COLUMN actual_duration numeric;

-- Create function to update pouch duration
CREATE OR REPLACE FUNCTION update_pouch_duration(pouch_id uuid)
RETURNS void AS $$
DECLARE
    p_start_time timestamptz;
    p_end_time timestamptz;
    p_total_pause interval;
BEGIN
    SELECT 
        start_time,
        end_time,
        COALESCE(total_pause_duration, '0 seconds'::interval)
    INTO
        p_start_time,
        p_end_time,
        p_total_pause
    FROM pouches
    WHERE id = pouch_id;

    IF p_end_time IS NOT NULL THEN
        UPDATE pouches
        SET actual_duration = EXTRACT(epoch FROM (p_end_time - p_start_time - p_total_pause)) / 60
        WHERE id = pouch_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update duration when pouch is modified
CREATE OR REPLACE FUNCTION update_pouch_duration_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND 
       (OLD.end_time IS NULL OR OLD.end_time != NEW.end_time OR OLD.total_pause_duration != NEW.total_pause_duration)
    THEN
        PERFORM update_pouch_duration(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pouch_duration_update
    AFTER UPDATE ON pouches
    FOR EACH ROW
    EXECUTE FUNCTION update_pouch_duration_trigger();

-- Create function to complete expired pouches
CREATE OR REPLACE FUNCTION complete_expired_pouches()
RETURNS void AS $$
BEGIN
    UPDATE pouches
    SET 
        end_time = CASE 
            WHEN paused_at IS NOT NULL THEN paused_at
            ELSE now()
        END,
        is_active = false
    WHERE 
        is_active = true 
        AND end_time IS NULL
        AND EXTRACT(epoch FROM (
            CASE 
                WHEN paused_at IS NOT NULL THEN paused_at
                ELSE now()
            END 
            - start_time - COALESCE(total_pause_duration, '0 seconds'::interval)
        )) / 60 >= target_duration;
END;
$$ LANGUAGE plpgsql;

-- Create a function that can be called periodically to update pouches
CREATE OR REPLACE FUNCTION check_and_complete_pouches()
RETURNS void AS $$
BEGIN
    PERFORM complete_expired_pouches();
END;
$$ LANGUAGE plpgsql;