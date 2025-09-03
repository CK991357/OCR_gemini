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
                const errorText = await openrouterResponse.text();
                return new Response(JSON.stringify({ error: `OpenRouter API error: ${openrouterResponse.status} - ${errorText}` }), {
                    status: openrouterResponse.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const responseData = await openrouterResponse.json();
            return new Response(JSON.stringify(responseData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error("Error proxying OpenRouter API:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }
};