// canvas.js: Handles all Konva.js canvas interactions.

let stage;
let imageLayer;
let maskLayer; // Layer for the mask
let imageNode;
let currentTool = 'brush'; // 'brush' or 'eraser'
let brushSize = 30;
let isDrawing = false;
let lastLine;
let lastDist = 0; // 用于双指缩放，记录上次两指距离
let lastCenter = null; // 用于双指缩放，记录上次两指中心点
let isTwoFinger = false; // 标记是否为双指手势

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

   // Prevent scrolling on mobile when drawing on canvas
   // 这里的 preventDefault 可能会与双指缩放冲突，需要更精细的控制
   container.addEventListener('touchmove', (e) => {
       // Only prevent default if the target is the canvas itself, not other UI elements
       if (e.target.tagName === 'CANVAS') {
           e.preventDefault();
       }
   }, { passive: false });

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
        if (!imageNode || isTwoFinger) return; // 不在双指手势时才绘图
        isDrawing = true;
        const pos = stage.getRelativePointerPosition();
        
        lastLine = new Konva.Line({
            stroke: '#ffffff', // White color for the mask, as required by the prompt
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
        if (!isDrawing || isTwoFinger) {
            return;
        }
        const pos = stage.getRelativePointerPosition();
        let newPoints = lastLine.points().concat([pos.x, pos.y]);
        lastLine.points(newPoints);
        maskLayer.batchDraw();
    });

    stage.on('mouseup.drawing', () => {
        isDrawing = false;
    });

    // Touch event listeners for drawing and pinch-to-zoom
    stage.on('touchstart.drawing', (e) => {
        const touches = e.evt.touches;
        if (touches.length === 2) {
            isTwoFinger = true;
            lastDist = getDistance(touches[0], touches[1]);
            lastCenter = getCenter(touches[0], touches[1]);
            e.evt.preventDefault(); // 阻止默认的滚动行为
        } else if (touches.length === 1 && !isTwoFinger && imageNode) {
            isDrawing = true;
            const pos = stage.getRelativePointerPosition();
            lastLine = new Konva.Line({
                stroke: '#ffffff',
                strokeWidth: brushSize,
                globalCompositeOperation:
                    currentTool === 'brush' ? 'source-over' : 'destination-out',
                lineCap: 'round',
                lineJoin: 'round',
                points: [pos.x, pos.y, pos.x, pos.y],
            });
            maskLayer.add(lastLine);
            e.evt.preventDefault(); // 阻止默认的滚动行为
        }
    });

    stage.on('touchmove.drawing', (e) => {
        const touches = e.evt.touches;
        if (isTwoFinger && touches.length === 2) {
            const currentDist = getDistance(touches[0], touches[1]);
            const currentCenter = getCenter(touches[0], touches[1]);

            const scale = currentDist / lastDist;
            const oldScale = stage.scaleX();
            const newScale = oldScale * scale;

            const dx = currentCenter.x - lastCenter.x;
            const dy = currentCenter.y - lastCenter.y;

            const stageX = stage.x();
            const stageY = stage.y();

            stage.scale({ x: newScale, y: newScale });
            stage.position({
                x: currentCenter.x - ((currentCenter.x - stageX) / oldScale) * newScale,
                y: currentCenter.y - ((currentCenter.y - stageY) / oldScale) * newScale,
            });

            lastDist = currentDist;
            lastCenter = currentCenter;
            stage.batchDraw();
            e.evt.preventDefault(); // 阻止默认的滚动行为
        } else if (isDrawing && touches.length === 1 && !isTwoFinger) {
            const pos = stage.getRelativePointerPosition();
            let newPoints = lastLine.points().concat([pos.x, pos.y]);
            lastLine.points(newPoints);
            maskLayer.batchDraw();
            e.evt.preventDefault(); // 阻止默认的滚动行为
        }
    });

    stage.on('touchend.drawing', (e) => {
        isDrawing = false;
        isTwoFinger = false;
        lastDist = 0;
        lastCenter = null;
    });
}

/**
 * Calculates the distance between two touch points.
 * @param {Touch} touch1 - The first touch object.
 * @param {Touch} touch2 - The second touch object.
 * @returns {number} The distance between the two touch points.
 */
function getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the center point between two touch points.
 * @param {Touch} touch1 - The first touch object.
 * @param {Touch} touch2 - The second touch object.
 * @returns {{x: number, y: number}} The center point coordinates.
 */
function getCenter(touch1, touch2) {
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
    };
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
            draggable: false, // Prevent panning the image itself
            listening: false, // Pass events through to the stage for drawing
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
    // Add a black background for the mask export
    const bg = new Konva.Rect({
        width: stage.width(),
        height: stage.height(),
        fill: 'black',
    });
    maskLayer.add(bg);
    bg.zIndex(0); // Ensure it's at the bottom
    maskLayer.batchDraw();

    const clipRegion = {
        x: imageNode.x(),
        y: imageNode.y(),
        width: imageNode.width() * imageNode.scaleX(),
        height: imageNode.height() * imageNode.scaleY(),
    };

    const maskDataURL = maskLayer.toDataURL(clipRegion);

    // Clean up the temporary background
    bg.destroy();
    maskLayer.opacity(originalOpacity);
    maskLayer.batchDraw();

    // --- Export Image ---
    maskLayer.hide();
    imageLayer.draw(); // Ensure image is visible
    const imageDataURL = imageLayer.toDataURL(clipRegion);
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

/**
 * Exports only the image layer as a Base64 data URL.
 * This is useful for saving the final image without the mask.
 * @returns {Promise<string>} A promise that resolves with the image data URL.
 */
export async function exportImageLayerAsDataURL() {
    if (!imageNode) {
        throw new Error("Cannot export: No image loaded.");
    }

    // --- Save and Reset Stage Transformations ---
    const oldScale = stage.scaleX();
    const oldPos = stage.position();
    
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();

    // --- Export Image Layer ---
    maskLayer.hide(); // Hide mask to ensure a clean export
    // By exporting the layer and providing a clip region, we ensure that only the
    // image is captured, without any extra space from the stage background.
    const imageDataURL = imageLayer.toDataURL({
        x: imageNode.x(),
        y: imageNode.y(),
        width: imageNode.width() * imageNode.scaleX(),
        height: imageNode.height() * imageNode.scaleY(),
        pixelRatio: 2 // Export at higher resolution
    });
    maskLayer.show();
    
    // --- Restore Stage Transformations ---
    stage.scale({ x: oldScale, y: oldScale });
    stage.position(oldPos);
    stage.batchDraw();

    return imageDataURL;
}
