// api.js: Handles communication with the backend image editing API.

/**
 * Dynamically sends a prompt and optional images to the backend.
 * Supports text-only, text+image, and text+image+mask combinations.
 * @param {string} prompt - The user's text instruction for the edit.
 * @param {string|null} [imageDataUrl=null] - The base64 data URL of the original image.
 * @param {string|null} [maskDataUrl=null] - The base64 data URL of the user-drawn mask.
 * @returns {Promise<object>} A promise that resolves with the server's response.
 */
export async function sendEditRequest(prompt, imageDataUrl = null, maskDataUrl = null) {
    const apiEndpoint = '/api/image-edit';

    const parts = [{ type: 'text', text: prompt }];

    if (imageDataUrl) {
        parts.push({ type: 'image_url', image_url: { url: imageDataUrl } });
    }
    if (maskDataUrl) {
        parts.push({ type: 'image_url', image_url: { url: maskDataUrl } });
    }

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: {
                    parts: parts
                }
            }),
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