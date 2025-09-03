# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## High-Level Architecture and Structure

This repository contains a client-side web application that provides OCR (Optical Character Recognition) and Image Generation functionalities.

*   **`index.html`**: The main entry point, defining the user interface with distinct panels for OCR and Image Generation.
*   **`style.css`**: Provides the visual styling for the application.
*   **`script.js`**: Contains all client-side JavaScript logic, including:
    *   Handling user interactions (file uploads, button clicks, function switching).
    *   Processing image and PDF files for submission to backend services.
    *   Interacting with proxy API endpoints (`/api/gemini` and `/api/siliconflow`) for model inference.
    *   Displaying results to the user.
*   **`functions/`**: This directory contains backend proxy functions (e.g., serverless functions) that handle API requests from the frontend, manage API keys, and communicate with external AI services. For instance, `functions/api/openrouter.js` proxies requests to the OpenRouter API for the Gemini Vision model. Other files in this directory likely communicate with Gemini and Kolors/Siliconflow for image generation.
*   **`backup/`**: Contains backup files.

## Core Functionalities

1.  **OCR Text Recognition**: Extracts text content from uploaded images (JPG, PNG, WEBP) and PDF files. This functionality leverages the Gemini Vision model, often proxied via services like OpenRouter (e.g., `google/gemini-2.5-flasha_image-preview:free`).
2.  **Image Content Description**: Analyzes uploaded images to provide detailed descriptions and generates Comfy UI prompt templates (English and Chinese).
3.  **Image Generation**: Generates images based on text prompts and various parameters (image size, batch size, inference steps, guidance scale, seed). Supports image-to-image generation. This feature uses the Kolors/Siliconflow model.
4.  **Prompt Expansion**: Leverages the Gemini model to expand concise image generation prompts into more detailed descriptions.

## Development Commands

Since this is a client-side application primarily, local development typically involves serving the files via a simple web server or opening `index.html` directly in a browser.

*   **To run the application locally**: Open `index.html` in a web browser. If a local server is required (e.g., for proxy API calls), you would typically use a command like `npx http-server` or set up a local Node.js server to handle the `/api/` endpoints.
*   **To lint/format code**: (No explicit configuration found. Assume standard JavaScript/CSS linters/formatters like ESLint, Prettier if configured in a `package.json`.)
*   **To run tests**: (No explicit testing framework or scripts found. Tests would typically involve a browser-based testing framework like Jest with JSDOM or Playwright for end-to-end tests if implemented.)

**Important Notes:**

*   API key management for Gemini and Kolors/Siliconflow models is handled by backend proxy services, abstracting them from the frontend.
*   PDF processing on the client-side uses `pdf.js` to render each page as an image before sending it for OCR.