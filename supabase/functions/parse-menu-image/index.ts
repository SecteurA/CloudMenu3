const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

async function searchFoodImage(dishName: string, retries = 3): Promise<string | null> {
  const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');
  
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn('UNSPLASH_ACCESS_KEY not found, skipping image search');
    return null;
  }

  const cleanDishName = dishName
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const searchQuery = `${cleanDishName} food dish plate meal cuisine cooking`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`Searching image for "${dishName}" (attempt ${attempt + 1})`);
      
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=10&orientation=landscape&content_filter=high`,
        {
          headers: {
            'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Rate limited, waiting ${waitTime}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const foodImages = data.results.filter((img: any) => {
          const description = (img.description || '').toLowerCase();
          const altDescription = (img.alt_description || '').toLowerCase();
          const tags = (img.tags || []).map((tag: any) => tag.title.toLowerCase()).join(' ');
          const combinedText = `${description} ${altDescription} ${tags}`;
          
          const foodKeywords = ['food', 'dish', 'plate', 'meal', 'cuisine', 'cooking', 'recipe', 'eat', 'delicious', 'tasty'];
          const hasFoodKeywords = foodKeywords.some(keyword => combinedText.includes(keyword));
          
          const excludeKeywords = ['restaurant', 'storefront', 'building', 'exterior', 'sign', 'logo', 'interior', 'dining room', 'table', 'chair', 'people', 'person', 'chef', 'kitchen staff', 'waiter'];
          const hasExcludedKeywords = excludeKeywords.some(keyword => combinedText.includes(keyword));
          
          return hasFoodKeywords && !hasExcludedKeywords;
        });
        
        const selectedImage = foodImages.length > 0 ? foodImages[0] : data.results[0];
        const imageUrl = selectedImage.urls.regular;
        
        console.log(`Found image for "${dishName}": ${imageUrl}`);
        console.log(`Image alt description: ${selectedImage.alt_description || 'N/A'}`);
        
        return imageUrl;
      } else {
        console.log(`No images found for "${dishName}"`);
        return null;
      }
    } catch (error) {
      console.error(`Error searching image for "${dishName}" (attempt ${attempt + 1}):`, error);
      if (attempt === retries - 1) {
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  return null;
}

async function convertToWebP(imageBytes: Uint8Array, contentType: string): Promise<Uint8Array> {
  try {
    const blob = new Blob([imageBytes], { type: contentType });
    const imageBitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    let targetWidth = imageBitmap.width;
    let targetHeight = imageBitmap.height;
    const maxWidth = 800;

    if (targetWidth > maxWidth) {
      const aspectRatio = targetHeight / targetWidth;
      targetWidth = maxWidth;
      targetHeight = Math.round(maxWidth * aspectRatio);
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

    const webpBlob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.85
    });

    return new Uint8Array(await webpBlob.arrayBuffer());
  } catch (error) {
    console.error('Error converting to WebP:', error);
    throw error;
  }
}

async function downloadAndUploadImage(imageUrl: string, fileName: string, menuId: string): Promise<string | null> {
  try {
    console.log(`Downloading image: ${imageUrl}`);

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    if (imageBytes.length > 10 * 1024 * 1024) {
      console.warn(`Image too large (${imageBytes.length} bytes), skipping`);
      return null;
    }

    console.log(`Converting image to WebP and optimizing...`);
    const webpBytes = await convertToWebP(imageBytes, contentType);

    const sizeBefore = imageBytes.length;
    const sizeAfter = webpBytes.length;
    const reduction = ((sizeBefore - sizeAfter) / sizeBefore * 100).toFixed(1);
    console.log(`Size reduction: ${(sizeBefore / 1024).toFixed(1)}KB → ${(sizeAfter / 1024).toFixed(1)}KB (${reduction}% smaller)`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const sanitizedName = fileName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const uniqueFileName = `${menuId}/${timestamp}-${randomId}-${sanitizedName}.webp`;

    console.log(`Uploading to Supabase storage: ${uniqueFileName}`);

    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/menu-images/${uniqueFileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'image/webp',
          'Content-Length': webpBytes.length.toString(),
        },
        body: webpBytes,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload to storage: ${uploadResponse.status} - ${errorText}`);
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/menu-images/${uniqueFileName}`;
    console.log(`Image uploaded successfully: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error('Error downloading/uploading image:', error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { imageUrl, menuId, importImages = true } = await req.json();

    if (!imageUrl || !menuId) {
      return new Response(
        JSON.stringify({ error: 'Image URL and Menu ID are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Testing Claude API key...');
    try {
      const testResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('CLAUDE_API_KEY') || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: 'Hello' }]
            }
          ]
        })
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('Claude API key test failed:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          error: errorText,
          hasApiKey: !!Deno.env.get('CLAUDE_API_KEY')
        });

        return new Response(
          JSON.stringify({ 
            error: 'Claude API key test failed',
            details: `${testResponse.status} ${testResponse.statusText}`,
            rawError: errorText,
            hasApiKey: !!Deno.env.get('CLAUDE_API_KEY'),
            suggestion: testResponse.status === 401 
              ? 'Invalid API key - please verify your CLAUDE_API_KEY in Supabase secrets'
              : testResponse.status === 429 
                ? 'Rate limit exceeded - please wait before trying again'
                : 'API key test failed - check your Claude API key and quota'
          }),
          {
            status: testResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Claude API key test successful');
    } catch (testError) {
      console.error('Claude API key test error:', testError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to test Claude API key',
          details: testError.message,
          suggestion: 'Check your CLAUDE_API_KEY environment variable'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Fetching image from URL...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', imageResponse.status, imageResponse.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch image' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log('Converting image to base64...');
    const imageBuffer = await imageResponse.arrayBuffer();
    console.log('Image buffer size:', imageBuffer.byteLength, 'bytes');
    
    if (imageBuffer.byteLength > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Image too large. Please use an image smaller than 10MB.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const imageBytes = new Uint8Array(imageBuffer);
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < imageBytes.length; i += chunkSize) {
      const chunk = imageBytes.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const imageBase64 = btoa(binaryString);
    const imageType = imageResponse.headers.get('content-type') || 'image/jpeg';

    console.log('Calling Claude API...');
    const callClaude = async (retries = 3, delay = 2000): Promise<Response> => {
      for (let i = 0; i < retries; i++) {
        console.log(`Claude API attempt ${i + 1}/${retries}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': Deno.env.get('CLAUDE_API_KEY') || '',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `You are analyzing a restaurant menu image. Your task is to extract EVERY SINGLE item visible on the menu.\n\nMANDATORY RULES:\n1. Count ALL items on the menu before responding - if you see 23 pizza items, you MUST extract all 23\n2. Do NOT create artificial subcategories - if it's a pizza menu, create only ONE category called "Pizzas"\n3. Do NOT group items by price range, specialty, or any other criteria\n4. Extract items in the EXACT order they appear on the menu\n\nReturn this JSON structure:\n{\n  "categories": [\n    {\n      "name": "Pizzas",\n      "description": "",\n      "items": [\n        {\n          "name": "Pizza Name",\n          "description": "Full description as shown",\n          "price": 15.90,\n          "allergenes": ["gluten", "dairy"],\n          "vegetarian": false,\n          "vegan": false,\n          "gluten_free": false,\n          "spicy": false\n        }\n      ]\n    }\n  ]\n}\n\nEXTRACTION PROCESS:\n1. Scan the entire menu from top to bottom, left to right\n2. For each item extract: name, full description, exact price\n3. Convert prices like "15,90 €" to numeric 15.90\n4. Identify allergens from ingredients (gluten from wheat/flour, dairy from cheese/cream, etc.)\n5. Put ALL items in ONE category - do not split into subcategories\n6. Double-check you haven't missed any items\n\nCRITICAL: If you see sections or headings on the menu, ignore them for categorization purposes. Put everything in one category based on the main food type.`
                  },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: imageType,
                      data: imageBase64
                    }
                  }
                ]
              }
            ]
          })
        });
        
        clearTimeout(timeoutId);
        console.log('Claude API response status:', response.status);

        if (response.ok || response.status !== 429) {
          return response;
        }

        if (i < retries - 1) {
          console.log(`Rate limit hit, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            console.error('Claude API request timed out');
            if (i === retries - 1) {
              return new Response(
                JSON.stringify({ error: 'Request timed out. The image might be too complex or the service is overloaded.' }),
                {
                  status: 408,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
              );
            }
          } else {
            console.error('Claude API request failed:', error);
            throw error;
          }
        }
      }

      return fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('CLAUDE_API_KEY') || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are analyzing a restaurant menu image. Your task is to extract EVERY SINGLE item visible on the menu.\n\nMANDATORY RULES:\n1. Count ALL items on the menu before responding - if you see 23 pizza items, you MUST extract all 23\n2. Do NOT create artificial subcategories - if it's a pizza menu, create only ONE category called "Pizzas"\n3. Do NOT group items by price range, specialty, or any other criteria\n4. Extract items in the EXACT order they appear on the menu\n\nReturn this JSON structure:\n{\n  "categories": [\n    {\n      "name": "Pizzas",\n      "description": "",\n      "items": [\n        {\n          "name": "Pizza Name",\n          "description": "Full description as shown",\n          "price": 15.90,\n          "allergenes": ["gluten", "dairy"],\n          "vegetarian": false,\n          "vegan": false,\n          "gluten_free": false,\n          "spicy": false\n        }\n      ]\n    }\n  ]\n}\n\nEXTRACTION PROCESS:\n1. Scan the entire menu from top to bottom, left to right\n2. For each item extract: name, full description, exact price\n3. Convert prices like "15,90 €" to numeric 15.90\n4. Identify allergens from ingredients (gluten from wheat/flour, dairy from cheese/cream, etc.)\n5. Put ALL items in ONE category - do not split into subcategories\n6. Double-check you haven't missed any items\n\nCRITICAL: If you see sections or headings on the menu, ignore them for categorization purposes. Put everything in one category based on the main food type.`
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: imageType,
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        })
      });
    };

    const claudeResponse = await callClaude();

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      if (claudeResponse.status === 429 || (errorData.error && errorData.error.code === 'insufficient_quota')) {
        return new Response(
          JSON.stringify({ 
            error: 'API quota exceeded',
            details: 'Your API key has exceeded its quota. Please check your billing and quota limits.',
            suggestion: 'Verify that CLAUDE_API_KEY contains a valid Anthropic API key with sufficient quota',
            originalError: errorData.error?.message || errorText
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.error('Claude API error:', {
        status: claudeResponse.status,
        statusText: claudeResponse.statusText,
        error: errorData,
        apiKey: Deno.env.get('CLAUDE_API_KEY') ? 'Present' : 'Missing'
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to analyze image with AI',
          details: `Claude API error: ${claudeResponse.status} ${claudeResponse.statusText}`,
          hasApiKey: !!Deno.env.get('CLAUDE_API_KEY'),
          suggestion: 'Verify that CLAUDE_API_KEY contains a valid Anthropic API key'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const aiResult = await claudeResponse.json();
    console.log('AI analysis complete');
    const content = aiResult.content[0]?.text;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content received from AI' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let menuData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      menuData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse AI response',
          rawResponse: content 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (importImages) {
      console.log('Starting image search and download process...');

      for (const category of menuData.categories) {
        console.log(`Processing category: ${category.name} with ${category.items.length} items`);

        for (const item of category.items) {
          try {
            console.log(`Searching image for dish: ${item.name}`);

            const imageUrl = await searchFoodImage(item.name);

            if (imageUrl) {
              const uploadedImageUrl = await downloadAndUploadImage(imageUrl, item.name, menuId);

              if (uploadedImageUrl) {
                item.image_url = uploadedImageUrl;
                console.log(`✅ Image added for "${item.name}": ${uploadedImageUrl}`);
              } else {
                console.log(`❌ Failed to upload image for "${item.name}"`);
                item.image_url = '';
              }
            } else {
              console.log(`❌ No image found for "${item.name}"`);
              item.image_url = '';
            }

            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error) {
            console.error(`Error processing image for "${item.name}":`, error);
            item.image_url = '';
          }
        }
      }

      console.log('Image processing complete');
    } else {
      console.log('Image import disabled by user - skipping image search');

      for (const category of menuData.categories) {
        for (const item of category.items) {
          item.image_url = '';
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: menuData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});