// api.js: Handles communication with the backend image editing API.

/**
 * Sends the image, mask, and prompt to the backend for processing.
 * @param {string} imageDataUrl - The base64 data URL of the original image.
 * @param {string} maskDataUrl - The base64 data URL of the user-drawn mask.
 * @param {string} prompt - The user's text instruction for the edit.
 * @returns {Promise<object>} A promise that resolves with the server's response.
 */
export async function sendEditRequest(imageDataUrl, maskDataUrl, prompt) {
    // This is a placeholder for the actual backend endpoint.
    const apiEndpoint = '/api/image-edit'; 

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageDataUrl,
                mask: maskDataUrl,
                prompt: prompt,
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