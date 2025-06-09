// 设置PDF.js worker路径
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const imagePreview = document.getElementById('imagePreview');
    const pdfPreview = document.getElementById('pdfPreview');
    const apiKeyInput = document.getElementById('apiKey');
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
    
    let selectedFile = null;
    let pdfDoc = null;
    let pageImages = []; // 用于存储PDF每页的Base64图片数据
    let currentMode = 'ocr'; // 默认模式为OCR
    
    // 初始化按钮文本
    updateButtonText();

    // 设置模式
    ocrMode.addEventListener('click', () => {
        ocrMode.classList.add('active');
        descMode.classList.remove('active');
        currentMode = 'ocr';
        updateButtonText();
    });
    
    descMode.addEventListener('click', () => {
        descMode.classList.add('active');
        ocrMode.classList.remove('active');
        currentMode = 'description';
        updateButtonText();
    });
    
    /**
     * @function updateButtonText
     * @description 根据当前模式更新分析按钮的文本和图标。
     * @returns {void}
     */
    function updateButtonText() {
        analyzeBtn.innerHTML = currentMode === 'ocr' ? 
            '<i class="fas fa-search"></i> 提取文本内容' : 
            '<i class="fas fa-image"></i> 分析图片内容';
    }
    
    // 点击上传区域触发文件选择
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 处理拖放事件
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
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
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    /**
     * @function highlight
     * @description 高亮上传区域的样式。
     * @returns {void}
     */
    function highlight() {
        dropArea.style.backgroundColor = 'rgba(66, 133, 244, 0.15)';
        dropArea.style.borderColor = '#1a73e8';
    }
    
    /**
     * @function unhighlight
     * @description 恢复上传区域的默认样式。
     * @returns {void}
     */
    function unhighlight() {
        dropArea.style.backgroundColor = 'rgba(66, 133, 244, 0.05)';
        dropArea.style.borderColor = '#4285f4';
    }
    
    // 处理文件拖放
    dropArea.addEventListener('drop', handleDrop, false);
    
    /**
     * @function handleDrop
     * @description 处理文件拖放事件。
     * @param {DragEvent} e - 拖放事件对象。
     * @returns {void}
     */
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        handleFile(file);
    }
    
    // 处理文件选择
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            handleFile(this.files[0]);
        }
    });
    
    /**
     * @function handleFile
     * @description 处理文件选择或拖放，进行文件类型检查和文件信息/图片/PDF预览显示。
     * @param {File} file - 用户选择或拖放的文件对象。
     * @returns {Promise<void>}
     */
    async function handleFile(file) {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const validPDFType = 'application/pdf';
        
        if (!validImageTypes.includes(file.type) && file.type !== validPDFType) {
            alert('请上传图片文件（JPG, PNG, WEBP）或PDF文件');
            return;
        }
        
        selectedFile = file;
        fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
        
        // 清除所有预览
        imagePreview.style.display = 'none';
        pdfPreview.innerHTML = '';
        pageImages = [];
        
        // 显示加载状态
        loading.style.display = 'block';
        loadingText.textContent = '正在加载文件...';
        
        try {
            if (validImageTypes.includes(file.type)) {
                // 图片预览
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                }
                reader.readAsDataURL(file);
                loading.style.display = 'none'; // 图片加载快，直接隐藏
            } else if (file.type === validPDFType) {
                // PDF预览
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
            
            // 如果API密钥已输入，启用分析按钮
            if (apiKeyInput.value.trim() !== '') {
                analyzeBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('文件处理错误:', error);
            resultContent.textContent = `错误: ${error.message}`;
            loading.style.display = 'none';
        }
    }
    
    // 监听API密钥输入
    apiKeyInput.addEventListener('input', function() {
        if (this.value.trim() !== '' && selectedFile) {
            analyzeBtn.disabled = false;
        } else {
            analyzeBtn.disabled = true;
        }
    });
    
    // 分析按钮点击事件
    analyzeBtn.addEventListener('click', async function() {
        if (!selectedFile) {
            alert('请先选择文件');
            return;
        }
        
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('请输入Gemini API密钥');
            return;
        }
        
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
                const result = await callGeminiAPI(base64Data, apiKey, promptText);
                fullText = result;

            } else if (selectedFile.type === 'application/pdf') {
                // 处理PDF
                progressContainer.style.display = 'block'; // PDF显示进度条
                for (let i = 0; i < pageImages.length; i++) {
                    const pageNum = i + 1;
                    loadingText.textContent = `正在处理第 ${pageNum}/${pageImages.length} 页...`;
                    progressBar.style.width = `${((i + 1) / pageImages.length) * 100}%`; // 进度条更新
                    
                    const promptText = "请提取此PDF页面中的所有文字内容，包括标点符号和特殊字符。直接返回文本内容，不需要任何解释或描述。";
                    const pageText = await callGeminiAPI(pageImages[i], apiKey, promptText);
                    
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
     * @param {string} apiKey - Gemini API密钥。
     * @param {string} promptText - 发送给模型的提示词。
     * @returns {Promise<string>} - 返回一个Promise，解析为识别到的文本内容。
     * @throws {Error} - 如果API请求失败或未获取到有效结果。
     */
    async function callGeminiAPI(imageData, apiKey, promptText) {
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
        
        const response = await fetch(`https://geminiapim.10110531.xyz/chat/completions?key=${apiKey}`, {
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
});
