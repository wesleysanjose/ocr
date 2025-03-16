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
    console.log ('Initializing document viewer elements');
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

    // Log missing elements for debugging
    console.log ('Document viewer elements:', this.elements);
    const missingElements = [];
    for (const [key, value] of Object.entries (this.elements)) {
      if (!value) {
        missingElements.push (key);
      }
    }

    if (missingElements.length > 0) {
      console.error ('Missing document viewer elements:', missingElements);
    }
  }

  bindEvents () {
    console.log ('Binding document viewer events');

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

    if (this.elements.processBtn) {
      this.elements.processBtn.addEventListener ('click', () => {
        this.processSelection ();
      });
    }
  }

  async viewDocument (caseId, documentId) {
    try {
      console.log (`Viewing document: case=${caseId}, document=${documentId}`);

      // Show loading state
      this.elements.container.classList.remove ('hidden');
      this.showLoader ('正在加载文档...');

      // Load document data
      const document = await window.caseAPI.getDocument (caseId, documentId);
      console.log ('Document data loaded:', document);

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
      this.showError ('加载文档失败');
    }
  }

  showLoader (message = '加载中...') {
    const loaderDiv = document.createElement ('div');
    loaderDiv.className = 'p-4 text-center text-gray-600';
    loaderDiv.id = 'document-loader';
    loaderDiv.textContent = message;

    if (this.elements.previewSection) {
      this.elements.previewSection.innerHTML = '';
      this.elements.previewSection.appendChild (loaderDiv);
    }
  }

  showError (message) {
    const errorDiv = document.createElement ('div');
    errorDiv.className = 'p-4 text-center text-red-600';
    errorDiv.textContent = message;

    if (this.elements.previewSection) {
      this.elements.previewSection.innerHTML = '';
      this.elements.previewSection.appendChild (errorDiv);
    }
  }

  renderDocument () {
    if (!this.currentDocument || !this.currentDocument.ocr_data) {
      console.error ('No document data to render');
      return;
    }

    console.log ('Rendering document', this.currentDocument);
    const pagesData = this.currentDocument.ocr_data.pages;
    const totalPages = pagesData.length;

    // Update page info
    if (this.elements.pageInfo) {
      this.elements.pageInfo.textContent = `第 ${this.currentPage} 页，共 ${totalPages} 页`;
    }

    if (this.elements.prevPageBtn) {
      this.elements.prevPageBtn.disabled = this.currentPage === 1;
    }

    if (this.elements.nextPageBtn) {
      this.elements.nextPageBtn.disabled = this.currentPage === totalPages;
    }

    // Set preview image
    const pageData = pagesData[this.currentPage - 1];
    if (this.elements.previewImage && pageData.preview) {
      this.elements.previewImage.src = pageData.preview;
    }

    // Update zoom
    this.updateZoomDisplay ();

    // Display OCR results
    if (pageData.raw && this.elements.ocrResults) {
      this.displayOCRResults (pageData.raw);
    }

    // Display KV pairs
    this.updateKVDisplay ();

    // Show viewer
    if (this.elements.container) {
      this.elements.container.classList.remove ('hidden');
    }
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
    if (this.elements.zoomDisplay) {
      this.elements.zoomDisplay.textContent = `${this.zoom}%`;
    }

    if (this.elements.previewImage) {
      this.elements.previewImage.style.transform = `scale(${this.zoom / 100})`;
      this.elements.previewImage.style.transformOrigin = 'top left';
    }
  }

  displayOCRResults (rawText) {
    if (!this.elements.ocrResults) {
      console.error ('OCR results element not found');
      return;
    }

    if (!rawText) {
      this.elements.ocrResults.innerHTML =
        '<div class="empty-state">无OCR结果</div>';
      return;
    }

    console.log ('Displaying OCR results:', {
      rawTextLength: rawText.length,
      sample: rawText.substring (0, 100) + '...',
    });

    const lines = rawText.split ('\n');
    this.elements.ocrResults.innerHTML = lines
      .map ((line, index) => {
        const trimmedLine = line.trim ();
        return trimmedLine
          ? `<div class="ocr-line p-1 hover:bg-gray-100 cursor-pointer select-none" 
                  data-index="${index}">${trimmedLine}</div>`
          : '';
      })
      .join ('');

    // Enable process button
    if (this.elements.processBtn) {
      this.elements.processBtn.disabled = false;
    }

    // Attach line handlers
    this.attachLineHandlers ();
  }

  attachLineHandlers () {
    if (!this.elements.ocrResults) return;

    const lineElements = this.elements.ocrResults.querySelectorAll (
      '.ocr-line'
    );
    console.log (`Attaching handlers to ${lineElements.length} OCR lines`);

    lineElements.forEach (line => {
      line.addEventListener ('click', e => this.handleLineSelection (e, line));
    });
  }

  handleLineSelection (e, line) {
    if (!this.elements.ocrResults) return;

    const lineElements = this.elements.ocrResults.querySelectorAll (
      '.ocr-line'
    );

    // Clear previous selection
    lineElements.forEach (l => l.classList.remove ('bg-blue-100'));

    // Select the clicked line
    line.classList.add ('bg-blue-100');
    this.selectedLine = line;

    // Enable process button
    if (this.elements.processBtn) {
      this.elements.processBtn.disabled = false;
    }
  }

  processSelection () {
    if (!this.selectedLine) {
      console.warn ('No line selected for processing');
      return;
    }

    const text = this.selectedLine.textContent.trim ();
    console.log ('Processing selected text:', text);

    // Find colon to split key-value
    const colonIndex = text.indexOf ('：') !== -1
      ? text.indexOf ('：')
      : text.indexOf (':');

    // Setup modal
    const modal = document.getElementById ('key-input-modal');
    const modalText = document.getElementById ('modal-selected-text');
    const keyInput = document.getElementById ('key-input');
    const valueInput = document.getElementById ('value-input');

    if (colonIndex !== -1) {
      const key = text.substring (0, colonIndex).trim ();
      const value = text.substring (colonIndex + 1).trim ();

      if (modalText) modalText.textContent = text;
      if (keyInput) keyInput.value = key;
      if (valueInput) valueInput.value = value;
    } else {
      if (modalText) modalText.textContent = text;
      if (keyInput) keyInput.value = '';
      if (valueInput) valueInput.value = text;
    }

    // Show modal
    if (modal) {
      modal.classList.remove ('hidden');
      if (keyInput) keyInput.focus ();
    }
  }

  updateKVDisplay () {
    if (!this.elements.kvDisplay) {
      console.error ('KV display element not found');
      return;
    }

    if (this.keyValueMap.size === 0) {
      this.elements.kvDisplay.innerHTML =
        '<div class="empty-state text-center text-gray-500 py-4">未提取关键信息</div>';
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
    if (!this.elements.kvDisplay) return;

    // Attach edit handlers
    const editButtons = this.elements.kvDisplay.querySelectorAll ('.edit-kv');
    editButtons.forEach (btn => {
      btn.addEventListener ('click', () => {
        const key = btn.dataset.key;
        const value = this.keyValueMap.get (key);
        this.editKeyValue (key, value);
      });
    });

    // Attach remove handlers
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

  editKeyValue (key, value) {
    const modal = document.getElementById ('key-input-modal');
    const keyInput = document.getElementById ('key-input');
    const valueInput = document.getElementById ('value-input');
    const modalText = document.getElementById ('modal-selected-text');

    // Setup modal
    if (modalText) modalText.textContent = '';
    if (keyInput) keyInput.value = key;
    if (valueInput) valueInput.value = value;

    // Setup save handler
    const saveBtn = document.getElementById ('modal-save');
    const cancelBtn = document.getElementById ('modal-cancel');

    const handleSave = () => {
      const newKey = keyInput.value.trim ();
      const newValue = valueInput.value.trim ();

      if (newKey) {
        // Remove old key if changed
        if (newKey !== key) {
          this.keyValueMap.delete (key);
        }

        // Add new key-value
        this.keyValueMap.set (newKey, newValue);
        this.updateKVDisplay ();

        // Hide modal
        modal.classList.add ('hidden');
      }

      // Remove event listeners
      saveBtn.removeEventListener ('click', handleSave);
      cancelBtn.removeEventListener ('click', handleCancel);
    };

    const handleCancel = () => {
      modal.classList.add ('hidden');
      saveBtn.removeEventListener ('click', handleSave);
      cancelBtn.removeEventListener ('click', handleCancel);
    };

    // Attach event listeners
    saveBtn.addEventListener ('click', handleSave);
    cancelBtn.addEventListener ('click', handleCancel);

    // Show modal
    modal.classList.remove ('hidden');
    keyInput.focus ();
  }

  async saveToCase () {
    if (!this.currentDocument || !this.currentCaseId) {
      console.error ('No document or case selected');
      return;
    }

    try {
      console.log ('Saving to case:', {
        caseId: this.currentCaseId,
        documentId: this.currentDocument.id,
        keyValueMap: Object.fromEntries (this.keyValueMap),
      });

      // Disable save button
      if (this.elements.saveToCase) {
        this.elements.saveToCase.disabled = true;
        this.elements.saveToCase.textContent = '保存中...';
      }

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
      // Reset save button
      if (this.elements.saveToCase) {
        this.elements.saveToCase.disabled = false;
        this.elements.saveToCase.textContent = '保存到案件';
      }
    }
  }
}

// Initialize document viewer
window.documentViewer = new DocumentViewer ();
