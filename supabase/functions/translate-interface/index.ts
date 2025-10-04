import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TranslateRequest {
  languageCode: string;
  languageName: string;
}

const INTERFACE_KEYS = [
  'our_menus',
  'no_menus_available',
  'leave_review',
  'write_review_google',
  'contact',
  'follow_us',
  'our_location',
  'powered_by',
  'all_rights_reserved'
];

const BASE_TRANSLATIONS: Record<string, string> = {
  'our_menus': 'Our Menus',
  'no_menus_available': 'No menus available at the moment.',
  'leave_review': 'Leave us a review',
  'write_review_google': 'Write a review on Google',
  'contact': 'Contact',
  'follow_us': 'Follow us',
  'our_location': 'Our location',
  'powered_by': 'Powered by',
  'all_rights_reserved': 'All rights reserved.'
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { languageCode, languageName }: TranslateRequest = await req.json();

    if (!languageCode) {
      return new Response(
        JSON.stringify({ error: 'Language code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: existingTranslations } = await supabaseClient
      .from('interface_translations')
      .select('translation_key')
      .eq('language_code', languageCode);

    const existingKeys = existingTranslations?.map(t => t.translation_key) || [];
    const missingKeys = INTERFACE_KEYS.filter(key => !existingKeys.includes(key));

    if (missingKeys.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All translations already exist', languageCode }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const targetLanguage = languageName || languageCode;
    const translationsToInsert = [];

    for (const key of missingKeys) {
      const baseText = BASE_TRANSLATIONS[key];
      
      try {
        const translateResponse = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `You are a professional translator. Translate the text to ${targetLanguage}. Only provide the translation, nothing else. Keep it natural and culturally appropriate.`
                },
                {
                  role: 'user',
                  content: baseText
                }
              ],
              temperature: 0.3,
            }),
          }
        );

        const translateData = await translateResponse.json();
        const translatedText = translateData.choices?.[0]?.message?.content?.trim() || baseText;

        translationsToInsert.push({
          language_code: languageCode,
          translation_key: key,
          translated_text: translatedText,
        });
      } catch (error) {
        console.error(`Error translating ${key}:`, error);
        translationsToInsert.push({
          language_code: languageCode,
          translation_key: key,
          translated_text: baseText,
        });
      }
    }

    const { error: insertError } = await supabaseClient
      .from('interface_translations')
      .insert(translationsToInsert);

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save translations', details: insertError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully created ${translationsToInsert.length} translations for ${languageCode}`,
        translations: translationsToInsert,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});