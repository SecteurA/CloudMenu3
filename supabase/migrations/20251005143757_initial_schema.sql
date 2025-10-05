/*
  # Initial CloudMenu Database Schema

  ## Overview
  This migration creates the complete initial database schema for CloudMenu,
  a digital menu management platform for restaurants.

  ## New Tables

  ### `restaurant_profiles`
  Stores restaurant information and branding
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users) - Owner of the restaurant
  - `restaurant_name` (text, not null) - Name of the restaurant
  - `slug` (text, unique, not null) - URL-friendly identifier for the restaurant
  - `description` (text) - Restaurant description
  - `banner_url` (text) - URL to banner image
  - `logo_url` (text) - URL to logo image
  - `telephone` (text) - Contact phone number
  - `whatsapp` (text) - WhatsApp number
  - `instagram` (text) - Instagram URL
  - `facebook` (text) - Facebook URL
  - `tiktok` (text) - TikTok URL
  - `address` (text) - Physical address
  - `hours` (text) - Operating hours
  - `google_business_url` (text) - Google Business profile URL
  - `location_lat` (decimal) - Latitude for map
  - `location_lng` (decimal) - Longitude for map
  - `footer_branding_text` (text) - Custom footer text
  - `hero_background_color` (text) - Hero section background color
  - `primary_color` (text) - Primary brand color
  - `secondary_color` (text) - Secondary brand color
  - `accent_color` (text) - Accent color
  - `text_color` (text) - Main text color
  - `background_color` (text) - Background color
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `menus`
  Stores menu information for restaurants
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users) - Owner of the menu
  - `titre` (text, not null) - Menu title
  - `description` (text) - Menu description
  - `actif` (boolean, default true) - Whether menu is active
  - `status` (text, default 'draft') - Menu status: draft, published
  - `currency_symbol` (text, default '€') - Currency symbol for prices
  - `display_order` (integer) - Order for displaying menus
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `categories`
  Stores menu categories (e.g., Appetizers, Main Courses)
  - `id` (uuid, primary key)
  - `menu_id` (uuid, foreign key to menus) - Parent menu
  - `nom` (text, not null) - Category name
  - `description` (text) - Category description
  - `ordre` (integer) - Display order
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `menu_items`
  Stores individual menu items
  - `id` (uuid, primary key)
  - `category_id` (uuid, foreign key to categories) - Parent category
  - `nom` (text, not null) - Item name
  - `description` (text) - Item description
  - `prix` (decimal) - Item price
  - `image_url` (text) - URL to item image
  - `allergenes` (text[]) - List of allergens
  - `vegetarien` (boolean, default false) - Is vegetarian
  - `vegan` (boolean, default false) - Is vegan
  - `sans_gluten` (boolean, default false) - Is gluten-free
  - `epice` (boolean, default false) - Is spicy
  - `ordre` (integer) - Display order
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Authenticated users can manage their own restaurants, menus, categories, and items
  - Public users can view published menus and active restaurants
  - Service role has full access for admin operations

  ## Important Notes
  - One user can have one restaurant profile
  - Each restaurant can have multiple menus
  - Each menu can have multiple categories
  - Each category can have multiple items
  - Cascade deletes ensure data integrity
*/

-- Create restaurant_profiles table
CREATE TABLE IF NOT EXISTS restaurant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  banner_url text DEFAULT '',
  logo_url text DEFAULT '',
  telephone text DEFAULT '',
  whatsapp text DEFAULT '',
  instagram text DEFAULT '',
  facebook text DEFAULT '',
  tiktok text DEFAULT '',
  address text DEFAULT '',
  hours text DEFAULT '',
  google_business_url text DEFAULT '',
  location_lat decimal DEFAULT NULL,
  location_lng decimal DEFAULT NULL,
  footer_branding_text text DEFAULT '',
  hero_background_color text DEFAULT '#ffffff',
  primary_color text DEFAULT '#ea580c',
  secondary_color text DEFAULT '#0284c7',
  accent_color text DEFAULT '#84cc16',
  text_color text DEFAULT '#1f2937',
  background_color text DEFAULT '#ffffff',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create menus table
CREATE TABLE IF NOT EXISTS menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre text NOT NULL,
  description text DEFAULT '',
  actif boolean DEFAULT true,
  status text DEFAULT 'draft',
  currency_symbol text DEFAULT '€',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text DEFAULT '',
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text DEFAULT '',
  prix decimal DEFAULT 0,
  image_url text DEFAULT '',
  allergenes text[] DEFAULT '{}',
  vegetarien boolean DEFAULT false,
  vegan boolean DEFAULT false,
  sans_gluten boolean DEFAULT false,
  epice boolean DEFAULT false,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE restaurant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurant_profiles
CREATE POLICY "Users can view their own restaurant profile"
  ON restaurant_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own restaurant profile"
  ON restaurant_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own restaurant profile"
  ON restaurant_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own restaurant profile"
  ON restaurant_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view restaurant profiles by slug"
  ON restaurant_profiles FOR SELECT
  TO public
  USING (true);

-- RLS Policies for menus
CREATE POLICY "Users can view their own menus"
  ON menus FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own menus"
  ON menus FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own menus"
  ON menus FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menus"
  ON menus FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view published active menus"
  ON menus FOR SELECT
  TO public
  USING (status = 'published' AND actif = true);

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = categories.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert categories for their menus"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = categories.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = categories.menu_id
      AND menus.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = categories.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = categories.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view categories for published menus"
  ON categories FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = categories.menu_id
      AND menus.status = 'published'
      AND menus.actif = true
    )
  );

-- RLS Policies for menu_items
CREATE POLICY "Users can view their own menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = menu_items.category_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert menu items for their categories"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = menu_items.category_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = menu_items.category_id
      AND menus.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = menu_items.category_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = menu_items.category_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view items for published menus"
  ON menu_items FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = menu_items.category_id
      AND menus.status = 'published'
      AND menus.actif = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_profiles_user_id ON restaurant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_profiles_slug ON restaurant_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_menus_user_id ON menus(user_id);
CREATE INDEX IF NOT EXISTS idx_menus_status ON menus(status);
CREATE INDEX IF NOT EXISTS idx_categories_menu_id ON categories(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);