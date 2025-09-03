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
                const errorData = await openrouterResponse.text(); // 尝试获取原始错误文本
                // 尝试解析为JSON，如果失败则直接返回文本
                let errorMessage = errorData;
                try {
                    const parsedError = JSON.parse(errorData);
                    errorMessage = parsedError.error || JSON.stringify(parsedError);
                } catch (jsonError) {
                    // 如果不是有效的JSON，则保持为原始文本
                }
                return new Response(JSON.stringify({ error: `OpenRouter API error: ${openrouterResponse.status} - ${errorMessage}` }), {
                    status: openrouterResponse.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            let responseData;
            const contentType = openrouterResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await openrouterResponse.json();
            } else {
                responseData = await openrouterResponse.text(); // 如果不是JSON，则作为文本处理
                // 如果是文本，可以将其包装成一个JSON对象，以便前端统一处理
                responseData = { content: responseData };
            }
            
            return new Response(JSON.stringify(responseData), {
                status: openrouterResponse.status, // 使用OpenRouter的原始状态码
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error("Error proxying OpenRouter API:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }
};