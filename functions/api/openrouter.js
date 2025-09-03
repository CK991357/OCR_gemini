/**
 * @function onRequestPost
 * @description Cloudflare Pages Function for proxying requests to the OpenRouter API for the Gemini Vision model.
 * @param {Object} context - The request context object.
 * @param {Request} context.request - The incoming request.
 * @param {Object} context.env - Environment variables.
 * @returns {Promise<Response>} - A promise that resolves to the response.
 */
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured in environment variables" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { prompt, images } = await request.json();

    if (!prompt || !images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "Prompt and an array of images are required." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate that images are in base64 data URL format
    if (images.some(img => typeof img !== 'string' || !img.startsWith('data:image/'))) {
        return new Response(JSON.stringify({ error: "All images must be valid base64 data URLs." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Construct the payload for the OpenRouter API, based on main.ts logic
    const openrouterMessages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...images.map(img_url => ({
            type: "image_url",
            image_url: {
              url: img_url
            }
          }))
        ]
      }
    ];

    const openrouterPayload = {
      model: "google/gemini-2.5-flash-image-preview:free",
      messages: openrouterMessages,
      // Optional: Add other parameters like max_tokens if needed
      // max_tokens: 1024,
    };

    // Forward the request to the OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://your-app-url.com', // Replace with your actual app URL
        'X-Title': 'Gemini OCR Tool' // Replace with your app's name
      },
      body: JSON.stringify(openrouterPayload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: `OpenRouter API error: ${response.status} ${response.statusText}`, details: errorText }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const data = await response.json();

    // Extract the content from the response, which could be an image or text.
    // Based on the reference, the model might return a base64 string directly in the content.
    const messageContent = data.choices?.[0]?.message?.content;

    if (messageContent) {
        return new Response(JSON.stringify({ data: messageContent }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
         return new Response(JSON.stringify({ error: "Model did not return any content.", details: data }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}