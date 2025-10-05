/*
  # Add Menu Title Translations

  ## Overview
  This migration adds support for translating menu titles for each language.

  ## Changes
  1. Add `menu_title` column to `menu_languages` table
     - Stores the translated title for each language
     - NOT NULL with a default empty string
  
  ## Important Notes
  - Each language can have its own menu title
  - The default language uses the menu's `nom` field
  - Translations are managed through the settings UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_languages' AND column_name = 'menu_title'
  ) THEN
    ALTER TABLE menu_languages ADD COLUMN menu_title text NOT NULL DEFAULT '';
  END IF;
END $$;