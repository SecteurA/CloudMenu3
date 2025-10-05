/*
  # Add Color Palette Fields to Restaurant Profiles

  1. Changes
    - Add `primary_color` field for main brand color (buttons, links, accents)
    - Add `accent_color` field for secondary highlights
    - Add `text_color` field for primary text color
    - Add `background_color` field for main page background
    
  2. Notes
    - All fields are optional (nullable)
    - Default values will be applied in the application
    - Existing `hero_background_color` field remains unchanged
*/

DO $$
BEGIN
  -- Add primary_color if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_profiles' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE restaurant_profiles ADD COLUMN primary_color text DEFAULT '#ea580c';
  END IF;

  -- Add accent_color if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_profiles' AND column_name = 'accent_color'
  ) THEN
    ALTER TABLE restaurant_profiles ADD COLUMN accent_color text DEFAULT '#f97316';
  END IF;

  -- Add text_color if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_profiles' AND column_name = 'text_color'
  ) THEN
    ALTER TABLE restaurant_profiles ADD COLUMN text_color text DEFAULT '#1f2937';
  END IF;

  -- Add background_color if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_profiles' AND column_name = 'background_color'
  ) THEN
    ALTER TABLE restaurant_profiles ADD COLUMN background_color text DEFAULT '#ffffff';
  END IF;
END $$;