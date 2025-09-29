import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { imageUrl, menuId } = await req.json();

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

    // Parse the JSON response from OpenAI
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