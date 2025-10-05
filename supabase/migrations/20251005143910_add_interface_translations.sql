/*
  # Add Interface Translations System

  ## Overview
  This migration creates a system for storing translations of UI interface elements
  (buttons, labels, messages, etc.) that are automatically generated when a new
  language is added to a menu.

  ## New Tables
  
  ### `interface_translations`
  Stores translations for all interface elements across different languages
  - `id` (uuid, primary key)
  - `language_code` (text) - ISO language code (e.g., 'en', 'fr', 'es', 'ja', 'ar')
  - `translation_key` (text) - Unique key for the interface element (e.g., 'our_menus', 'contact', 'follow_us')
  - `translated_text` (text) - The translated text for this element
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on interface_translations table
  - Public read access for all published interface translations
  - Only authenticated users can manage translations

  ## Important Notes
  - Unique constraint ensures one translation per key per language
  - Translations are shared across all restaurants
  - When a new language is added via menu_languages, interface translations can be auto-generated
*/

CREATE TABLE IF NOT EXISTS interface_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  translation_key text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(language_code, translation_key)
);

ALTER TABLE interface_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view interface translations"
  ON interface_translations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert interface translations"
  ON interface_translations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update interface translations"
  ON interface_translations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete interface translations"
  ON interface_translations FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_interface_translations_language ON interface_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_interface_translations_key ON interface_translations(translation_key);

INSERT INTO interface_translations (language_code, translation_key, translated_text) VALUES
('fr', 'our_menus', 'Nos Menus'),
('fr', 'no_menus_available', 'Aucun menu disponible pour le moment.'),
('fr', 'leave_review', 'Laissez-nous un avis'),
('fr', 'write_review_google', 'Écrire un avis sur Google'),
('fr', 'contact', 'Contact'),
('fr', 'follow_us', 'Suivez-nous'),
('fr', 'our_location', 'Notre emplacement'),
('fr', 'powered_by', 'Propulsé par'),
('fr', 'all_rights_reserved', 'Tous droits réservés.'),
('en', 'our_menus', 'Our Menus'),
('en', 'no_menus_available', 'No menus available at the moment.'),
('en', 'leave_review', 'Leave us a review'),
('en', 'write_review_google', 'Write a review on Google'),
('en', 'contact', 'Contact'),
('en', 'follow_us', 'Follow us'),
('en', 'our_location', 'Our location'),
('en', 'powered_by', 'Powered by'),
('en', 'all_rights_reserved', 'All rights reserved.'),
('es', 'our_menus', 'Nuestros Menús'),
('es', 'no_menus_available', 'No hay menús disponibles en este momento.'),
('es', 'leave_review', 'Déjanos una reseña'),
('es', 'write_review_google', 'Escribir una reseña en Google'),
('es', 'contact', 'Contacto'),
('es', 'follow_us', 'Síguenos'),
('es', 'our_location', 'Nuestra ubicación'),
('es', 'powered_by', 'Desarrollado por'),
('es', 'all_rights_reserved', 'Todos los derechos reservados.'),
('de', 'our_menus', 'Unsere Menüs'),
('de', 'no_menus_available', 'Derzeit sind keine Menüs verfügbar.'),
('de', 'leave_review', 'Hinterlassen Sie uns eine Bewertung'),
('de', 'write_review_google', 'Bewertung auf Google schreiben'),
('de', 'contact', 'Kontakt'),
('de', 'follow_us', 'Folge uns'),
('de', 'our_location', 'Unser Standort'),
('de', 'powered_by', 'Unterstützt von'),
('de', 'all_rights_reserved', 'Alle Rechte vorbehalten.'),
('it', 'our_menus', 'I Nostri Menu'),
('it', 'no_menus_available', 'Nessun menu disponibile al momento.'),
('it', 'leave_review', 'Lasciaci una recensione'),
('it', 'write_review_google', 'Scrivi una recensione su Google'),
('it', 'contact', 'Contatti'),
('it', 'follow_us', 'Seguici'),
('it', 'our_location', 'La nostra posizione'),
('it', 'powered_by', 'Offerto da'),
('it', 'all_rights_reserved', 'Tutti i diritti riservati.'),
('ar', 'our_menus', 'قوائمنا'),
('ar', 'no_menus_available', 'لا توجد قوائم متاحة في الوقت الحالي.'),
('ar', 'leave_review', 'اترك لنا تقييماً'),
('ar', 'write_review_google', 'اكتب تقييماً على جوجل'),
('ar', 'contact', 'اتصل بنا'),
('ar', 'follow_us', 'تابعنا'),
('ar', 'our_location', 'موقعنا'),
('ar', 'powered_by', 'مدعوم من'),
('ar', 'all_rights_reserved', 'جميع الحقوق محفوظة.')
ON CONFLICT (language_code, translation_key) DO NOTHING;