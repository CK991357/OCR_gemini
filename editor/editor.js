// editor.js: AI Image Editor main logic
import { sendEditRequest } from './api.js';
import {
    clearCanvas as clearCanvasArtboard,
    clearMaskLayer,
    exportImageLayerAsDataURL,
    exportLayersAsDataURL,
    initCanvas,
    loadImage,
    setBrushSize,
    setTool
} from './canvas.js';

let isEditorCanvasInitialized = false; // 新增标志位

/**
 * Initializes the editor module when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const editImageDropArea = document.getElementById('editImageDropArea');
    const editFileInput = document.getElementById('editFileInput');
    const editImageFileInfo = document.getElementById('editImageFileInfo');
    const editImagePreview = document.getElementById('editImagePreview');
    const editClearImageBtn = document.getElementById('editClearImageBtn');
    const applyEditBtn = document.getElementById('applyEditBtn');
    const brushToolBtn = document.getElementById('brushTool');
    const eraserToolBtn = document.getElementById('eraserTool');
    const brushSizeSlider = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');
    const clearCanvasBtn = document.getElementById('resetCanvasBtn');
    const editPromptInput = document.getElementById('editPrompt');
    const saveEditBtn = document.getElementById('saveEditBtn'); // Save button
    
    let selectedFile = null;

    /**
     * Main initialization function.
     * 负责设置事件监听器和初始UI状态，但不初始化画布。
     */
    function init() {
        console.log("Initializing AI Image Editor UI..."); // 修改日志
        setupEventListeners();
        updateApplyButtonState();
        setToolbarDisabled(true);
    }

    /**
     * Sets up all necessary event listeners for the editor UI.
     */
    function setupEventListeners() {
        // --- File Upload Listeners ---
        editImageDropArea.addEventListener('click', () => editFileInput.click());
        editFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        // Drag and Drop Listeners
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            editImageDropArea.addEventListener(eventName, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            editImageDropArea.addEventListener(eventName, () => editImageDropArea.classList.add('highlight'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            editImageDropArea.addEventListener(eventName, () => editImageDropArea.classList.remove('highlight'), false);
        });
        editImageDropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            handleFile(file);
        }, false);

        // Clear Image Button
        editClearImageBtn.addEventListener('click', clearImage);

        // --- Canvas Tool Listeners ---
        brushToolBtn.addEventListener('click', () => {
            setTool('brush');
            brushToolBtn.classList.add('active');
            eraserToolBtn.classList.remove('active');
        });

        eraserToolBtn.addEventListener('click', () => {
            setTool('eraser');
            eraserToolBtn.classList.add('active');
            brushToolBtn.classList.remove('active');
        });

        brushSizeSlider.addEventListener('input', (e) => {
            const newSize = parseInt(e.target.value, 10);
            setBrushSize(newSize);
            brushSizeValue.textContent = newSize;
        });
        
        clearCanvasBtn.addEventListener('click', () => {
             // This only clears the mask layer, preserving the original image
             clearMaskLayer();
        });

        // --- Apply Edit Button ---
        applyEditBtn.addEventListener('click', handleApplyEdit);
        editPromptInput.addEventListener('input', updateApplyButtonState);

       // --- Save Image Button Listener ---
       saveEditBtn.addEventListener('click', async () => {
           try {
               const imageDataURL = await exportImageLayerAsDataURL();
               const link = document.createElement('a');
               link.href = imageDataURL;
               link.download = `edited-image-${Date.now()}.png`;
               document.body.appendChild(link);
               link.click();
               document.body.removeChild(link);
           } catch (error) {
               console.error('Failed to export and save image:', error);
               alert(`保存图片失败: ${error.message}`);
           }
       });
    }

    /**
     * Handles the selected file for editing.
     * @param {File} file 
     */
    async function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('请上传有效的图片文件 (JPG, PNG, WEBP)');
            return;
        }
        selectedFile = file;

        // Display file info and small preview
        editImageFileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
        const imageUrl = await fileToBase64(file);
        editImagePreview.src = imageUrl;
        editImagePreview.style.display = 'block';
        editClearImageBtn.style.display = 'block';
        
        // Load the image onto the main canvas
        loadImage(imageUrl);
        
        updateApplyButtonState();
        setToolbarDisabled(false);
    }
    
    /**
     * Clears the selected image and resets the UI and canvas.
     */
    function clearImage() {
        selectedFile = null;
        editFileInput.value = ''; // Reset file input
        editImageFileInfo.textContent = '未选择图片';
        editImagePreview.src = '';
        editImagePreview.style.display = 'none';
        editClearImageBtn.style.display = 'none';
        
        clearCanvasArtboard();

        updateApplyButtonState();
        setToolbarDisabled(true);
        saveEditBtn.style.display = 'none'; // Hide save button when clearing
    }

    /**
     * Updates the disabled state of the "Apply Edit" button.
     */
    function updateApplyButtonState() {
        const prompt = editPromptInput.value.trim();
        applyEditBtn.disabled = !selectedFile || prompt.length === 0;
    }

    /**
     * Handles the main edit action when the "Apply Edit" button is clicked.
     */
    async function handleApplyEdit() {
        const userPrompt = editPromptInput.value.trim();
        if (!userPrompt) {
            alert('请输入您的编辑指令。');
            return;
        }

        // This is the "magic instruction" that teaches the model how to use the mask.
        const magicInstruction = "\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges.";
        const finalPrompt = userPrompt + magicInstruction;
        
        console.log('Applying edit with composite prompt:', finalPrompt);
        
        applyEditBtn.disabled = true;
        applyEditBtn.textContent = '正在处理...';

        try {
            const { image: imageDataUrl, mask: maskDataUrl } = await exportLayersAsDataURL();
            
            const result = await sendEditRequest(finalPrompt, imageDataUrl, maskDataUrl);

            if (result && result.data) {
                console.log('Received new image from backend.');
                // The backend sends a new image URL, which we load onto the canvas
                await loadImage(result.data);
                // We should also clear the old mask
                clearMaskLayer(); // Only clear the mask, not the new image
                saveEditBtn.style.display = 'block'; // Show the save button
            } else {
                throw new Error('Backend did not return a new image.');
            }

        } catch (error) {
            console.error('Failed to apply edit:', error);
            alert(`编辑失败: ${error.message}`);
        } finally {
            // TODO: Hide the loading indicator
            applyEditBtn.disabled = false;
            applyEditBtn.textContent = '应用编辑';
        }
    }

    /**
     * Enables or disables the editing toolbar.
     * @param {boolean} disabled - True to disable, false to enable.
     */
    function setToolbarDisabled(disabled) {
        brushToolBtn.disabled = disabled;
        eraserToolBtn.disabled = disabled;
        brushSizeSlider.disabled = disabled;
        clearCanvasBtn.disabled = disabled;
    }

    // --- Helper Functions ---
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // --- Start the editor ---
    init();
});

/**
 * 初始化编辑器画布。
 * 确保在画布容器可见且具有正确尺寸后调用。
 * @returns {void}
 */
export function initializeEditorCanvas() {
    if (!isEditorCanvasInitialized) {
        console.log("Initializing Konva.js Canvas...");
        initCanvas('canvasContainer');
        isEditorCanvasInitialized = true;
    }
}
