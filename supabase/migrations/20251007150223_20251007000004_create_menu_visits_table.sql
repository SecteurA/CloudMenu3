/*
  # Create Menu Visits Table

  ## Overview
  Creates the menu_visits table for tracking analytics on menu views.

  ## New Tables

  ### `menu_visits`
  Stores visitor analytics for menus
  - `id` (uuid, primary key)
  - `menu_id` (uuid, foreign key) - Menu that was visited
  - `visit_type` (text) - Type of visit: 'qr_scan', 'direct_link', 'gmb' (Google My Business)
  - `visited_at` (timestamptz) - When the visit occurred
  - `user_agent` (text) - Browser/device information (optional)
  - `ip_address` (text) - Visitor IP (optional, for analytics)

  ## Security
  - RLS enabled
  - Restaurant owners can view analytics for their menus
  - Public can insert visit records (for tracking)
  - No update/delete permissions (analytics data should be immutable)
*/

-- Create menu_visits table
CREATE TABLE IF NOT EXISTS menu_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  visit_type text DEFAULT 'direct_link',
  visited_at timestamptz DEFAULT now(),
  user_agent text DEFAULT NULL,
  ip_address text DEFAULT NULL
);

-- Enable RLS
ALTER TABLE menu_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menu_visits
CREATE POLICY "Restaurant owners can view their menu visits"
  ON menu_visits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_visits.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert menu visits"
  ON menu_visits FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_visits_menu_id ON menu_visits(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_visits_visit_type ON menu_visits(visit_type);
CREATE INDEX IF NOT EXISTS idx_menu_visits_visited_at ON menu_visits(visited_at);