/**
 * @function onRequestPost
 * @description Cloudflare Pages Function for handling AI image editing requests.
 * It proxies requests to the OpenRouter API for the Gemini Vision model.
 * This function's logic is aligned with the existing 'openrouter.js' to ensure consistency.
 * @param {Object} context - The request context object.
 * @param {Request} context.request - The incoming request.
 * @param {Object} context.env - Environment variables.
 * @returns {Promise<Response>} - A promise that resolves to the response.
 */
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKeysString = env.OPENROUTER_API_KEY;

    if (!apiKeysString) {
      return new Response(JSON.stringify({ message: "OPENROUTER_API_KEY not configured in environment variables" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKeys = apiKeysString.split(',').map(key => key.trim()).filter(key => key);
    
    if (apiKeys.length === 0) {
        return new Response(JSON.stringify({ message: "OPENROUTER_API_KEY is configured but contains no valid keys." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const requestBody = await request.json();
    const { contents } = requestBody;

    if (!contents || !contents.parts || !Array.isArray(contents.parts) || contents.parts.length < 2) {
        return new Response(JSON.stringify({ message: "Request body must contain 'contents.parts' array with at least a prompt and an image." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Directly use the frontend-constructed contents.parts structure
    const openrouterPayload = {
      model: "google/gemini-2.5-flash-image-preview:free",
      messages: [{
        role: "user",
        content: contents.parts
      }],
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/10110531/ocr_gemini',
        'X-Title': 'Gemini AI Editor'
      },
      body: JSON.stringify(openrouterPayload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API Error:", errorText);
        // Return error with 'message' field to match frontend expectations
        return new Response(JSON.stringify({ message: `OpenRouter API error: ${response.status} ${response.statusText}`, details: errorText }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    let imageUrl = null;

    if (typeof message?.content === 'string' && message.content.startsWith('data:image/')) {
        imageUrl = message.content;
    }

    if (imageUrl) {
        // Return success with 'data' field to match frontend expectations
        return new Response(JSON.stringify({ data: imageUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
         console.error("OpenRouter Debug: No valid image URL found in response.", JSON.stringify(data, null, 2));
         return new Response(JSON.stringify({
             message: "Model did not return a valid image. Check the console logs for the full API response.",
             details: data
         }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error("Internal Server Error:", error);
    // Return error with 'message' field to match frontend expectations
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}