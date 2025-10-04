import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TranslateRequest {
  menuId: string;
  targetLanguage: string;
  languageName: string;
}

interface Category {
  id: string;
  nom: string;
  description: string;
}

interface MenuItem {
  id: string;
  nom: string;
  description: string;
  category_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('CLAUDE_API_KEY');

    if (!anthropicKey) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { menuId, targetLanguage, languageName }: TranslateRequest = await req.json();

    // Verify user owns this menu
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select('id, user_id, default_language, menu_name, nom')
      .eq('id', menuId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (menuError || !menu) {
      throw new Error('Menu not found or access denied');
    }

    // Check if language already exists
    const { data: existingLang } = await supabase
      .from('menu_languages')
      .select('id')
      .eq('menu_id', menuId)
      .eq('language_code', targetLanguage)
      .maybeSingle();

    if (existingLang) {
      return new Response(
        JSON.stringify({ success: true, message: 'Language already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Translate menu title first
    const menuTitleToTranslate = menu.menu_name || menu.nom || 'Menu';
    const titleTranslationPrompt = `Translate this restaurant menu title from French to ${languageName}. Return ONLY the translated text, nothing else: "${menuTitleToTranslate}"`;

    const titleResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: titleTranslationPrompt,
          },
        ],
      }),
    });

    if (!titleResponse.ok) {
      throw new Error('Menu title translation failed');
    }

    const titleData = await titleResponse.json();
    const translatedMenuTitle = titleData.content[0].text.trim().replace(/['"]/g, '');

    // Add language to menu_languages with translated menu title
    const { error: langInsertError } = await supabase
      .from('menu_languages')
      .insert([{
        menu_id: menuId,
        language_code: targetLanguage,
        is_default: false,
        menu_title: translatedMenuTitle
      }]);

    if (langInsertError) throw langInsertError;

    // Fetch all categories and items
    const { data: categories } = await supabase
      .from('categories')
      .select('id, nom, description')
      .eq('menu_id', menuId);

    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, nom, description, category_id')
      .in('category_id', categories?.map((c: Category) => c.id) || []);

    if (!categories || !menuItems) {
      throw new Error('Failed to fetch menu data');
    }

    // Prepare translation batch
    const itemsToTranslate = [
      ...categories.map((c: Category) => ({
        type: 'category',
        id: c.id,
        name: c.nom,
        description: c.description || '',
      })),
      ...menuItems.map((item: MenuItem) => ({
        type: 'item',
        id: item.id,
        name: item.nom,
        description: item.description || '',
      })),
    ];

    // Call Claude API for translation
    const translationPrompt = `Translate the following restaurant menu items from French to ${languageName}. Return ONLY a JSON array with the same structure, preserving the 'type' and 'id' fields, but translating 'name' and 'description' fields. Keep culinary terms authentic when appropriate.

${JSON.stringify(itemsToTranslate, null, 2)}`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: translationPrompt,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      throw new Error('Translation API failed');
    }

    const anthropicData = await anthropicResponse.json();
    const translatedText = anthropicData.content[0].text;
    
    // Extract JSON from markdown code blocks if present
    let translatedItems;
    const jsonMatch = translatedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      translatedItems = JSON.parse(jsonMatch[1]);
    } else {
      translatedItems = JSON.parse(translatedText);
    }

    // Insert translations
    const categoryTranslations = translatedItems
      .filter((item: any) => item.type === 'category')
      .map((item: any) => ({
        category_id: item.id,
        language_code: targetLanguage,
        nom: item.name,
        description: item.description,
      }));

    const itemTranslations = translatedItems
      .filter((item: any) => item.type === 'item')
      .map((item: any) => ({
        menu_item_id: item.id,
        language_code: targetLanguage,
        nom: item.name,
        description: item.description,
      }));

    if (categoryTranslations.length > 0) {
      const { error: catError } = await supabase
        .from('category_translations')
        .insert(categoryTranslations);
      if (catError) throw catError;
    }

    if (itemTranslations.length > 0) {
      const { error: itemError } = await supabase
        .from('menu_item_translations')
        .insert(itemTranslations);
      if (itemError) throw itemError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Translated to ${languageName}`,
        menuTitle: translatedMenuTitle,
        categoriesCount: categoryTranslations.length,
        itemsCount: itemTranslations.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Translation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});