/*
  # Add Location and Footer Branding Settings

  1. Changes
    - Add `location` column to `restaurant_profiles` table
      - Stores the map location (Google Maps embed URL or coordinates)
      - Optional field (can be null)
      - Text type to accommodate URLs
    - Add `show_footer_branding` column to `restaurant_profiles` table
      - Controls visibility of CloudMenu branding in footer
      - Boolean type with default true
  
  2. Notes
    - Location field will be used to display an embedded map in the footer
    - Footer branding toggle allows restaurants to hide CloudMenu branding
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE restaurant_profiles ADD COLUMN location text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_profiles' AND column_name = 'show_footer_branding'
  ) THEN
    ALTER TABLE restaurant_profiles ADD COLUMN show_footer_branding boolean DEFAULT true;
  END IF;
END $$;