/*
  # Add menu description translations

  1. Changes
    - Add `menu_description` column to `menu_languages` table to store translated menu descriptions
  
  2. Notes
    - This allows menus to have descriptions in multiple languages
    - Existing records will have NULL descriptions until translated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_languages' AND column_name = 'menu_description'
  ) THEN
    ALTER TABLE menu_languages ADD COLUMN menu_description text;
  END IF;
END $$;