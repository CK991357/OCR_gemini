// api.js: Handles communication with the backend image editing API.

/**
 * Sends the image, mask, and a composite prompt to the backend for editing.
 * This is a stable function expecting all three parts for a standard editing task.
 * @param {string} prompt - The composite user and system prompt.
 * @param {string} imageDataUrl - The base64 data URL of the original image.
 * @param {string} maskDataUrl - The base64 data URL of the user-drawn mask.
 * @returns {Promise<object>} A promise that resolves with the server's response.
 */
export async function sendEditRequest(prompt, imageDataUrl, maskDataUrl) {
    const apiEndpoint = '/api/gemini'; // 修正：指向统一的Gemini代理

    const parts = [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageDataUrl } },
        { type: 'image_url', image_url: { url: maskDataUrl } }
    ];

    // 为Gemini Worker构建正确的请求体
    const requestBody = {
        model: "gemini-2.5-flash-image-preview",
        messages: [
            {
                role: "user",
                content: parts
            }
        ]
    };

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody), // 使用为Gemini构建的新请求体
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending edit request:', error);
        throw error; // Re-throw the error to be handled by the caller
    }
}