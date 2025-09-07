// 设置PDF.js worker路径
import { initializeEditorCanvas } from './editor/editor.js'; // 导入AI智能编辑画布初始化函数

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', function() {
    // OCR功能相关元素
    const ocrPanel = document.getElementById('ocrPanel'); // OCR面板
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const imagePreview = document.getElementById('imagePreview');
    const pdfPreview = document.getElementById('pdfPreview');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loadingText');
    const resultContent = document.getElementById('resultContent');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const ocrMode = document.getElementById('ocrMode');
    const descMode = document.getElementById('descMode');
    
    // 图像生成功能相关元素
    const imageGenerationPanel = document.getElementById('imageGenerationPanel'); // 图像生成面板
    const ocrFunctionBtn = document.getElementById('ocrFunction'); // OCR功能切换按钮
    const imageGenerationFunctionBtn = document.getElementById('imageGenerationFunction'); // 图像生成功能切换按钮
    
    // AI智能编辑功能相关元素
    const imageEditPanel = document.getElementById('imageEditPanel'); // AI智能编辑面板
    const imageEditFunctionBtn = document.getElementById('imageEditFunction'); // AI智能编辑功能切换按钮
    const imageGenPromptInput = document.getElementById('imageGenPrompt');
    const imageGenNegativePromptInput = document.getElementById('imageGenNegativePrompt');
    const imageGenImageSizeSelect = document.getElementById('imageGenImageSize');
    const imageGenBatchSizeInput = document.getElementById('imageGenBatchSize');
    const imageGenBatchSizeValueSpan = document.getElementById('imageGenBatchSizeValue');
    const imageGenNumInferenceStepsInput = document.getElementById('imageGenNumInferenceSteps');
    const imageGenNumInferenceStepsValueSpan = document.getElementById('imageGenNumInferenceStepsValue');
    const imageGenGuidanceScaleInput = document.getElementById('imageGenGuidanceScale');
    const imageGenGuidanceScaleValueSpan = document.getElementById('imageGenGuidanceScaleValue');
    const imageGenSeedInput = document.getElementById('imageGenSeed');
    const generateImageBtn = document.getElementById('generateImageBtn');
    const imageGenerationLoading = document.getElementById('imageGenerationLoading');
    const imageGenerationLoadingText = document.getElementById('imageGenerationLoadingText');
    const imageGenerationError = document.getElementById('imageGenerationError');
    const imageResultsDiv = document.getElementById('imageResults');
    const expandPromptButton = document.getElementById('expandPromptButton');

    // 新增图生图相关元素
    const kolorsImageDropArea = document.getElementById('kolorsImageDropArea');
    const imageGenFileInput = document.getElementById('imageGenFileInput');
    const imageGenFileInfo = document.getElementById('imageGenFileInfo');
    const imageGenImagePreview = document.getElementById('imageGenImagePreview');
    const imageGenClearImageBtn = document.getElementById('imageGenClearImageBtn');

    // 新增模型切换和Gemini相关元素
    const imageGenModelSelect = document.getElementById('imageGenModelSelect');
    const kolorsParamsContainer = document.getElementById('kolorsParamsContainer');
    const geminiParamsContainer = document.getElementById('geminiParamsContainer');
    const geminiImageDropArea = document.getElementById('geminiImageDropArea');
    const geminiImageUploadInput = document.getElementById('geminiImageUploadInput');
    const geminiThumbnailsContainer = document.getElementById('geminiThumbnailsContainer');


    let selectedFile = null;
    let pdfDoc = null;
    let pageImages = []; // 用于存储PDF每页的Base64图片数据
    let currentFunction = 'ocr'; // 默认功能为OCR
    let imageGenSourceImageBase64 = null; // 用于存储图生图的Base64图片数据
    let geminiSelectedFiles = []; // 用于存储Gemini多图上传的文件

    // 初始化功能面板显示
    ocrPanel.style.display = 'grid';
    imageGenerationPanel.style.display = 'none';
    imageEditPanel.style.display = 'none'; // 新增
    updateOcrButtonState(); // 更新OCR分析按钮状态
    // updateImageGenButtonState(); // 更新图像生成按钮状态 - 移除，因为不再需要API Key检查

    // 功能切换事件监听
    ocrFunctionBtn.addEventListener('click', () => {
        switchFunction('ocr');
    });

    imageGenerationFunctionBtn.addEventListener('click', () => {
        switchFunction('imageGen');
    });

    imageEditFunctionBtn.addEventListener('click', () => {
        switchFunction('imageEdit');
    });

    function switchFunction(functionName) {
        currentFunction = functionName;

        // 更新按钮状态
        ocrFunctionBtn.classList.toggle('active', functionName === 'ocr');
        imageGenerationFunctionBtn.classList.toggle('active', functionName === 'imageGen');
        imageEditFunctionBtn.classList.toggle('active', functionName === 'imageEdit');

        // 更新面板可见性
        ocrPanel.style.display = functionName === 'ocr' ? 'grid' : 'none';
        imageGenerationPanel.style.display = functionName === 'imageGen' ? 'grid' : 'none';
        imageEditPanel.style.display = functionName === 'imageEdit' ? 'grid' : 'none';

        // 如果切换到AI智能编辑功能，则初始化画布
        if (functionName === 'imageEdit' && imageEditPanel.style.display === 'grid') {
            initializeEditorCanvas();
        }

        // 更新相关按钮状态
        updateOcrButtonState();
        // updateImageGenButtonState(); // 如果有的话
    }

    // 模型选择器事件监听
    imageGenModelSelect.addEventListener('change', () => {
        const selectedModel = imageGenModelSelect.value;
        if (selectedModel === 'kolors') {
            kolorsParamsContainer.style.display = 'block';
            geminiParamsContainer.style.display = 'none';
            // 切换时显示Kolors的图生图上传区域
            document.querySelector('.param-group label[for="imageGenFileInput"]').parentElement.style.display = 'block';
        } else if (selectedModel === 'gemini-2.5-flash-image-preview') {
            kolorsParamsContainer.style.display = 'none';
            geminiParamsContainer.style.display = 'block';
            // 切换到Gemini时隐藏Kolors的图生图上传区域
            document.querySelector('.param-group label[for="imageGenFileInput"]').parentElement.style.display = 'none';
        }
    });
    
    // 页面加载时，手动触发一次模型选择器的change事件，以确保UI与默认模型同步
    imageGenModelSelect.dispatchEvent(new Event('change'));

    // OCR模式切换 (保留原有逻辑)
    let currentMode = 'ocr'; // 默认模式为OCR
    ocrMode.addEventListener('click', () => {
        ocrMode.classList.add('active');
        descMode.classList.remove('active');
        currentMode = 'ocr';
        updateAnalyzeButtonText();
    });
    
    descMode.addEventListener('click', () => {
        descMode.classList.add('active');
        ocrMode.classList.remove('active');
        currentMode = 'description';
        updateAnalyzeButtonText();
    });
    
    /**
     * @function updateAnalyzeButtonText
     * @description 根据当前OCR模式更新分析按钮的文本和图标。
     * @returns {void}
     */
    function updateAnalyzeButtonText() {
        analyzeBtn.innerHTML = currentMode === 'ocr' ? 
            '<i class="fas fa-search"></i> 提取文本内容' : 
            '<i class="fas fa-image"></i> 分析图片内容';
    }

    /**
     * @function updateOcrButtonState
     * @description 根据当前功能模式和文件选择状态更新OCR分析按钮的禁用状态。
     * @returns {void}
     */
    function updateOcrButtonState() {
        analyzeBtn.disabled = !(selectedFile && currentFunction === 'ocr');
    }

    /**
     * @function updateImageGenButtonState
     * @description 根据当前功能模式和提示词状态更新图像生成按钮的禁用状态。
     * @returns {void}
     */
    function updateImageGenButtonState() {
        generateImageBtn.disabled = !(imageGenPromptInput.value.trim() !== '' && currentFunction === 'imageGen');
    }
    
    // OCR文件上传区域事件监听
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 图像生成文件上传区域事件监听
    kolorsImageDropArea.addEventListener('click', () => {
        imageGenFileInput.click();
    });

    // 处理拖放事件的通用函数
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        kolorsImageDropArea.addEventListener(eventName, preventDefaults, false);
        geminiImageDropArea.addEventListener(eventName, preventDefaults, false); // 新增
    });
    
    /**
     * @function preventDefaults
     * @description 阻止默认事件和事件冒泡。
     * @param {Event} e - 事件对象。
     * @returns {void}
     */
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 高亮和恢复上传区域样式的通用函数
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
        kolorsImageDropArea.addEventListener(eventName, highlightImageGen, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
        kolorsImageDropArea.addEventListener(eventName, unhighlightImageGen, false);
    });
    
    /**
     * @function highlight
     * @description 高亮OCR上传区域的样式。
     * @returns {void}
     */
    function highlight() {
        dropArea.style.backgroundColor = 'rgba(66, 133, 244, 0.15)';
        dropArea.style.borderColor = '#1a73e8';
    }
    
    /**
     * @function unhighlight
     * @description 恢复OCR上传区域的默认样式。
     * @returns {void}
     */
    function unhighlight() {
        dropArea.style.backgroundColor = 'rgba(66, 133, 244, 0.05)';
        dropArea.style.borderColor = '#4285f4';
    }

    /**
     * @function highlightImageGen
     * @description 高亮图像生成上传区域的样式。
     * @returns {void}
     */
    function highlightImageGen() {
        imageGenDropArea.style.backgroundColor = 'rgba(66, 133, 244, 0.15)';
        imageGenDropArea.style.borderColor = '#1a73e8';
    }
    
    /**
     * @function unhighlightImageGen
     * @description 恢复图像生成上传区域的默认样式。
     * @returns {void}
     */
    function unhighlightImageGen() {
        imageGenDropArea.style.backgroundColor = 'rgba(66, 133, 244, 0.05)';
        imageGenDropArea.style.borderColor = '#4285f4';
    }
    
    // 处理文件拖放
    dropArea.addEventListener('drop', handleDrop, false);
    kolorsImageDropArea.addEventListener('drop', handleImageGenDrop, false);
    geminiImageDropArea.addEventListener('drop', handleGeminiDrop, false); // 新增
    
    /**
     * @function handleDrop
     * @description 处理OCR文件拖放事件。
     * @param {DragEvent} e - 拖放事件对象。
     * @returns {void}
     */
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        handleFile(file, 'ocr');
    }

    /**
     * @function handleImageGenDrop
     * @description 处理图像生成文件拖放事件。
     * @param {DragEvent} e - 拖放事件对象。
     * @returns {void}
     */
    function handleImageGenDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        handleFile(file, 'imageGen');
    }
    
    // 处理文件选择
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            handleFile(this.files[0], 'ocr');
        }
    });

    imageGenFileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            handleFile(this.files[0], 'imageGen');
        }
        // 重置 input 的值，以确保可以重新选择同一个文件
        this.value = '';
    });
    
    /**
     * @function handleFile
     * @description 处理文件选择或拖放，进行文件类型检查和文件信息/图片/PDF预览显示。
     * @param {File} file - 用户选择或拖放的文件对象。
     * @param {string} type - 文件处理类型 ('ocr' 或 'imageGen')。
     * @returns {Promise<void>}
     */
    async function handleFile(file, type) {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const validPDFType = 'application/pdf';
        
        if (type === 'ocr') {
            if (!validImageTypes.includes(file.type) && file.type !== validPDFType) {
                alert('OCR功能请上传图片文件（JPG, PNG, WEBP）或PDF文件');
                return;
            }
            selectedFile = file;
            fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
            imagePreview.style.display = 'none';
            pdfPreview.innerHTML = '';
            pageImages = [];

            loading.style.display = 'block';
            loadingText.textContent = '正在加载文件...';

            try {
                if (validImageTypes.includes(file.type)) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        imagePreview.src = e.target.result;
                        imagePreview.style.display = 'block';
                    }
                    reader.readAsDataURL(file);
                    loading.style.display = 'none';
                } else if (file.type === validPDFType) {
                    loadingText.textContent = '正在加载PDF文档...';
                    const arrayBuffer = await file.arrayBuffer();
                    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    
                    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                        const page = await pdfDoc.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 0.5 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        
                        const renderContext = {
                            canvasContext: context,
                            viewport: viewport
                        };
                        await page.render(renderContext).promise;
                        
                        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
                        pageImages.push(imageUrl);
                        
                        const pageContainer = document.createElement('div');
                        pageContainer.className = 'pdf-preview-page';
                        const img = document.createElement('img');
                        img.src = imageUrl;
                        img.alt = `Page ${pageNum}`;
                        img.style.maxWidth = '100px';
                        img.style.height = 'auto';
                        const pageNumber = document.createElement('div');
                        pageNumber.className = 'page-number';
                        pageNumber.textContent = `Page ${pageNum}`;
                        
                        pageContainer.appendChild(img);
                        pageContainer.appendChild(pageNumber);
                        pdfPreview.appendChild(pageContainer);
                    }
                    loading.style.display = 'none';
                }
            } catch (error) {
                console.error('OCR文件处理错误:', error);
                resultContent.textContent = `错误: ${error.message}`;
                loading.style.display = 'none';
            }
        } else if (type === 'imageGen') {
            if (!validImageTypes.includes(file.type)) {
                alert('图像生成功能请上传图片文件（JPG, PNG, WEBP）');
                return;
            }
            imageGenFileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
            imageGenImagePreview.style.display = 'none';
            imageGenClearImageBtn.style.display = 'none';

            try {
                imageGenSourceImageBase64 = await fileToBase64(file);
                imageGenImagePreview.src = imageGenSourceImageBase64;
                imageGenImagePreview.style.display = 'block';
                imageGenClearImageBtn.style.display = 'block';
            } catch (error) {
                console.error('图像生成文件处理错误:', error);
                showError(imageGenerationError, `文件加载失败: ${error.message}`);
            }
        }
        updateOcrButtonState();
        // updateImageGenButtonState(); // 移除，因为不再需要API Key检查
    }
    
    // 清除图像生成图片
    imageGenClearImageBtn.addEventListener('click', () => {
        imageGenImagePreview.src = '';
        imageGenImagePreview.style.display = 'none';
        imageGenClearImageBtn.style.display = 'none';
        imageGenFileInput.value = ''; // 清除文件输入
        imageGenSourceImageBase64 = null;
        imageGenFileInfo.textContent = '未选择图片';
        updateImageGenButtonState();
    });

    // 为图像生成提示词输入框添加事件监听
    imageGenPromptInput.addEventListener('input', updateImageGenButtonState);
    
    // 分析按钮点击事件
    analyzeBtn.addEventListener('click', async function() {
        if (!selectedFile) {
            alert('请先选择文件');
            return;
        }
        
        // API 密钥现在由 Worker 管理，前端无需输入
        
        // 显示加载状态
        loading.style.display = 'block';
        loadingText.textContent = '正在处理文件...';
        resultContent.textContent = '识别结果将显示在这里...';
        analyzeBtn.disabled = true;
        copyBtn.disabled = true;
        downloadBtn.disabled = true;
        progressContainer.style.display = 'none'; // 默认隐藏进度条
        progressBar.style.width = '0%';
        
        try {
            let fullText = '';
            const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

            if (validImageTypes.includes(selectedFile.type)) {
                // 处理图片
                const base64Data = await fileToBase64(selectedFile);
                const promptText = currentMode === 'ocr' ? 
                    "请提取图片中的所有文字内容，包括标点符号和特殊字符。直接返回文本内容，不需要任何解释或描述。" : 
                    `请作为高度智能化的图像处理系统，分析用户上传的图片。
你的任务是自动提取图片中的关键要素，并根据Comfy UI文生图的要求进行分类和整理。
最终输出完整的要素列表，并生成一份Comfy UI的提示词模板，包括英文和中文两个版本。

请严格按照以下结构和内容要求输出：

【图片要素提取与分类结果】

1. 主体与物体：
   - 识别图片中的所有物体和主体，包括人物、动物、建筑、自然景观、物品等。

2. 场景与背景：
   - 分析图片的背景和场景，提取出关键的场景信息，如室内、室外、城市、自然、天空、海洋等。

3. 颜色与色调：
   - 提取图片中的主要颜色和色调，分析色彩搭配和情感表达（如冷色调、暖色调）。

4. 艺术风格：
   - 判断图片的艺术风格，如写实、卡通、油画、水彩、赛博朋克、蒸汽朋克等。

5. 情感与氛围：
   - 识别图片所传达的情感和氛围，如快乐、悲伤、神秘、梦幻、宁静、怀旧、紧张等。

6. 构图与布局：
   - 识别图片的构图方式，如中心构图、对称构图、三分法则等。

7. 纹理与材质：
   - 提取图片中的纹理信息，如粗糙、光滑、细腻、金属、玻璃、布料、木质等。

【Comfy UI 提示词模板 - 英文版】

根据上述提取和分类的要素，生成一个英文的Comfy UI提示词模板。这个提示词应该是一个连贯的描述，包含所有关键细节，可以直接用于文生图。

【Comfy UI 提示词模板 - 中文版】

根据上述提取和分类的要素，生成一个中文的Comfy UI提示词模板。这个提示词应该是一个连贯的描述，包含所有关键细节，可以直接用于文生图。`;
                
                loadingText.textContent = currentMode === 'ocr' ? '正在识别图片文字...' : '正在分析图片内容...';
                const result = await callGeminiAPI(base64Data, promptText); // 移除 apiKey 参数
                fullText = result;

            } else if (selectedFile.type === 'application/pdf') {
                // 处理PDF
                progressContainer.style.display = 'block'; // PDF显示进度条
                for (let i = 0; i < pageImages.length; i++) {
                    const pageNum = i + 1;
                    loadingText.textContent = `正在处理第 ${pageNum}/${pageImages.length} 页...`;
                    progressBar.style.width = `${((i + 1) / pageImages.length) * 100}%`; // 进度条更新
                    
                    const promptText = "请提取此PDF页面中的所有文字内容，包括标点符号和特殊字符。直接返回文本内容，不需要任何解释或描述。";
                    const pageText = await callGeminiAPI(pageImages[i], promptText); // 移除 apiKey 参数
                    
                    fullText += `\n\n--- Page ${pageNum} ---\n\n${pageText}`;
                    resultContent.textContent = fullText; // 实时更新结果
                }
            }
            
            resultContent.textContent = fullText;
            copyBtn.disabled = false;
            downloadBtn.disabled = false;
            
        } catch (error) {
            console.error('请求出错:', error);
            resultContent.textContent = `错误: ${error.message}`;
        } finally {
            // 隐藏加载状态
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
            progressContainer.style.display = 'none'; // 隐藏进度条
        }
    });
    
    /**
     * @function callGeminiAPI
     * @description 调用Gemini API进行文本提取或图片描述。
     * @param {string} imageData - Base64编码的图片数据。
     * @param {string} promptText - 发送给模型的提示词。
     * @returns {Promise<string>} - 返回一个Promise，解析为识别到的文本内容。
     * @throws {Error} - 如果API请求失败或未获取到有效结果。
     */
    async function callGeminiAPI(imageData, promptText) { // 移除 apiKey 参数
        const requestData = {
            model: "gemini-2.0-flash",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: promptText
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageData
                            }
                        }
                    ]
                }
            ]
        };
        
        const response = await fetch(`/api/gemini`, { // 修改为代理端点
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`请求失败: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error('未获取到有效的识别结果');
        }
    }

    // 复制文本
    copyBtn.addEventListener('click', function() {
        const text = resultContent.textContent;
        navigator.clipboard.writeText(text).then(() => {
            alert('文本已复制到剪贴板！');
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制文本');
        });
    });
    
    // 下载文本
    downloadBtn.addEventListener('click', function() {
        const text = resultContent.textContent;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `gemini-ocr-result-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    });
    
    /**
     * @function fileToBase64
     * @description 将文件对象转换为Base64编码的Data URL。
     * @param {File} file - 要转换的文件对象。
     * @returns {Promise<string>} - 返回一个Promise，解析为Base64编码的Data URL字符串。
     * @throws {Error} - 如果文件读取失败，Promise将被拒绝。
     */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * @function formatFileSize
     * @description 格式化文件大小为可读的字符串。
     * @param {number} bytes - 文件大小（字节）。
     * @returns {string} - 格式化后的文件大小字符串。
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 图像生成参数事件
    imageGenBatchSizeInput.addEventListener('input', () => {
        imageGenBatchSizeValueSpan.textContent = imageGenBatchSizeInput.value;
    });

    imageGenNumInferenceStepsInput.addEventListener('input', () => {
        imageGenNumInferenceStepsValueSpan.textContent = imageGenNumInferenceStepsInput.value;
    });

    imageGenGuidanceScaleInput.addEventListener('input', () => {
        imageGenGuidanceScaleValueSpan.textContent = imageGenGuidanceScaleInput.value;
    });

    // 图像生成按钮事件
    generateImageBtn.addEventListener('click', generateImages);

    // 扩写按钮事件
    expandPromptButton.addEventListener('click', async () => {
        const currentPrompt = imageGenPromptInput.value.trim();
        if (!currentPrompt) {
            showError(imageGenerationError, '提示词不能为空');
            return;
        }
        
        imageGenerationLoading.style.display = 'block';
        imageGenerationLoadingText.textContent = '正在扩写提示词...';
        imageGenerationError.style.display = 'none';
        expandPromptButton.disabled = true;
        
        try {
            const expandedText = await expandPrompt(currentPrompt);
            imageGenPromptInput.value = expandedText;
            showSuccess('提示词扩写成功');
        } catch (error) {
            showError(imageGenerationError, `提示词扩写失败: ${error.message}`);
        } finally {
            imageGenerationLoading.style.display = 'none';
            expandPromptButton.disabled = false;
        }
    });

    /**
     * @function expandPrompt
     * @description 调用Gemini API扩写提示词。
     * @param {string} inputText - 原始提示词。
     * @returns {Promise<string>} - 返回一个Promise，解析为扩写后的提示词。
     * @throws {Error} - 如果API请求失败或未获取到有效结果。
     */
    async function expandPrompt(inputText) {
        const systemPrompt = `作为AI文生图提示词架构师，对原始提示词进行详细扩写，使其更具描述性、细节丰富，并包含艺术风格、光照、构图等元素，以生成高质量图像。直接返回扩写后的提示词，不需要任何解释或描述。`;
        
        const requestData = {
            model: "gemini-2.0-flash",
            messages: [
                {
                    role: "system",
                    content: [{ type: "text", text: systemPrompt }]
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `请根据以下原始提示词进行扩写。原始提示词：${inputText}`
                        }
                    ]
                }
            ]
        };
        
        const response = await fetch(`/api/gemini`, { // 修改为代理端点
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error('未获取到有效的扩写结果');
        }
    }

    // --- Gemini 多图上传逻辑 (从 nanobanana-main/static/script.js 借鉴并改造) ---

    geminiImageUploadInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        handleGeminiFiles(files);
        // 重置 input 的值，以确保可以重新选择同一个文件
        e.target.value = '';
    });

    function handleGeminiDrop(e) {
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        handleGeminiFiles(files);
    }

    function handleGeminiFiles(files) {
        const totalFiles = geminiSelectedFiles.length + files.length;
        if (totalFiles > 3) {
            alert('最多只能上传 3 张图片');
            return;
        }
        files.forEach(file => {
            if (!geminiSelectedFiles.some(f => f.name === file.name)) {
                geminiSelectedFiles.push(file);
                createGeminiThumbnail(file);
            }
        });
    }

    function createGeminiThumbnail(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'thumbnail-wrapper';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                geminiSelectedFiles = geminiSelectedFiles.filter(f => f.name !== file.name);
                wrapper.remove();
            };
            
            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            geminiThumbnailsContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    }

    /**
     * @function generateImages
     * @description 根据选择的模型调用相应的API生成图像。
     * @returns {Promise<void>}
     */
    async function generateImages() {
        const selectedModel = imageGenModelSelect.value;
        const prompt = imageGenPromptInput.value.trim();

        if (!prompt) {
            showError(imageGenerationError, '提示词不能为空');
            return;
        }

        imageGenerationLoading.style.display = 'block';
        imageGenerationLoadingText.textContent = '正在生成图像...';
        imageGenerationError.style.display = 'none';
        imageResultsDiv.innerHTML = '';

        try {
            if (selectedModel === 'kolors') {
                await generateWithKolors(prompt);
            } else if (selectedModel === 'gemini-2.5-flash-image-preview') {
                await generateWithGeminiImage(prompt);
            }
        } catch (error) {
            showError(imageGenerationError, error.message);
        } finally {
            imageGenerationLoading.style.display = 'none';
        }
    }

    async function generateWithKolors(prompt) {
        const params = {
            model: "Kwai-Kolors/Kolors",
            prompt: prompt,
            negative_prompt: imageGenNegativePromptInput.value.trim() || undefined,
            image_size: imageGenImageSizeSelect.value,
            batch_size: parseInt(imageGenBatchSizeInput.value),
            num_inference_steps: parseInt(imageGenNumInferenceStepsInput.value),
            guidance_scale: parseFloat(imageGenGuidanceScaleInput.value),
            seed: imageGenSeedInput.value ? parseInt(imageGenSeedInput.value) : undefined,
            image: imageGenSourceImageBase64 || undefined
        };
        
        const response = await fetch('/api/siliconflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `图像生成失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        displayImageResults(data.data);
    }

    async function generateWithGeminiImage(prompt) {
        let contentsParts = [];

        // 添加文本部分
        contentsParts.push({
            type: "text",
            text: prompt
        });

        // 如果存在图片，则添加图片部分
        if (geminiSelectedFiles.length > 0) {
            const conversionPromises = geminiSelectedFiles.map(file => fileToBase64(file));
            const base64Images = await Promise.all(conversionPromises);
            base64Images.forEach(base64Data => {
                contentsParts.push({
                    type: "image_url",
                    image_url: {
                        url: base64Data
                    }
                });
            });
        }

        const params = {
            model: "gemini-2.5-flash-image-preview",
            messages: [
                {
                    role: "user",
                    content: contentsParts
                }
            ]
        };

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `图像生成失败: ${response.status} ${response.statusText}`;
            try {
                // 尝试解析为JSON，如果成功，则使用更具体的错误信息
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorText;
            } catch (e) {
                // 如果解析失败，直接使用Worker返回的文本
                errorMessage = errorText;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Gemini Vision API in this setup returns a single base64 image string in data.data
        if (data.data && typeof data.data === 'string' && data.data.startsWith('data:image/')) {
             displayImageResults([{ url: data.data }]);
        } else {
            throw new Error('模型返回的不是有效的图片数据');
        }
    }

    /**
     * @function displayImageResults
     * @description 在页面上显示生成的图像。
     * @param {Array<Object>} images - 包含图像URL的对象数组。
     * @param {string} images[].url - 图像的URL。
     * @returns {void}
     */
    function displayImageResults(images) {
        imageResultsDiv.innerHTML = '';
        
        if (images && images.length > 0) {
            images.forEach(img => {
                const imageCard = document.createElement('div');
                imageCard.className = 'image-card';
                
                const imgElement = document.createElement('img');
                imgElement.src = img.url;
                imgElement.alt = 'Generated Image';
                
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'actions';
                
                const copyButton = document.createElement('button');
                copyButton.innerHTML = '<i class="fas fa-copy"></i> 复制链接';
                copyButton.onclick = () => {
                    navigator.clipboard.writeText(img.url).then(() => {
                        showSuccess('链接已复制！');
                    }).catch(err => {
                        console.error('复制失败:', err);
                        showError(imageGenerationError, '复制失败，请手动复制链接');
                    });
                };
                
                const downloadButton = document.createElement('button');
                downloadButton.innerHTML = '<i class="fas fa-download"></i> 下载图片';
                downloadButton.onclick = () => {
                    const a = document.createElement('a');
                    a.href = img.url;
                    a.download = `generated_image_${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
                
                actionsDiv.appendChild(copyButton);
                actionsDiv.appendChild(downloadButton);
                imageCard.appendChild(imgElement);
                imageCard.appendChild(actionsDiv);
                imageResultsDiv.appendChild(imageCard);
            });
        } else {
            showError(imageGenerationError, '未生成任何图片');
        }
    }

    /**
     * @function showError
     * @description 显示错误消息。
     * @param {HTMLElement} element - 显示错误消息的DOM元素。
     * @param {string} message - 要显示的错误消息文本。
     * @returns {void}
     */
    function showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    /**
     * @function showSuccess
     * @description 显示成功消息（使用alert）。
     * @param {string} message - 要显示的成功消息文本。
     * @returns {void}
     */
    function showSuccess(message) {
        alert(message);
    }
});
