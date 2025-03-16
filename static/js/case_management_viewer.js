class DocumentViewer {
  constructor () {
    this.currentDocument = null;
    this.currentPage = 1;
    this.zoom = 100;
    this.keyValueMap = new Map ();

    this.initElements ();
    this.bindEvents ();
  }

  initElements () {
    this.elements = {
      container: document.getElementById ('document-viewer'),
      previewSection: document.getElementById ('preview-section'),
      previewImage: document.getElementById ('preview-image'),
      pageInfo: document.getElementById ('page-info'),
      prevPageBtn: document.getElementById ('prev-page'),
      nextPageBtn: document.getElementById ('next-page'),
      zoomInBtn: document.getElementById ('zoom-in'),
      zoomOutBtn: document.getElementById ('zoom-out'),
      zoomDisplay: document.getElementById ('zoom-level'),

      // OCR results
      ocrResults: document.getElementById ('ocr-results'),
      processBtn: document.getElementById ('process-btn'),
      kvDisplay: document.getElementById ('kv-display'),

      // Analysis
      analyzeBtn: document.getElementById ('analyze-btn'),
      analysisResults: document.getElementById ('analysis-results'),

      // Save to case
      saveToCase: document.getElementById ('save-to-case'),
      closeViewerBtn: document.getElementById ('close-viewer'),
    };
  }

  bindEvents () {
    if (this.elements.prevPageBtn) {
      this.elements.prevPageBtn.addEventListener ('click', () =>
        this.changePage (-1)
      );
    }

    if (this.elements.nextPageBtn) {
      this.elements.nextPageBtn.addEventListener ('click', () =>
        this.changePage (1)
      );
    }

    if (this.elements.zoomInBtn) {
      this.elements.zoomInBtn.addEventListener ('click', () =>
        this.zoomChange (25)
      );
    }

    if (this.elements.zoomOutBtn) {
      this.elements.zoomOutBtn.addEventListener ('click', () =>
        this.zoomChange (-25)
      );
    }

    if (this.elements.saveToCase) {
      this.elements.saveToCase.addEventListener (
        'click',
        this.saveToCase.bind (this)
      );
    }

    if (this.elements.closeViewerBtn) {
      this.elements.closeViewerBtn.addEventListener ('click', () => {
        this.elements.container.classList.add ('hidden');
      });
    }
  }

  async viewDocument (caseId, documentId) {
    try {
      // Show loading state
      this.elements.container.classList.remove ('hidden');
      this.elements.previewSection.innerHTML =
        '<div class="loading">加载中...</div>';

      // Load document data
      const document = await window.caseAPI.getDocument (caseId, documentId);
      this.currentDocument = document;
      this.currentCaseId = caseId;

      // Reset state
      this.currentPage = 1;
      this.zoom = 100;
      this.keyValueMap.clear ();

      if (document.processed_text) {
        // Load processed text if available
        for (const [key, value] of Object.entries (document.processed_text)) {
          this.keyValueMap.set (key, value);
        }
      }

      // Render document
      this.renderDocument ();
    } catch (error) {
      console.error (`Failed to load document ${documentId}:`, error);
      this.elements.previewSection.innerHTML =
        '<div class="error">加载文档失败</div>';
    }
  }

  renderDocument () {
    if (!this.currentDocument || !this.currentDocument.ocr_data) {
      return;
    }

    const pagesData = this.currentDocument.ocr_data.pages;
    const totalPages = pagesData.length;

    // Update page info
    this.elements.pageInfo.textContent = `第 ${this.currentPage} 页，共 ${totalPages} 页`;
    this.elements.prevPageBtn.disabled = this.currentPage === 1;
    this.elements.nextPageBtn.disabled = this.currentPage === totalPages;

    // Set preview image
    const pageData = pagesData[this.currentPage - 1];
    this.elements.previewImage.src = pageData.preview;

    // Update zoom
    this.updateZoomDisplay ();

    // Display OCR results
    if (pageData.raw) {
      this.displayOCRResults (pageData.raw);
    }

    // Display KV pairs
    this.updateKVDisplay ();

    // Show viewer
    this.elements.container.classList.remove ('hidden');
  }

  changePage (delta) {
    if (!this.currentDocument) return;

    const pagesData = this.currentDocument.ocr_data.pages;
    const newPage = this.currentPage + delta;

    if (newPage < 1 || newPage > pagesData.length) {
      return;
    }

    this.currentPage = newPage;
    this.renderDocument ();
  }

  zoomChange (delta) {
    const newZoom = this.zoom + delta;
    if (newZoom < 25 || newZoom > 300) {
      return;
    }

    this.zoom = newZoom;
    this.updateZoomDisplay ();
  }

  updateZoomDisplay () {
    this.elements.zoomDisplay.textContent = `${this.zoom}%`;
    this.elements.previewImage.style.transform = `scale(${this.zoom / 100})`;
    this.elements.previewImage.style.transformOrigin = 'top left';
  }

  displayOCRResults (rawText) {
    if (!rawText) {
      this.elements.ocrResults.innerHTML =
        '<div class="empty-state">无OCR结果</div>';
      return;
    }

    const lines = rawText.split ('\n');

    this.elements.ocrResults.innerHTML = lines
      .map ((line, index) => {
        const trimmedLine = line.trim ();
        return trimmedLine
          ? `<div class="ocr-line p-1 hover:bg-gray-100 cursor-pointer select-none" data-index="${index}">
                 ${trimmedLine}
               </div>`
          : '';
      })
      .join ('');

    // Attach line handlers
    const lineElements = this.elements.ocrResults.querySelectorAll (
      '.ocr-line'
    );
    lineElements.forEach (line => {
      line.addEventListener ('click', e => this.handleLineSelection (e, line));
    });
  }

  handleLineSelection (e, line) {
    const lineElements = this.elements.ocrResults.querySelectorAll (
      '.ocr-line'
    );

    // Handle selection based on keyboard modifiers
    if (e.shiftKey && this.lastSelectedLine) {
      // Range selection
      const start = Array.from (lineElements).indexOf (this.lastSelectedLine);
      const end = Array.from (lineElements).indexOf (line);
      const range = Array.from (lineElements).slice (
        Math.min (start, end),
        Math.max (start, end) + 1
      );

      // Clear previous selection
      lineElements.forEach (l => l.classList.remove ('bg-blue-100'));

      // Apply new selection
      range.forEach (l => l.classList.add ('bg-blue-100'));
      this.selectedLines = new Set (range);
    } else if (e.ctrlKey || e.metaKey) {
      // Multi-select
      line.classList.toggle ('bg-blue-100');

      if (!this.selectedLines) {
        this.selectedLines = new Set ();
      }

      if (line.classList.contains ('bg-blue-100')) {
        this.selectedLines.add (line);
      } else {
        this.selectedLines.delete (line);
      }

      this.lastSelectedLine = line;
    } else {
      // Single select
      lineElements.forEach (l => l.classList.remove ('bg-blue-100'));
      line.classList.add ('bg-blue-100');
      this.selectedLines = new Set ([line]);
      this.lastSelectedLine = line;
    }

    // Enable process button if lines are selected
    if (this.elements.processBtn) {
      this.elements.processBtn.disabled =
        !this.selectedLines || this.selectedLines.size === 0;
    }
  }

  processSelection () {
    if (!this.selectedLines || this.selectedLines.size === 0) {
      return;
    }

    const text = Array.from (this.selectedLines)
      .map (line => line.textContent.trim ())
      .join (' ');

    // Detect key-value pattern
    const colonIndex = text.indexOf ('：') !== -1
      ? text.indexOf ('：')
      : text.indexOf (':');

    if (colonIndex !== -1) {
      const key = text.substring (0, colonIndex).trim ();
      const value = text.substring (colonIndex + 1).trim ();

      this.showKeyValueModal (key, value);
    } else {
      this.showKeyValueModal ('', text);
    }
  }

  showKeyValueModal (key, value) {
    const modal = document.getElementById ('key-input-modal');
    const keyInput = document.getElementById ('key-input');
    const valueInput = document.getElementById ('value-input');
    const modalText = document.getElementById ('modal-selected-text');
    const saveBtn = document.getElementById ('modal-save');
    const cancelBtn = document.getElementById ('modal-cancel');

    // Set modal values
    modalText.textContent = `${key}${key ? '：' : ''}${value}`;
    keyInput.value = key;
    valueInput.value = value;

    // Show modal
    modal.classList.remove ('hidden');

    // Handle save
    const handleSave = () => {
      const newKey = keyInput.value.trim ();
      const newValue = valueInput.value.trim ();

      if (newKey) {
        this.keyValueMap.set (newKey, newValue);
        this.updateKVDisplay ();
      }

      modal.classList.add ('hidden');
      saveBtn.removeEventListener ('click', handleSave);
      cancelBtn.removeEventListener ('click', handleCancel);
    };

    // Handle cancel
    const handleCancel = () => {
      modal.classList.add ('hidden');
      saveBtn.removeEventListener ('click', handleSave);
      cancelBtn.removeEventListener ('click', handleCancel);
    };

    // Attach event handlers
    saveBtn.addEventListener ('click', handleSave);
    cancelBtn.addEventListener ('click', handleCancel);
  }

  updateKVDisplay () {
    if (!this.elements.kvDisplay) {
      return;
    }

    if (this.keyValueMap.size === 0) {
      this.elements.kvDisplay.innerHTML =
        '<div class="empty-state">未提取关键信息</div>';
      return;
    }

    const html = Array.from (this.keyValueMap.entries ())
      .map (
        ([key, value]) => `
          <div class="flex gap-2 mb-1 p-1 hover:bg-gray-50">
            <span class="font-semibold min-w-[100px]">${key}:</span>
            <span class="flex-1">${value}</span>
            <div class="flex gap-1">
              <button class="edit-kv px-2 text-blue-500 hover:bg-blue-50 rounded"
                      data-key="${key}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>
              </button>
              <button class="remove-kv px-2 text-red-500 hover:bg-red-50 rounded"
                      data-key="${key}">×</button>
            </div>
          </div>
        `
      )
      .join ('');

    this.elements.kvDisplay.innerHTML = html;

    // Attach handlers
    this.attachKVHandlers ();

    // Enable analyze button
    if (this.elements.analyzeBtn) {
      this.elements.analyzeBtn.disabled = false;
    }
  }

  attachKVHandlers () {
    const editButtons = this.elements.kvDisplay.querySelectorAll ('.edit-kv');
    editButtons.forEach (btn => {
      btn.addEventListener ('click', () => {
        const key = btn.dataset.key;
        const value = this.keyValueMap.get (key);
        this.showKeyValueModal (key, value);
      });
    });

    const removeButtons = this.elements.kvDisplay.querySelectorAll (
      '.remove-kv'
    );
    removeButtons.forEach (btn => {
      btn.addEventListener ('click', () => {
        const key = btn.dataset.key;
        if (confirm (`确定要删除"${key}"吗？`)) {
          this.keyValueMap.delete (key);
          this.updateKVDisplay ();
        }
      });
    });
  }

  async analyzeText () {
    if (!this.currentDocument || this.keyValueMap.size === 0) {
      return;
    }

    try {
      // Show loading
      this.elements.analyzeBtn.disabled = true;
      this.elements.analyzeBtn.textContent = '分析中...';
      this.elements.analysisResults.innerHTML =
        '<div class="loading">分析中...</div>';

      // Get text from key-value pairs
      const text = Array.from (this.keyValueMap.entries ())
        .map (([key, value]) => `${key}: ${value}`)
        .join ('\n');

      // Prepare analysis request
      const response = await fetch ('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify ({text}),
      });

      if (!response.ok) {
        throw new Error (`Analysis error: ${response.status}`);
      }

      const result = await response.json ();

      // Display results with markdown parsing
      this.elements.analysisResults.innerHTML = marked.parse (result.analysis);
    } catch (error) {
      console.error ('Analysis error:', error);
      this.elements.analysisResults.innerHTML = '<div class="error">分析失败</div>';
    } finally {
      this.elements.analyzeBtn.disabled = false;
      this.elements.analyzeBtn.textContent = '分析文本';
    }
  }

  async saveToCase () {
    if (!this.currentDocument || !this.currentCaseId) {
      return;
    }

    try {
      this.elements.saveToCase.disabled = true;
      this.elements.saveToCase.textContent = '保存中...';

      // Convert Map to object
      const processedText = {};
      this.keyValueMap.forEach ((value, key) => {
        processedText[key] = value;
      });

      // Update document in DB
      await window.caseAPI.updateDocument (
        this.currentCaseId,
        this.currentDocument.id,
        {
          processed_text: processedText,
        }
      );

      // Show success message
      alert ('已成功保存到案件');
    } catch (error) {
      console.error ('Save error:', error);
      alert ('保存失败：' + error.message);
    } finally {
      this.elements.saveToCase.disabled = false;
      this.elements.saveToCase.textContent = '保存到案件';
    }
  }
}

// Initialize document viewer
window.documentViewer = new DocumentViewer ();
