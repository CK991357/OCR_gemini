/**
 * @function onRequestPost
 * @description Cloudflare Pages Function 的入口点，处理对 /api/siliconflow 的 POST 请求，并将其代理到 Siliconflow API。
 * @param {Object} context - 请求上下文对象，包含请求、环境变量等信息。
 * @param {Request} context.request - 传入的请求对象。
 * @param {Object} context.env - 环境变量对象，包含在 Cloudflare Pages 设置中配置的变量。
 * @returns {Promise<Response>} - 返回一个 Promise，解析为响应对象。
 */
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.SILICONFLOW_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Siliconflow API key not configured" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 获取原始请求体
    const payload = await request.json();
    
    // 转发请求到 Siliconflow API
    const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
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
