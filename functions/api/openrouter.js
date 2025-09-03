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
    const apiKeysString = env.OPENROUTER_API_KEY;

    if (!apiKeysString) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured in environment variables" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Split the string into an array of keys, filter out any empty strings, and trim whitespace
    const apiKeys = apiKeysString.split(',').map(key => key.trim()).filter(key => key);
    
    if (apiKeys.length === 0) {
        return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY is configured but contains no valid keys." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Select a random key from the array
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const requestBody = await request.json(); // 获取整个请求体
    const { contents } = requestBody;

    if (!contents || !contents.parts || !Array.isArray(contents.parts) || contents.parts.length === 0) {
        return new Response(JSON.stringify({ error: "Request body must contain 'contents.parts' array." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 检查是否存在至少一个文本部分
    const hasTextPart = contents.parts.some(part => part.type === 'text' && part.text && part.text.trim() !== '');
    if (!hasTextPart) {
        return new Response(JSON.stringify({ error: "At least one non-empty text part is required in 'contents.parts'." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 检查图片部分是否为有效的base64数据URL
    const invalidImagePart = contents.parts.find(part =>
        part.type === 'image_url' && (typeof part.image_url?.url !== 'string' || !part.image_url.url.startsWith('data:image/'))
    );
    if (invalidImagePart) {
        return new Response(JSON.stringify({ error: "All image_url parts must contain valid base64 data URLs." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 直接使用前端传递的 contents.parts 结构
    const openrouterPayload = {
      model: "google/gemini-2.5-flash-image-preview:free",
      messages: [{
        role: "user",
        content: contents.parts
      }],
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