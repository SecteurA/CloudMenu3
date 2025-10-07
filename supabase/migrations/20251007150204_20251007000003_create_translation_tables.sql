/*
  # Create Translation Tables

  ## Overview
  Creates tables for managing multi-language support across menus, categories, and items.

  ## New Tables

  ### `menu_languages`
  Stores available languages for each menu and translated menu titles
  - `id` (uuid, primary key)
  - `menu_id` (uuid, foreign key) - Parent menu
  - `language_code` (text, not null) - ISO language code (en, fr, es, etc.)
  - `menu_title` (text) - Translated menu title
  - `menu_description` (text) - Translated menu description
  - `is_default` (boolean, default false) - Whether this is the default language
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `category_translations`
  Stores translated category names and descriptions
  - `id` (uuid, primary key)
  - `category_id` (uuid, foreign key) - Parent category
  - `language_code` (text, not null) - ISO language code
  - `nom` (text, not null) - Translated category name
  - `description` (text) - Translated description
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `menu_item_translations`
  Stores translated menu item names and descriptions
  - `id` (uuid, primary key)
  - `menu_item_id` (uuid, foreign key) - Parent menu item
  - `language_code` (text, not null) - ISO language code
  - `nom` (text, not null) - Translated item name
  - `description` (text) - Translated description
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `interface_translations`
  Stores UI text translations (buttons, labels, etc.)
  - `id` (uuid, primary key)
  - `language_code` (text, not null) - ISO language code
  - `translation_key` (text, not null) - Key for the translation (e.g., 'reserve', 'contact')
  - `translation_value` (text, not null) - Translated text
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Restaurant owners manage translations for their content
  - Public can view translations
*/

-- Create menu_languages table
CREATE TABLE IF NOT EXISTS menu_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  menu_title text DEFAULT '',
  menu_description text DEFAULT '',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
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

-- Create interface_translations table
CREATE TABLE IF NOT EXISTS interface_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  translation_key text NOT NULL,
  translation_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(language_code, translation_key)
);

-- Enable RLS
ALTER TABLE menu_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interface_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menu_languages
CREATE POLICY "Users can view their menu languages"
  ON menu_languages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_languages.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their menu languages"
  ON menu_languages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_languages.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their menu languages"
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

CREATE POLICY "Users can delete their menu languages"
  ON menu_languages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_languages.menu_id
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view menu languages for published menus"
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

-- RLS Policies for category_translations
CREATE POLICY "Users can view their category translations"
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

CREATE POLICY "Users can manage their category translations"
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

CREATE POLICY "Users can update their category translations"
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

CREATE POLICY "Users can delete their category translations"
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

-- RLS Policies for menu_item_translations
CREATE POLICY "Users can view their item translations"
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

CREATE POLICY "Users can manage their item translations"
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

CREATE POLICY "Users can update their item translations"
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

CREATE POLICY "Users can delete their item translations"
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

-- RLS Policies for interface_translations
CREATE POLICY "Anyone can view interface translations"
  ON interface_translations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can manage interface translations"
  ON interface_translations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_languages_menu_id ON menu_languages(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_languages_language_code ON menu_languages(language_code);
CREATE INDEX IF NOT EXISTS idx_category_translations_category_id ON category_translations(category_id);
CREATE INDEX IF NOT EXISTS idx_category_translations_language_code ON category_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_menu_item_translations_item_id ON menu_item_translations(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_translations_language_code ON menu_item_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_interface_translations_language_code ON interface_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_interface_translations_key ON interface_translations(translation_key);