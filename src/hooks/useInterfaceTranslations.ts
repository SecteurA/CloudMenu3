import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface InterfaceTranslation {
  translation_key: string;
  translated_text: string;
}

interface TranslationCache {
  [languageCode: string]: {
    [key: string]: string;
  };
}

const translationCache: TranslationCache = {};

export function useInterfaceTranslations(languageCode: string, keys: string[]) {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTranslations = async () => {
      if (translationCache[languageCode]) {
        setTranslations(translationCache[languageCode]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('interface_translations')
          .select('translation_key, translated_text')
          .eq('language_code', languageCode)
          .in('translation_key', keys);

        if (error) {
          console.error('Error fetching interface translations:', error);
          setLoading(false);
          return;
        }

        const translationsMap: Record<string, string> = {};
        data?.forEach((item: InterfaceTranslation) => {
          translationsMap[item.translation_key] = item.translated_text;
        });

        translationCache[languageCode] = translationsMap;
        setTranslations(translationsMap);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
  }, [languageCode, keys.join(',')]);

  return { translations, loading };
}

export function getTranslation(
  translations: Record<string, string>,
  key: string,
  fallback: string = ''
): string {
  return translations[key] || fallback;
}
