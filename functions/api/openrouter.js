export default {
    async fetch(request, env) {
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405 });
        }

        const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) {
            return new Response('OPENROUTER_API_KEY not configured', { status: 500 });
        }

        try {
            const requestBody = await request.json();

            const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": request.headers.get("HTTP-Referer") || "https://your-site-url.com", // Optional. Site URL for rankings on openrouter.ai.
                    "X-Title": request.headers.get("X-Title") || "OCR Gemini Tool" // Optional. Site title for rankings on openrouter.ai.
                },
                body: JSON.stringify(requestBody)
            });

            if (!openrouterResponse.ok) {
                let errorDetails = await openrouterResponse.text(); // 获取原始响应文本
                try {
                    const parsed = JSON.parse(errorDetails);
                    errorDetails = parsed.error || JSON.stringify(parsed);
                } catch (e) {
                    // Not JSON, use as is
                }
                return new Response(JSON.stringify({
                    error: `OpenRouter API error: ${openrouterResponse.status} ${openrouterResponse.statusText}`,
                    details: errorDetails
                }), {
                    status: openrouterResponse.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const rawResponseText = await openrouterResponse.text(); // 先获取原始响应文本
            let responseData;
            try {
                responseData = JSON.parse(rawResponseText);
            } catch (e) {
                // 如果不是有效的JSON，就将整个响应作为内容返回
                responseData = { content: rawResponseText };
            }
            
            return new Response(JSON.stringify(responseData), {
                status: openrouterResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error("Error proxying OpenRouter API:", error.message, error.stack);
            return new Response(JSON.stringify({ error: `Internal Worker error: ${error.message}`, details: error.stack }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};