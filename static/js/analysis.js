class AIAnalyzer {
    constructor() {
        console.log('AIAnalyzer constructor start');
        this.controller = null;
        
        // Bind methods to preserve 'this' context
        this.startAnalysis = this.startAnalysis.bind(this);
        this.handleStreamResponse = this.handleStreamResponse.bind(this);
        this.handleError = this.handleError.bind(this);
        this.updateDisplay = this.updateDisplay.bind(this);
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOM Content Loaded - initializing AIAnalyzer');
                this.initElements();
                this.bindEvents();
            });
        } else {
            console.log('DOM already ready - initializing AIAnalyzer');
            this.initElements();
            this.bindEvents();
        }
        
        console.log('AIAnalyzer constructor end');
    }

    initElements() {
        console.log('Initializing AI analyzer elements');
        this.elements = {
            analyzeBtn: document.getElementById('analyze-btn'),
            resultsDiv: document.getElementById('analysis-results')
        };

        if (!this.elements.analyzeBtn || !this.elements.resultsDiv) {
            console.error('Failed to find required elements:', {
                analyzeBtn: !!this.elements.analyzeBtn,
                resultsDiv: !!this.elements.resultsDiv
            });
        }
    }

    bindEvents() {
        console.log('Binding AI analyzer events');
        if (this.elements.analyzeBtn) {
            const boundStartAnalysis = this.startAnalysis.bind(this);
            this.elements.analyzeBtn.onclick = () => {
                console.log('Analyze button clicked via onclick');
                boundStartAnalysis();
            };
            console.log('Event listener attached');
        } else {
            console.error('Analyze button not found');
        }
    }

    startAnalysis() {
        console.log('Starting analysis, CONFIG:', CONFIG);
        if (!CONFIG || !CONFIG.api || !CONFIG.api.aiEndpoint) {
            console.error('CONFIG not properly initialized');
            return;
        }        
        // Get kvDisplay content
        const kvDisplay = document.getElementById('kv-display');
        if (!kvDisplay) {
            console.error('kvDisplay element not found');
            return;
        }

        console.log('kvDisplay found:', kvDisplay);
        
        // Get all entries
        const entries = Array.from(kvDisplay.children).map(div => {
            console.log('Processing div:', div.outerHTML);
            const keySpan = div.querySelector('.font-semibold');
            const valueSpan = div.querySelector('.flex-1');
            
            if (keySpan && valueSpan) {
                const text = `${keySpan.textContent} ${valueSpan.textContent}`;
                console.log('Found entry:', text);
                return text;
            }
            console.log('No key-value spans found in div');
            return '';
        }).filter(text => text).join('\n');

        console.log('Collected entries:', entries);

        if (!entries) {
            console.warn('No text to analyze');
            return;
        }

        // Prepare for analysis
        this.elements.analyzeBtn.disabled = true;
        this.elements.analyzeBtn.textContent = "分析中...";
        this.elements.resultsDiv.innerHTML = "";

        console.log('Preparing fetch request to:', CONFIG.api.aiEndpoint);

        // Create request body
        const requestBody = {
            model: CONFIG.analysis.model,
            messages: [
                {
                    role: "system",
                    content: "你是一个有经验的医生"
                },
                {
                    role: "user",
                    content: `基于报告扫描的内容，请仔细检查确认报告是正确的，没有错误用语，错别字，特别是医学用语和药品名称。
                    报告首先给个整体的结果，是否有错误。具体的错误请用红色标示\n\nOCR Text:\n${entries}`
                }
            ],
            max_tokens: CONFIG.analysis.maxTokens,
            stream: true
        };

        console.log('Request body:', requestBody);

        this.controller = new AbortController();

        // Make the request
        console.log('Sending fetch request');
        fetch(CONFIG.api.aiEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer not-needed"
            },
            body: JSON.stringify(requestBody),
            signal: this.controller.signal
        })
        .then(response => {
            console.log('Received response:', response);
            return this.handleStreamResponse(response);
        })
        .catch(error => {
            console.error('Request failed:', error);
            this.handleError(error);
        })
        .finally(() => {
            console.log('Request completed');
            this.resetAnalyzeButton();
        });
    }

    async handleStreamResponse(response) {
        console.log('Handling stream response');
        if (!response.ok) {
            console.error('Response not OK:', response.status, response.statusText);
            throw new Error(response.statusText);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        try {
            while (true) {
                const {done, value} = await reader.read();
                if (done) {
                    console.log('Stream complete');
                    break;
                }

                const chunk = decoder.decode(value);
                console.log('Received chunk:', chunk);
                
                const lines = chunk.split("\n");
                console.log('Split into lines:', lines);

                for (const line of lines) {
                    if (this.isValidStreamLine(line)) {
                        try {
                            const jsonLine = line.replace("data: ", "");
                            console.log('Processing JSON line:', jsonLine);
                            
                            const json = JSON.parse(jsonLine);
                            if (json.choices[0].delta?.content) {
                                const content = json.choices[0].delta.content;
                                console.log('New content:', content);
                                accumulatedText += content;
                                this.updateDisplay(accumulatedText);
                            }
                        } catch (err) {
                            console.error("Error parsing JSON:", err, "Line:", line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error reading stream:', error);
            throw error;
        }
    }

    isValidStreamLine(line) {
        const isValid = line.trim() !== "" && 
                       line.trim() !== "data: [DONE]" && 
                       line.startsWith("data: ");
        console.log('Validating line:', { line, isValid });
        return isValid;
    }

    updateDisplay(text) {
        console.log('Updating display with text length:', text.length);
        this.elements.resultsDiv.innerHTML = marked.parse(text);
        this.elements.resultsDiv.scrollTop = this.elements.resultsDiv.scrollHeight;
    }

    handleError(error) {
        console.error('Handling error:', error);
        if (this.controller?.signal.aborted) {
            this.elements.resultsDiv.innerHTML = '<div class="text-red-500">分析已取消</div>';
        } else {
            this.elements.resultsDiv.innerHTML = '<div class="text-red-500">分析失败，请重试</div>';
        }
    }

    resetAnalyzeButton() {
        console.log('Resetting analyze button');
        this.elements.analyzeBtn.disabled = false;
        this.elements.analyzeBtn.textContent = "分析文本";
        this.controller = null;
    }
}