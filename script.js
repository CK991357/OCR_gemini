// 设置PDF.js worker路径
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
    const imageGenPromptInput = document.getElementById('imageGenPrompt');
    const imageGenNegativePromptInput = document.getElementById('imageGenNegativePrompt');
    const imageGenModelSelect = document.getElementById('imageGenModelSelect'); // 新增模型选择元素
    const imageGenImageSizeSelect = document.getElementById('imageGenImageSize');
    const imageGenBatchSizeInput = document.getElementById('imageGenBatchSize');
    const imageGenBatchSizeValueSpan = document.getElementById('imageGenBatchSizeValue');
    const imageGenNumInferenceStepsInput = document.getElementById('imageGenNumInferenceSteps');
    const imageGenNumInferenceStepsValueSpan = document.getElementById('imageGenNumInferenceStepsValue');
    const imageGenGuidanceScaleInput = document.getElementById('imageGenGuidanceScale');
    const imageGenGuidanceScaleValueSpan = document.getElementById('imageGenGuidanceScaleValue');
    const imageGenSeedInput = document.getElementById('imageGenSeed');
    const generateImageBtn = document.getElementById('generateImageBtn');

    // Kolors/Siliconflow 独有的参数组
    const kolorsParamGroups = [
        imageGenImageSizeSelect.closest('.param-group'),
        imageGenBatchSizeInput.closest('.param-group'),
        imageGenNumInferenceStepsInput.closest('.param-group'),
        imageGenGuidanceScaleInput.closest('.param-group'),
        imageGenSeedInput.closest('.param-group')
    ];
    const imageGenerationLoading = document.getElementById('imageGenerationLoading');
    const imageGenerationLoadingText = document.getElementById('imageGenerationLoadingText');
    const imageGenerationError = document.getElementById('imageGenerationError');
    const imageResultsDiv = document.getElementById('imageResults');
    const expandPromptButton = document.getElementById('expandPromptButton');

    // 新增图生图相关元素
    const imageGenDropArea = document.getElementById('imageGenDropArea');
    const imageGenFileInput = document.getElementById('imageGenFileInput');
    const imageGenFileInfo = document.getElementById('imageGenFileInfo');
    const imageGenPreviewsContainer = document.getElementById('imageGenPreviewsContainer'); // 新增多图片预览容器
    const imageGenClearImageBtn = document.getElementById('imageGenClearImageBtn');

    let selectedFile = null;
    let pdfDoc = null;
    let pageImages = []; // 用于存储PDF每页的Base64图片数据
    let currentFunction = 'ocr'; // 默认功能为OCR
    let imageGenSourceImageBase64Array = []; // 用于存储图生图的Base64图片数据数组
    const MAX_GEMINI_IMAGES = 3; // Gemini模型单次请求图片数量上限

    // 初始化功能面板显示
    ocrPanel.style.display = 'grid';
    imageGenerationPanel.style.display = 'none';
    updateOcrButtonState(); // 更新OCR分析按钮状态
    // updateImageGenButtonState(); // 更新图像生成按钮状态 - 移除，因为不再需要API Key检查

    // 功能切换事件监听
    ocrFunctionBtn.addEventListener('click', () => {
        ocrFunctionBtn.classList.add('active');
        imageGenerationFunctionBtn.classList.remove('active');
        ocrPanel.style.display = 'grid';
        imageGenerationPanel.style.display = 'none';
        currentFunction = 'ocr';
        updateOcrButtonState(); // 切换到OCR时更新OCR分析按钮状态
        // updateImageGenButtonState(); // 确保图像生成按钮在切换时也更新状态 - 移除，因为不再需要API Key检查
    });

    imageGenerationFunctionBtn.addEventListener('click', () => {
        imageGenerationFunctionBtn.classList.add('active');
        ocrFunctionBtn.classList.remove('active');
        ocrPanel.style.display = 'none';
        imageGenerationPanel.style.display = 'block';
        currentFunction = 'imageGen';
        updateOcrButtonState(); // 确保OCR分析按钮在切换时也更新状态
        // updateImageGenButtonState(); // 切换到图像生成时更新按钮状态 - 移除，因为不再需要API Key检查
    });

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
        const selectedModel = imageGenModelSelect.value;
        const isKolorsModel = selectedModel === "Kwai-Kolors/Kolors";
        const isGeminiModel = selectedModel === "google/gemini-2.5-flash-image-preview:free";
        
        // 只有Kolors模型需要这些参数，Gemini模型不需要
        kolorsParamGroups.forEach(group => {
            if (group) { // 检查group是否为null
                group.style.display = isKolorsModel ? 'block' : 'none';
                Array.from(group.querySelectorAll('input, select')).forEach(input => {
                    input.disabled = !isKolorsModel;
                });
            }
        });

        // 图片上传区域的隔离
        if (isGeminiModel || isKolorsModel) {
            imageGenDropArea.style.display = 'block'; // 保持上传区域可见
            imageGenFileInput.multiple = isGeminiModel; // Gemini支持多选，Kolors不支持
        } else {
            imageGenDropArea.style.display = 'none';
        }

        // 图像生成按钮的禁用状态取决于提示词是否为空，以及当前是否处于图像生成模式
        generateImageBtn.disabled = !(imageGenPromptInput.value.trim() !== '' && currentFunction === 'imageGen');
    }
    
    // OCR文件上传区域事件监听
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 图像生成文件上传区域事件监听
    imageGenDropArea.addEventListener('click', () => {
        imageGenFileInput.click();
    });

    // 处理拖放事件的通用函数
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        imageGenDropArea.addEventListener(eventName, preventDefaults, false);
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
        imageGenDropArea.addEventListener(eventName, highlightImageGen, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
        imageGenDropArea.addEventListener(eventName, unhighlightImageGen, false);
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
    imageGenDropArea.addEventListener('drop', handleImageGenDrop, false);
    
    /**
     * @function handleDrop
     * @description 处理OCR文件拖放事件。
     * @param {DragEvent} e - 拖放事件对象。
     * @returns {void}
     */
    function handleDrop(e) {
        const files = Array.from(e.dataTransfer.files); // 获取所有拖放的文件
        handleFiles(files, 'ocr');
    }

    /**
     * @function handleImageGenDrop
     * @description 处理图像生成文件拖放事件。
     * @param {DragEvent} e - 拖放事件对象。
     * @returns {void}
     */
    function handleImageGenDrop(e) {
        const files = Array.from(e.dataTransfer.files); // 获取所有拖放的文件
        handleFiles(files, 'imageGen');
    }
    
    // 处理文件选择
    fileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            handleFiles(Array.from(this.files), 'ocr');
        }
    });

    imageGenFileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            handleFiles(Array.from(this.files), 'imageGen');
        }
    });
    
    /**
     * @function handleFiles
     * @description 处理文件选择或拖放，进行文件类型检查和文件信息/图片/PDF预览显示。
     * @param {File[]} files - 用户选择或拖放的文件对象数组。
     * @param {string} type - 文件处理类型 ('ocr' 或 'imageGen')。
     * @returns {Promise<void>}
     */
    async function handleFiles(files, type) {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const validPDFType = 'application/pdf';
        
        if (type === 'ocr') {
            const file = files[0]; // OCR只处理第一个文件
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
            imageGenPreviewsContainer.innerHTML = ''; // 清空现有预览
            imageGenSourceImageBase64Array = []; // 清空数据数组
            imageGenClearImageBtn.style.display = 'none';

            if (files.length === 0) {
                imageGenFileInfo.textContent = '未选择图片';
                updateImageGenButtonState();
                return;
            }

            let totalSize = 0;
            let allFilesValid = true;

            for (const file of files) {
                if (!validImageTypes.includes(file.type)) {
                    alert(`图像生成功能不支持文件类型: ${file.name} (${file.type})。请上传图片文件（JPG, PNG, WEBP）`);
                    allFilesValid = false;
                    continue;
                }
                totalSize += file.size;
            }

            if (!allFilesValid) {
                imageGenFileInfo.textContent = '部分文件类型不符合要求';
                updateImageGenButtonState();
                return;
            }

            imageGenFileInfo.textContent = `${files.length} 个文件 (${formatFileSize(totalSize)})`;

            try {
                for (const file of files) {
                    const base64Data = await fileToBase64(file);
                    imageGenSourceImageBase64Array.push(base64Data);

                    const imgElement = document.createElement('img');
                    imgElement.src = base64Data;
                    imgElement.className = 'image-preview';
                    imgElement.alt = '预览图片';
                    imageGenPreviewsContainer.appendChild(imgElement);
                }
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
    imageGenClearImageBtn.addEventListener('click', (event) => { // 传入事件对象
        event.stopPropagation(); // 阻止事件冒泡到父元素
        imageGenPreviewsContainer.innerHTML = '';
        imageGenClearImageBtn.style.display = 'none';
        imageGenFileInput.value = ''; // 清除文件输入
        imageGenSourceImageBase64Array = [];
        imageGenFileInfo.textContent = '未选择图片';
        updateImageGenButtonState();
    });

    // 为图像生成提示词输入框和模型选择框添加事件监听
    imageGenPromptInput.addEventListener('input', updateImageGenButtonState);
    imageGenModelSelect.addEventListener('change', updateImageGenButtonState); // 新增模型选择监听

    // 初始调用以设置正确的状态
    updateImageGenButtonState();
    
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

    /**
     * @function generateImages
     * @description 调用Siliconflow API生成图像。
     * @returns {Promise<void>}
     * @throws {Error} - 如果API请求失败。
     */
    async function generateImages() {
        const selectedModel = imageGenModelSelect.value;
        const prompt = imageGenPromptInput.value.trim();
        if (!prompt) {
            showError(imageGenerationError, '提示词不能为空');
            return;
        }
        
        // 准备参数
        let apiUrl = '';
        let requestBody = {};

        if (selectedModel === "Kwai-Kolors/Kolors") {
            apiUrl = '/api/siliconflow';
            requestBody = {
                model: selectedModel,
                prompt: prompt,
                negative_prompt: imageGenNegativePromptInput.value.trim() || undefined,
                image_size: imageGenImageSizeSelect.value,
                batch_size: parseInt(imageGenBatchSizeInput.value),
                num_inference_steps: parseInt(imageGenNumInferenceStepsInput.value),
                guidance_scale: parseFloat(imageGenGuidanceScaleInput.value),
                seed: imageGenSeedInput.value ? parseInt(imageGenSeedInput.value) : undefined,
                image: imageGenSourceImageBase64 || undefined
            };
        } else if (selectedModel === "google/gemini-2.5-flash-image-preview:free") {
            apiUrl = '/api/openrouter'; // 新的OpenRouter代理端点
            requestBody = {
                model: selectedModel,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt }
                        ]
                    }
                ]
            };
            if (imageGenSourceImageBase64) {
                requestBody.messages[0].content.push({
                    type: "image_url",
                    image_url: { url: imageGenSourceImageBase64 }
                });
            }
        } else {
            showError(imageGenerationError, '未知的图像生成模型');
            return;
        }

        // 显示加载
        imageGenerationLoading.style.display = 'block';
        imageGenerationLoadingText.textContent = '正在生成图像...';
        imageGenerationError.style.display = 'none';
        imageResultsDiv.innerHTML = ''; // 清空之前的图片
        
        try {
            // 调用代理 API
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `图像生成失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();

            // 根据模型处理返回结果
            let imageUrls = [];
            if (selectedModel === "Kwai-Kolors/Kolors") {
                imageUrls = data.data;
            } else if (selectedModel === "google/gemini-2.5-flash-image-preview:free") {
                // OpenRouter (Gemini) 返回的是文本内容，需要提取可能的图片URL
                const geminiContent = data.choices[0].message.content;
                // 暂时假设Gemini不直接返回图片，而是描述，如果需要生成图片，需要另行处理
                showError(imageGenerationError, 'Gemini模型目前只返回文本描述，不直接生成图像。如果需要图片，请在OCR面板的“图片内容描述”模式下使用。');
                return; // 不显示图片结果
            }
            
            // 显示结果
            displayImageResults(imageUrls);
        } catch (error) {
            showError(imageGenerationError, error.message);
        } finally {
            imageGenerationLoading.style.display = 'none';
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
