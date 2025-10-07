/*
  # Create Reservations Table

  ## Overview
  Creates the reservations table for managing customer table bookings.

  ## New Tables

  ### `reservations`
  Stores customer reservation requests
  - `id` (uuid, primary key)
  - `menu_id` (uuid, foreign key) - Reference to menu for tracking
  - `customer_name` (text, not null) - Customer's full name
  - `customer_email` (text) - Customer's email (optional)
  - `customer_phone` (text, not null) - Customer's phone number
  - `party_size` (integer, not null) - Number of people
  - `reservation_date` (date, not null) - Reservation date
  - `reservation_time` (time, not null) - Reservation time
  - `special_requests` (text) - Any special requests or notes
  - `status` (text, default 'pending') - Status: pending, confirmed, cancelled
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Restaurant owners can view/manage reservations for their menus
  - Public can insert reservations (for booking forms)
*/

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text DEFAULT NULL,
  customer_phone text NOT NULL,
  party_size integer NOT NULL DEFAULT 2,
  reservation_date date NOT NULL,
  reservation_time time NOT NULL,
  special_requests text DEFAULT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reservations
CREATE POLICY "Restaurant owners can view their reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = reservations.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can update their reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = reservations.menu_id
      AND menus.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = reservations.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can delete their reservations"
  ON reservations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = reservations.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create reservations"
  ON reservations FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reservations_menu_id ON reservations(menu_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);