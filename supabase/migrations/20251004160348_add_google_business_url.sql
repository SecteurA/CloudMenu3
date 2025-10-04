/*
  # Add Google My Business URL to Restaurant Profiles

  1. Changes
    - Add `google_business_url` column to `restaurant_profiles` table
      - Stores the Google My Business profile link
      - Optional field (can be null)
      - Text type to accommodate URLs of any length
  
  2. Notes
    - This allows restaurant owners to link their Google Business profile
    - The link will be used to display ratings and allow customers to leave reviews
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_profiles' AND column_name = 'google_business_url'
  ) THEN
    ALTER TABLE restaurant_profiles ADD COLUMN google_business_url text DEFAULT '';
  END IF;
END $$;