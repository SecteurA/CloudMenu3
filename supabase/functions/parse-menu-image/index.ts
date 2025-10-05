const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

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

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch image' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
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

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
                text: 'Extract all menu items from this image. Return JSON: {"categories": [{"name": "Category", "description": "", "items": [{"name": "Item", "description": "", "price": 0, "allergenes": [], "vegetarian": false, "vegan": false, "gluten_free": false, "spicy": false}]}]}'
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

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const aiResult = await claudeResponse.json();
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
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', rawResponse: content }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    for (const category of menuData.categories) {
      for (const item of category.items) {
        item.image_url = '';
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: menuData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});