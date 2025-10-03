const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Helper function to search for food images on Unsplash
async function searchFoodImage(dishName: string, retries = 3): Promise<string | null> {
  const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');
  
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn('UNSPLASH_ACCESS_KEY not found, skipping image search');
    return null;
  }

  // Clean dish name for better search results
  const cleanDishName = dishName
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  // Add specific food keywords and exclude non-food terms
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
          // Rate limit - wait and retry
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Rate limited, waiting ${waitTime}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Filter results to find the best food-related image
        const foodImages = data.results.filter((img: any) => {
          const description = (img.description || '').toLowerCase();
          const altDescription = (img.alt_description || '').toLowerCase();
          const tags = (img.tags || []).map((tag: any) => tag.title.toLowerCase()).join(' ');
          const combinedText = `${description} ${altDescription} ${tags}`;
          
          // Must contain food-related keywords
          const foodKeywords = ['food', 'dish', 'plate', 'meal', 'cuisine', 'cooking', 'recipe', 'eat', 'delicious', 'tasty'];
          const hasFoodKeywords = foodKeywords.some(keyword => combinedText.includes(keyword));
          
          // Exclude non-food keywords
          const excludeKeywords = ['restaurant', 'storefront', 'building', 'exterior', 'sign', 'logo', 'interior', 'dining room', 'table', 'chair', 'people', 'person', 'chef', 'kitchen staff', 'waiter'];
          const hasExcludedKeywords = excludeKeywords.some(keyword => combinedText.includes(keyword));
          
          return hasFoodKeywords && !hasExcludedKeywords;
        });
        
        // Use filtered results if available, otherwise fall back to first result
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
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  return null;
}

// Helper function to download and upload image to Supabase storage
async function downloadAndUploadImage(imageUrl: string, fileName: string): Promise<string | null> {
  try {
    console.log(`Downloading image: ${imageUrl}`);
    
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    
    // Check file size (limit to 5MB)
    if (imageBytes.length > 5 * 1024 * 1024) {
      console.warn(`Image too large (${imageBytes.length} bytes), skipping`);
      return null;
    }

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileExtension = imageUrl.includes('.jpg') ? 'jpg' : 'jpeg';
    const uniqueFileName = `menu-items/${timestamp}-${randomId}-${fileName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${fileExtension}`;

    console.log(`Uploading to Supabase storage: ${uniqueFileName}`);

    // Upload to Supabase storage
    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/cloudmenu/${uniqueFileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'image/jpeg',
          'Content-Length': imageBytes.length.toString(),
        },
        body: imageBytes,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload to storage: ${uploadResponse.status} - ${errorText}`);
    }

    // Get public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/cloudmenu/${uniqueFileName}`;
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

    // Test Claude API key first with a simple request
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

    // First, fetch the image and convert to base64
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
    
    // Check if image is too large (limit to 10MB for processing)
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
    const chunkSize = 8192; // Process in chunks to avoid stack overflow
    for (let i = 0; i < imageBytes.length; i += chunkSize) {
      const chunk = imageBytes.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const imageBase64 = btoa(binaryString);
    const imageType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Call Claude API with retry logic
    console.log('Calling Claude API...');
    const callClaude = async (retries = 3, delay = 2000): Promise<Response> => {
      for (let i = 0; i < retries; i++) {
        console.log(`Claude API attempt ${i + 1}/${retries}`);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
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
                    text: `You are analyzing a restaurant menu image. Your task is to extract EVERY SINGLE item visible on the menu.

MANDATORY RULES:
1. Count ALL items on the menu before responding - if you see 23 pizza items, you MUST extract all 23
2. Do NOT create artificial subcategories - if it's a pizza menu, create only ONE category called "Pizzas"
3. Do NOT group items by price range, specialty, or any other criteria
4. Extract items in the EXACT order they appear on the menu

Return this JSON structure:
{
  "categories": [
    {
      "name": "Pizzas",
      "description": "",
      "items": [
        {
          "name": "Pizza Name",
          "description": "Full description as shown",
          "price": 15.90,
          "allergenes": ["gluten", "dairy"],
          "vegetarian": false,
          "vegan": false,
          "gluten_free": false,
          "spicy": false
        }
      ]
    }
  ]
}

EXTRACTION PROCESS:
1. Scan the entire menu from top to bottom, left to right
2. For each item extract: name, full description, exact price
3. Convert prices like "15,90 €" to numeric 15.90
4. Identify allergens from ingredients (gluten from wheat/flour, dairy from cheese/cream, etc.)
5. Put ALL items in ONE category - do not split into subcategories
6. Double-check you haven't missed any items

CRITICAL: If you see sections or headings on the menu, ignore them for categorization purposes. Put everything in one category based on the main food type.`
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

        // If successful or not a rate limit error, return response
        if (response.ok || response.status !== 429) {
          return response;
        }

        // If it's a 429 error and we have retries left, wait and retry
        if (i < retries - 1) {
          console.log(`Rate limit hit, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
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

      // If all retries failed, make one final attempt to get the error response
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
                  text: `You are analyzing a restaurant menu image. Your task is to extract EVERY SINGLE item visible on the menu.

MANDATORY RULES:
1. Count ALL items on the menu before responding - if you see 23 pizza items, you MUST extract all 23
2. Do NOT create artificial subcategories - if it's a pizza menu, create only ONE category called "Pizzas"
3. Do NOT group items by price range, specialty, or any other criteria
4. Extract items in the EXACT order they appear on the menu

Return this JSON structure:
{
  "categories": [
    {
      "name": "Pizzas",
      "description": "",
      "items": [
        {
          "name": "Pizza Name",
          "description": "Full description as shown",
          "price": 15.90,
          "allergenes": ["gluten", "dairy"],
          "vegetarian": false,
          "vegan": false,
          "gluten_free": false,
          "spicy": false
        }
      ]
    }
  ]
}

EXTRACTION PROCESS:
1. Scan the entire menu from top to bottom, left to right
2. For each item extract: name, full description, exact price
3. Convert prices like "15,90 €" to numeric 15.90
4. Identify allergens from ingredients (gluten from wheat/flour, dairy from cheese/cream, etc.)
5. Put ALL items in ONE category - do not split into subcategories
6. Double-check you haven't missed any items

CRITICAL: If you see sections or headings on the menu, ignore them for categorization purposes. Put everything in one category based on the main food type.`
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

      // Check for quota/billing issues
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

    // Parse the JSON response from Claude
    let menuData;
    try {
      // Extract JSON from the response (in case there's extra text)
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

    // Conditionally search and download images for each dish
    if (importImages) {
      console.log('Starting image search and download process...');

      for (const category of menuData.categories) {
        console.log(`Processing category: ${category.name} with ${category.items.length} items`);

        for (const item of category.items) {
          try {
            console.log(`Searching image for dish: ${item.name}`);

            // Search for image
            const imageUrl = await searchFoodImage(item.name);

            if (imageUrl) {
              // Download and upload image
              const uploadedImageUrl = await downloadAndUploadImage(imageUrl, item.name);

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

            // Add small delay between requests to be respectful to APIs
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

      // Set all image URLs to empty string
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