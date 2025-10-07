/*
  # Create Core CloudMenu Database Schema

  ## Overview
  This migration creates the complete initial database schema for CloudMenu,
  a digital menu management platform for restaurants.

  ## New Tables

  ### `restaurant_profiles`
  Stores restaurant information and branding
  - All profile fields including colors, contact info, social media
  - One user can have one restaurant profile

  ### `menus`
  Stores menu information for restaurants
  - Menu configuration and styling
  - Multiple menus per restaurant

  ### `categories`
  Stores menu categories
  - Organized by menu
  - Display order supported

  ### `menu_items`
  Stores individual menu items
  - Rich details including dietary information
  - Images and allergen tracking

  ## Security
  - RLS enabled on all tables
  - Authenticated users manage their own data
  - Public users can view published menus
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
  location text DEFAULT '',
  location_lat decimal DEFAULT NULL,
  location_lng decimal DEFAULT NULL,
  footer_branding_text text DEFAULT '',
  show_footer_branding boolean DEFAULT true,
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
  nom text NOT NULL,
  menu_name text DEFAULT '',
  description text DEFAULT '',
  slug text DEFAULT '',
  banniere_url text DEFAULT '',
  language text DEFAULT 'fr',
  default_language text DEFAULT 'fr',
  actif boolean DEFAULT true,
  status text DEFAULT 'draft',
  currency_symbol text DEFAULT '€',
  ordre integer DEFAULT 0,
  couleur_primaire text DEFAULT '#f97316',
  couleur_secondaire text DEFAULT '#1f2937',
  couleur_texte text DEFAULT '#374151',
  couleur_fond text DEFAULT '#ffffff',
  afficher_powered_by boolean DEFAULT true,
  lien_cloudmenu boolean DEFAULT true,
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
  actif boolean DEFAULT true,
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
  disponible boolean DEFAULT true,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
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

CREATE POLICY "Anyone can view restaurant profiles"
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
CREATE INDEX IF NOT EXISTS idx_menus_slug ON menus(slug);
CREATE INDEX IF NOT EXISTS idx_menus_status ON menus(status);
CREATE INDEX IF NOT EXISTS idx_categories_menu_id ON categories(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);