// canvas.js: Handles all Konva.js canvas interactions.

let stage;
let imageLayer;
let maskLayer; // Layer for the mask
let imageNode;
let currentTool = 'brush'; // 'brush' or 'eraser'
let brushSize = 30;
let isDrawing = false;
let lastLine;

/**
 * Initializes the Konva stage and main image layer.
 * @param {string} containerId - The ID of the container div for the stage.
 */
export function initCanvas(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Canvas container not found!');
        return;
    }

    stage = new Konva.Stage({
        container: containerId,
        width: container.offsetWidth,
        height: container.offsetHeight,
    });

    imageLayer = new Konva.Layer();
    maskLayer = new Konva.Layer({
        opacity: 0.5, // Make mask semi-transparent
    });
    stage.add(imageLayer, maskLayer);

    // Handle window resizing
    window.addEventListener('resize', () => {
        stage.width(container.offsetWidth);
        stage.height(container.offsetHeight);
        centerImage();
    });

    setupDrawingEventListeners();
}

/**
 * Sets up mouse event listeners for drawing on the mask layer.
 */
function setupDrawingEventListeners() {
    stage.on('mousedown.drawing', (e) => {
        if (!imageNode) return; // Don't draw if no image is loaded
        isDrawing = true;
        const pos = stage.getRelativePointerPosition();
        
        lastLine = new Konva.Line({
            stroke: '#ff0000', // Red color for the mask
            strokeWidth: brushSize,
            globalCompositeOperation:
                currentTool === 'brush' ? 'source-over' : 'destination-out',
            lineCap: 'round',
            lineJoin: 'round',
            points: [pos.x, pos.y, pos.x, pos.y],
        });
        maskLayer.add(lastLine);
    });

    stage.on('mousemove.drawing', (e) => {
        if (!isDrawing) {
            return;
        }
        const pos = stage.getRelativePointerPosition();
        let newPoints = lastLine.points().concat([pos.x, pos.y]);
        lastLine.points(newPoints);
        maskLayer.batchDraw();
    });

    stage.on('mouseup.drawing touchend.drawing', () => {
        isDrawing = false;
    });
}

/**
 * Loads an image onto the canvas, fits it to the container, and centers it.
 * @param {string} imageUrl - The URL of the image to load.
 */
export function loadImage(imageUrl) {
    const imageObj = new Image();
    imageObj.onload = () => {
        // Remove previous image if it exists
        if (imageNode) {
            imageNode.destroy();
        }

        imageNode = new Konva.Image({
            image: imageObj,
            draggable: true, // Allow panning
        });

        imageLayer.add(imageNode);
        centerImage();
        setupZoom();
    };
    imageObj.src = imageUrl;
}

/**
 * Centers the imageNode within the stage.
 */
function centerImage() {
    if (!imageNode || !stage) return;

    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const imageWidth = imageNode.width();
    const imageHeight = imageNode.height();

    // Scale image to fit within the stage while maintaining aspect ratio
    const scale = Math.min(stageWidth / imageWidth, stageHeight / imageHeight) * 0.95; // 95% padding
    
    imageNode.scale({ x: scale, y: scale });
    
    const newWidth = imageWidth * scale;
    const newHeight = imageHeight * scale;

    imageNode.position({
        x: (stageWidth - newWidth) / 2,
        y: (stageHeight - newHeight) / 2,
    });

    imageLayer.batchDraw();
}

/**
 * Sets up wheel event for zooming on the stage.
 */
function setupZoom() {
    if (!stage) return;
    const scaleBy = 1.1;
    stage.off('wheel'); // Prevent duplicate event listeners
    stage.on('wheel', (e) => {
        e.evt.preventDefault();

        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        let direction = e.evt.deltaY > 0 ? -1 : 1;
        
        const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        
        stage.scale({ x: newScale, y: newScale });
        
        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };
        stage.position(newPos);
        stage.batchDraw();
    });
}

/**
 * Sets the current drawing tool.
 * @param {string} tool - The tool to use ('brush' or 'eraser').
 */
export function setTool(tool) {
    currentTool = tool;
}

/**
 * Sets the size of the brush or eraser.
 * @param {number} size - The new brush size.
 */
export function setBrushSize(size) {
    brushSize = size;
}

/**
 * Clears both the image and mask layers.
 */
export function clearCanvas() {
    imageLayer.destroyChildren();
    maskLayer.destroyChildren();
    imageNode = null;
    imageLayer.draw();
    maskLayer.draw();
}

/**
 * Clears only the mask layer.
 */
export function clearMaskLayer() {
    maskLayer.destroyChildren();
    maskLayer.draw();
}

/**
 * Exports the image and mask layers as Base64 data URLs.
 * Hides the mask temporarily to export the original image cleanly.
 * @returns {Promise<{image: string, mask: string}>} A promise that resolves with the data URLs.
 */
export async function exportLayersAsDataURL() {
    if (!imageNode) {
        throw new Error("Cannot export: No image loaded.");
    }

    // --- Save and Reset Stage Transformations ---
    const oldScale = stage.scaleX();
    const oldPos = stage.position();
    
    // Reset transformations to ensure the export is not affected by zoom/pan
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();

    // --- Export Mask ---
    maskLayer.show();
    const originalOpacity = maskLayer.opacity();
    maskLayer.opacity(1);
    maskLayer.draw();
    const maskDataURL = maskLayer.toDataURL();
    maskLayer.opacity(originalOpacity);
    maskLayer.draw();

    // --- Export Image ---
    maskLayer.hide();
    imageLayer.draw(); // Ensure image is visible
    const imageDataURL = imageLayer.toDataURL();
    maskLayer.show();
    
    // --- Restore Stage Transformations ---
    stage.scale({ x: oldScale, y: oldScale });
    stage.position(oldPos);
    stage.batchDraw();

    return {
        image: imageDataURL,
        mask: maskDataURL,
    };
}