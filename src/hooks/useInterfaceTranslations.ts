import { useState, useEffect, useRef } from 'react';
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
  // Initialize with cached data if available
  const [translations, setTranslations] = useState<Record<string, string>>(
    () => translationCache[languageCode] || {}
  );
  const [loading, setLoading] = useState(!translationCache[languageCode]);
  const previousLangRef = useRef<string>(languageCode);

  useEffect(() => {
    let isMounted = true;

    const fetchTranslations = async () => {
      // Check cache first - if cached, use it immediately
      if (translationCache[languageCode]) {
        if (isMounted) {
          setTranslations(translationCache[languageCode]);
          setLoading(false);
          previousLangRef.current = languageCode;
        }
        return;
      }

      // Show loading when fetching new language
      if (isMounted && previousLangRef.current !== languageCode) {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from('interface_translations')
          .select('translation_key, translated_text')
          .eq('language_code', languageCode)
          .in('translation_key', keys);

        if (error) {
          console.error('Error fetching interface translations:', error);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        const translationsMap: Record<string, string> = {};
        data?.forEach((item: InterfaceTranslation) => {
          translationsMap[item.translation_key] = item.translated_text;
        });

        translationCache[languageCode] = translationsMap;

        if (isMounted) {
          setTranslations(translationsMap);
          previousLangRef.current = languageCode;
          setLoading(false);
        }
      } catch (error) {
        console.error('Error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTranslations();

    return () => {
      isMounted = false;
    };
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


export { useInterfaceTranslations, getTranslation }