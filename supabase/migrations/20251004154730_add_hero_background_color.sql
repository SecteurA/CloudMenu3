/*
  # Add Hero Background Color Field

  1. Changes
    - Add `hero_background_color` column to `restaurant_profiles` table
    - Default value is '#f3f4f6' (light gray)
  
  2. Notes
    - This field will store the hex color code for the hero section background
    - Used in the restaurant landing page to customize the hero appearance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_profiles' AND column_name = 'hero_background_color'
  ) THEN
    ALTER TABLE restaurant_profiles ADD COLUMN hero_background_color text DEFAULT '#f3f4f6';
  END IF;
END $$;