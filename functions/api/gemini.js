/**
 * @function onRequestPost
 * @description Cloudflare Pages Function 的入口点，处理对 /api/gemini 的 POST 请求，并将其代理到 Gemini API。
 * @param {Object} context - 请求上下文对象，包含请求、环境变量等信息。
 * @param {Request} context.request - 传入的请求对象。
 * @param {Object} context.env - 环境变量对象，包含在 Cloudflare Pages 设置中配置的变量。
 * @returns {Promise<Response>} - 返回一个 Promise，解析为响应对象。
 */
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const authKey = env.AUTH_KEY;
    
    if (!authKey) {
      return new Response(JSON.stringify({ error: "AUTH_KEY not configured in Cloudflare environment" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 获取原始请求体
    const body = await request.text();
    
    // 准备新的请求头，并转发到新的 worker 端点
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${authKey}`);
    
    const response = await fetch(`https://geminiapim.10110531.xyz/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: body
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
