// static/js/document_viewer/analysis.js

/**
 * Analysis tab functionality for DocumentViewer
 * Responsible for AI analysis of document and fields
 */
(function (DocumentViewer) {
  /**
     * Bind events for the analysis tab
     */
  DocumentViewer.prototype.bindAnalysisEvents = function () {
    if (this.elements.analyzeBtn) {
      this.elements.analyzeBtn.addEventListener ('click', () => {
        this.startAnalysis ();
      });
    }

    if (this.elements.cancelAnalyzeBtn) {
      this.elements.cancelAnalyzeBtn.addEventListener ('click', () => {
        this.cancelAnalysis ();
      });
    }

    if (this.elements.resetPromptBtn) {
      this.elements.resetPromptBtn.addEventListener ('click', () => {
        this.resetAnalysisPrompt ();
      });
    }
  };

  /**
     * Start the AI analysis
     */
  DocumentViewer.prototype.startAnalysis = function () {
    if (!this.elements.analysisPrompt || !this.elements.analysisResults) {
      console.error ('Analysis elements not found');
      return;
    }

    const prompt = this.elements.analysisPrompt.value.trim ();
    if (!prompt) {
      alert ('请输入分析提示');
      return;
    }

    // Disable the analyze button and show cancel button
    this.elements.analyzeBtn.disabled = true;
    this.elements.analyzeBtn.textContent = '分析中...';
    this.elements.cancelAnalyzeBtn.classList.remove ('hidden');

    // Clear previous results
    this.elements.analysisResults.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8">
          <div class="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p class="text-gray-600">AI分析中...</p>
        </div>
      `;

    // Get content for analysis
    const analysisData = this.prepareAnalysisData ();

    // In a real implementation, this would make an API call to an AI service
    // For demo purposes, we'll simulate a response after a delay
    this.analysisSimulationTimer = setTimeout (() => {
      // Generate sample analysis result
      const result = this.getSampleAnalysisResult (analysisData);

      // Update the results display with formatted content
      if (window.marked && typeof window.marked.parse === 'function') {
        this.elements.analysisResults.innerHTML = window.marked.parse (result);
      } else {
        // Fallback to basic formatting if marked.js is not available
        this.elements.analysisResults.innerHTML = `<pre>${result}</pre>`;
      }

      // Reset buttons
      this.elements.analyzeBtn.disabled = false;
      this.elements.analyzeBtn.textContent = '开始分析';
      this.elements.cancelAnalyzeBtn.classList.add ('hidden');
    }, 3000);
  };

  /**
     * Prepare data for analysis
     * @returns {string} - Formatted text for analysis
     */
  DocumentViewer.prototype.prepareAnalysisData = function () {
    let analysisText = '';

    // Add document text
    if (this.currentDocument && this.currentDocument.ocr_data) {
      const pages = this.currentDocument.ocr_data.pages;
      analysisText += '【文档内容】\n';
      pages.forEach ((page, index) => {
        analysisText += `--- 第${index + 1}页 ---\n`;
        analysisText += page.raw || '';
        analysisText += '\n\n';
      });
    }

    // Add extracted fields
    if (this.keyValueMap.size > 0) {
      analysisText += '\n【提取字段】\n';

      // Group by category
      const categories = {
        personal: [],
        medical: [],
        incident: [],
        legal: [],
      };

      for (const [key, data] of this.keyValueMap.entries ()) {
        const category = data.category || 'personal';
        if (categories[category]) {
          categories[category].push (`${key}: ${data.value}`);
        }
      }

      // Add each category
      if (categories.personal.length > 0) {
        analysisText += '个人信息:\n' + categories.personal.join ('\n') + '\n\n';
      }

      if (categories.medical.length > 0) {
        analysisText += '医疗信息:\n' + categories.medical.join ('\n') + '\n\n';
      }

      if (categories.incident.length > 0) {
        analysisText += '事故信息:\n' + categories.incident.join ('\n') + '\n\n';
      }

      if (categories.legal.length > 0) {
        analysisText += '法律信息:\n' + categories.legal.join ('\n') + '\n\n';
      }
    }

    return analysisText;
  };

  /**
     * Cancel the ongoing analysis
     */
  DocumentViewer.prototype.cancelAnalysis = function () {
    if (this.analysisSimulationTimer) {
      clearTimeout (this.analysisSimulationTimer);
      this.analysisSimulationTimer = null;
    }

    // Reset UI
    this.elements.analysisResults.innerHTML = `
        <div class="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-700">
          <div class="font-medium">分析已取消</div>
          <div class="text-sm">点击"开始分析"按钮重新开始分析</div>
        </div>
      `;

    this.elements.analyzeBtn.disabled = false;
    this.elements.analyzeBtn.textContent = '开始分析';
    this.elements.cancelAnalyzeBtn.classList.add ('hidden');
  };

  /**
     * Reset the analysis prompt to default
     */
  DocumentViewer.prototype.resetAnalysisPrompt = function () {
    // Set default prompt
    const defaultPrompt =
      '基于报告扫描的内容，请仔细检查确认报告是正确的，没有错误用语，错别字，特别是医学用语和药品名称。报告首先给个整体的结果，是否有错误。';

    if (this.elements.analysisPrompt) {
      this.elements.analysisPrompt.value = defaultPrompt;
    }
  };

  /**
     * Generate a sample analysis result for demo purposes
     * @param {string} data - The data to analyze
     * @returns {string} - A sample analysis result in markdown format
     */
  DocumentViewer.prototype.getSampleAnalysisResult = function (data) {
    // In a real implementation, this would be the response from an AI service
    // For demo purposes, we return a sample result

    const sampleAnalysis = `
  ## 文档分析结果
  
  整体而言，本报告基本格式规范，医学用语和药品名称使用正确。但存在以下问题需要注意：
  
  ### 优点
  - 结构完整，包含了基本信息、事故信息、医疗信息和鉴定结论等必要部分
  - 医学专业术语使用正确，如"胫骨骨折"而非"小腿骨折"
  - 时间、地点等信息具体明确
  
  ### 需要改进的问题
  1. **医学描述不够详细**：缺少对骨折类型（如开放性/闭合性，粉碎性/螺旋型等）的具体描述
  2. **损伤程度评估依据不足**：结论中指出为九级伤残，但缺少功能恢复情况的评估依据
  3. **治疗过程记录不完整**：仅提及住院天数，未记录治疗方式、手术情况等
  
  ### 建议
  - 补充伤情详细描述，特别是骨折的具体类型、位置和严重程度
  - 添加功能恢复评估内容，包括关节活动度、肌力等客观指标
  - 增加治疗过程记录，如是否进行手术、固定方式等
  
  ### 字段一致性检查
  | 字段 | 来源 | 一致性 | 建议 |
  |------|------|--------|------|
  | 姓名 | 一致 | ✓ | 无 |
  | 年龄 | 一致 | ✓ | 无 |
  | 事故日期 | 一致 | ✓ | 无 |
  | 诊断结果 | 部分一致 | ⚠️ | 需要补充具体骨折类型 |
  | 住院天数 | 一致 | ✓ | 无 |
  | 伤残等级 | 一致 | ✓ | 需要补充评估依据 |
  
  总体来看，报告可用于初步评估，但建议在正式提交前补充上述缺失信息，以提高报告的专业性和可靠性。
      `;

    return sampleAnalysis;
  };
}) (window.DocumentViewer);
