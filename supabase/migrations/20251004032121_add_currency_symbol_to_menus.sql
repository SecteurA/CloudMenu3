/*
  # Add currency symbol to menus

  1. Changes
    - Add `currency_symbol` column to `menus` table
      - Type: text
      - Default: '€'
      - Not nullable
    
  2. Notes
    - Allows users to customize the currency symbol displayed on their menu
    - Default is Euro symbol (€)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menus' AND column_name = 'currency_symbol'
  ) THEN
    ALTER TABLE menus ADD COLUMN currency_symbol text NOT NULL DEFAULT '€';
  END IF;
END $$;