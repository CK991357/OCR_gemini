/**
 * @function onRequestPost
 * @description Cloudflare Pages Function for handling AI image editing requests.
 * It receives an image, a mask, and a prompt, then proxies the request
 * to the OpenRouter API using the Gemini Vision model.
 * This function is adapted from the existing openrouter.js proxy.
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
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured in environment variables" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKeys = apiKeysString.split(',').map(key => key.trim()).filter(key => key);
    
    if (apiKeys.length === 0) {
        return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY is configured but contains no valid keys." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    // Expecting a body with { image: "data:...", mask: "data:...", prompt: "..." }
    const requestBody = await request.json();
    const { image, mask, prompt } = requestBody;

    if (!image || !mask || !prompt) {
        return new Response(JSON.stringify({ error: "Request body must contain 'image', 'mask', and 'prompt'." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Construct the payload for OpenRouter's Gemini Vision model
    const openrouterPayload = {
      model: "google/gemini-2.5-flash-image-preview:free",
      messages: [{
        role: "user",
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: image } },
          { type: 'image_url', image_url: { url: mask } }
        ]
      }],
    };

    // Forward the request to the OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/10110531/ocr_gemini', // Generic Referer
        'X-Title': 'Gemini AI Editor'
      },
      body: JSON.stringify(openrouterPayload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API Error:", errorText);
        return new Response(JSON.stringify({ error: `OpenRouter API error: ${response.status} ${response.statusText}`, details: errorText }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const data = await response.json();
    
    // The response from Gemini might contain the generated image in the content
    // We will assume the response structure is similar to the other vision calls
    // and the new image will be in the first choice's message content.
    const messageContent = data.choices?.[0]?.message?.content;
    
    if (typeof messageContent === 'string' && messageContent.startsWith('data:image/')) {
       // If the content is a data URL, we assume this is the edited image.
       // We'll return it in a format the frontend expects.
       return new Response(JSON.stringify({ newImageUrl: messageContent }), {
           status: 200,
           headers: { 'Content-Type': 'application/json' }
       });
    } else {
        // If we don't get a data URL, return an error with the full response for debugging.
        console.error("OpenRouter Debug: No valid image data URL found in response.", JSON.stringify(data, null, 2));
        return new Response(JSON.stringify({
            error: "Model did not return a valid image. The response format might have changed.",
            details: data
        }), {
           status: 500,
           headers: { 'Content-Type': 'application/json' }
       });
    }

  } catch (error) {
    console.error("Internal Server Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}