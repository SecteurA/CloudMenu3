/*
  # Add menu order field

  1. Changes
    - Add `ordre` column to `menus` table for custom ordering
    - Default value of 0 for existing menus
    - Update existing menus to have sequential order based on creation date

  2. Notes
    - Allows users to reorder menus via drag-and-drop
    - Order is reflected on the landing page
*/

-- Add ordre column to menus table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menus' AND column_name = 'ordre'
  ) THEN
    ALTER TABLE menus ADD COLUMN ordre integer DEFAULT 0;
  END IF;
END $$;

-- Set initial order for existing menus based on created_at
UPDATE menus
SET ordre = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1 as row_num
  FROM menus
) AS subquery
WHERE menus.id = subquery.id;