/*
  # Add onboarding status tracking
  
  1. Changes to Profiles Table
    Add columns to track onboarding completion:
    - `has_completed_goal` (boolean)
    - `has_completed_habits` (boolean)
    
  2. Updates
    - Set default values to false for existing users
    - Add check constraints to ensure values are not null
*/

ALTER TABLE profiles
ADD COLUMN has_completed_goal boolean NOT NULL DEFAULT false,
ADD COLUMN has_completed_habits boolean NOT NULL DEFAULT false;