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

    // --- START: MODIFIED RESPONSE HANDLING LOGIC ---
    // Based on the logic from the reference main.ts file.
    const message = data.choices?.[0]?.message;
    let imageUrl = null;

    // Case 1: Image is in message.images array (less common for vision models)
    if (message?.images?.[0]?.image_url?.url) {
        imageUrl = message.images[0].image_url.url;
    }
    // Case 2: Image is a base64 data URL directly in message.content
    else if (typeof message?.content === 'string' && message.content.startsWith('data:image/')) {
        imageUrl = message.content;
    }
    // Case 3: Sometimes the URL might be in a tool_calls part (for some models)
    // For now, we stick to the two primary cases from main.ts.

    if (imageUrl) {
        return new Response(JSON.stringify({ data: imageUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
         // Log the full response for debugging if no image is found
         console.error("OpenRouter Debug: No valid image URL found in response.", JSON.stringify(data, null, 2));
         return new Response(JSON.stringify({
             error: "Model did not return a valid image. Check the console logs for the full API response.",
             details: data
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    // --- END: MODIFIED RESPONSE HANDLING LOGIC ---

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}