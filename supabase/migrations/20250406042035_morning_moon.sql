/*
  # Update daily_summary RLS policies

  1. Changes
    - Add policy for authenticated users to insert into daily_summary
    - Add policy for authenticated users to update their own daily_summary entries
    - These policies are needed because the pouch operations trigger updates to daily_summary

  2. Security
    - Maintains existing SELECT policy
    - Adds INSERT and UPDATE policies with proper user checks
    - Ensures users can only modify their own data
*/

-- Add policy for inserting daily summaries
CREATE POLICY "Users can insert their own daily summaries"
  ON daily_summary
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add policy for updating daily summaries
CREATE POLICY "Users can update their own daily summaries"
  ON daily_summary
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);