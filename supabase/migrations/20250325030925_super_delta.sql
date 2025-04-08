/*
  # Update handle_new_user function

  1. Changes
    - Modify handle_new_user function to include name from raw_user_meta_data
    - Keep existing functionality for email

  2. Security
    - Maintain SECURITY DEFINER setting for proper access control
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    (new.raw_user_meta_data->>'name')::text
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;