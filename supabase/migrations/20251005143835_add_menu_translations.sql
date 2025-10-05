/*
  # Add Menu Translations Support

  ## Overview
  This migration adds support for multiple language translations per menu.
  Instead of duplicating menus for each language, each menu can now have
  translations for its content in different languages.

  ## New Tables
  
  ### `menu_languages`
  Tracks which languages are enabled for each menu
  - `id` (uuid, primary key)
  - `menu_id` (uuid, foreign key to menus)
  - `language_code` (text) - ISO language code (e.g., 'en', 'fr', 'es')
  - `is_default` (boolean) - Whether this is the default language
  - `created_at` (timestamptz)
  
  ### `category_translations`
  Stores translations for category names and descriptions
  - `id` (uuid, primary key)
  - `category_id` (uuid, foreign key to categories)
  - `language_code` (text)
  - `nom` (text) - Translated category name
  - `description` (text) - Translated category description
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `menu_item_translations`
  Stores translations for menu item names and descriptions
  - `id` (uuid, primary key)
  - `menu_item_id` (uuid, foreign key to menu_items)
  - `language_code` (text)
  - `nom` (text) - Translated item name
  - `description` (text) - Translated item description
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Add policies for authenticated users to manage their own translations
  - Users can only access translations for menus they own

  ## Important Notes
  - The original `categories` and `menu_items` tables remain unchanged
  - Original content serves as the default language translation
  - Each translation is linked to the original item via foreign keys
  - Unique constraint ensures one translation per language per item
*/

-- Create menu_languages table
CREATE TABLE IF NOT EXISTS menu_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(menu_id, language_code)
);

-- Create category_translations table
CREATE TABLE IF NOT EXISTS category_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  nom text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, language_code)
);

-- Create menu_item_translations table
CREATE TABLE IF NOT EXISTS menu_item_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  nom text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(menu_item_id, language_code)
);

-- Enable RLS
ALTER TABLE menu_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_translations ENABLE ROW LEVEL SECURITY;

-- Policies for menu_languages
CREATE POLICY "Users can view languages for their menus"
  ON menu_languages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_languages.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert languages for their menus"
  ON menu_languages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_languages.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update languages for their menus"
  ON menu_languages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_languages.menu_id
      AND menus.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_languages.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete languages for their menus"
  ON menu_languages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_languages.menu_id
      AND menus.user_id = auth.uid()
    )
  );

-- Policies for category_translations
CREATE POLICY "Users can view translations for their categories"
  ON category_translations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = category_translations.category_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert translations for their categories"
  ON category_translations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = category_translations.category_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update translations for their categories"
  ON category_translations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = category_translations.category_id
      AND menus.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = category_translations.category_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete translations for their categories"
  ON category_translations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = category_translations.category_id
      AND menus.user_id = auth.uid()
    )
  );

-- Policies for menu_item_translations
CREATE POLICY "Users can view translations for their menu items"
  ON menu_item_translations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN categories ON categories.id = menu_items.category_id
      JOIN menus ON menus.id = categories.menu_id
      WHERE menu_items.id = menu_item_translations.menu_item_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert translations for their menu items"
  ON menu_item_translations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN categories ON categories.id = menu_items.category_id
      JOIN menus ON menus.id = categories.menu_id
      WHERE menu_items.id = menu_item_translations.menu_item_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update translations for their menu items"
  ON menu_item_translations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN categories ON categories.id = menu_items.category_id
      JOIN menus ON menus.id = categories.menu_id
      WHERE menu_items.id = menu_item_translations.menu_item_id
      AND menus.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN categories ON categories.id = menu_items.category_id
      JOIN menus ON menus.id = categories.menu_id
      WHERE menu_items.id = menu_item_translations.menu_item_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete translations for their menu items"
  ON menu_item_translations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN categories ON categories.id = menu_items.category_id
      JOIN menus ON menus.id = categories.menu_id
      WHERE menu_items.id = menu_item_translations.menu_item_id
      AND menus.user_id = auth.uid()
    )
  );

-- Add public read access for menu preview pages
CREATE POLICY "Anyone can view languages for published menus"
  ON menu_languages FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_languages.menu_id
      AND menus.status = 'published'
      AND menus.actif = true
    )
  );

CREATE POLICY "Anyone can view category translations for published menus"
  ON category_translations FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN menus ON menus.id = categories.menu_id
      WHERE categories.id = category_translations.category_id
      AND menus.status = 'published'
      AND menus.actif = true
    )
  );

CREATE POLICY "Anyone can view item translations for published menus"
  ON menu_item_translations FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN categories ON categories.id = menu_items.category_id
      JOIN menus ON menus.id = categories.menu_id
      WHERE menu_items.id = menu_item_translations.menu_item_id
      AND menus.status = 'published'
      AND menus.actif = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_menu_languages_menu_id ON menu_languages(menu_id);
CREATE INDEX IF NOT EXISTS idx_category_translations_category_id ON category_translations(category_id);
CREATE INDEX IF NOT EXISTS idx_category_translations_language ON category_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_menu_item_translations_item_id ON menu_item_translations(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_translations_language ON menu_item_translations(language_code);