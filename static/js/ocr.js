class OCRProcessor {
  constructor () {
    this.selectedLines = new Set ();
    this.processedLines = new Set ();
    this.keyValueMap = new Map ();
    this.lastSelected = null;
    this.initializeElements ();
    this.bindEvents ();
  }

  initializeElements () {
    this.elements = {
      results: document.getElementById ('ocr-results'),
      processBtn: document.getElementById ('process-btn'),
      kvDisplay: document.getElementById ('kv-display'),
      modal: document.getElementById ('key-input-modal'),
      modalText: document.getElementById ('modal-selected-text'),
      keyInput: document.getElementById ('key-input'),
      valueInput: document.getElementById ('value-input'),
      modalSave: document.getElementById ('modal-save'),
      modalCancel: document.getElementById ('modal-cancel'),
    };
  }

  bindEvents () {
    this.elements.processBtn.addEventListener ('click', () =>
      this.processSelection ()
    );
    this.elements.modalSave.addEventListener ('click', () =>
      this.saveKeyValue ()
    );
    this.elements.modalCancel.addEventListener ('click', () =>
      this.hideModal ()
    );
  }

  displayResults (raw) {
    if (!raw || typeof raw !== 'string') {
      console.error ('Invalid OCR input:', raw);
      return;
    }

    const lines = raw.split ('\n');
    this.renderLines (lines);
  }

  renderLines (lines) {
    this.elements.results.innerHTML = lines
      .map ((line, index) => {
        const trimmedLine = line.trim ();
        return trimmedLine
          ? `
                    <div class="ocr-line p-1 hover:bg-gray-100 cursor-pointer select-none ${this.processedLines.has (index.toString ()) ? 'bg-gray-300' : ''}" data-index="${index}">
                        ${trimmedLine}
                    </div>
                `
          : '';
      })
      .join ('');

    this.attachLineHandlers ();
  }

  attachLineHandlers () {
    const lineElements = this.elements.results.querySelectorAll ('.ocr-line');
    lineElements.forEach (line => {
      line.addEventListener ('click', e => this.handleLineClick (e, line));
    });
  }

  handleLineClick (e, line) {
    if (this.processedLines.has (line.dataset.index)) return;

    const lineElements = this.elements.results.querySelectorAll ('.ocr-line');

    if (e.shiftKey && this.lastSelected) {
      this.handleRangeSelect (line, lineElements);
    } else if (e.ctrlKey || e.metaKey) {
      this.handleMultiSelect (line);
    } else {
      this.handleSingleSelect (line, lineElements);
    }

    this.elements.processBtn.disabled = this.selectedLines.size === 0;
  }

  handleRangeSelect (line, lineElements) {
    const start = Array.from (lineElements).indexOf (this.lastSelected);
    const end = Array.from (lineElements).indexOf (line);
    const range = Array.from (lineElements).slice (
      Math.min (start, end),
      Math.max (start, end) + 1
    );

    // Filter out processed lines
    this.selectedLines = new Set (
      range.filter (l => !this.processedLines.has (l.dataset.index))
    );

    // Update UI
    lineElements.forEach (l => {
      if (!this.processedLines.has (l.dataset.index)) {
        l.classList.remove ('bg-blue-100');
      }
    });
    Array.from (this.selectedLines).forEach (l =>
      l.classList.add ('bg-blue-100')
    );
  }

  handleMultiSelect (line) {
    if (!this.processedLines.has (line.dataset.index)) {
      line.classList.toggle ('bg-blue-100');
      if (line.classList.contains ('bg-blue-100')) {
        this.selectedLines.add (line);
      } else {
        this.selectedLines.delete (line);
      }
      this.lastSelected = line;
    }
  }

  handleSingleSelect (line, lineElements) {
    lineElements.forEach (l => {
      if (!this.processedLines.has (l.dataset.index)) {
        l.classList.remove ('bg-blue-100');
      }
    });

    if (!this.processedLines.has (line.dataset.index)) {
      line.classList.add ('bg-blue-100');
      this.selectedLines = new Set ([line]);
      this.lastSelected = line;
    }
  }

  processSelection () {
    if (this.selectedLines.size === 0) return;

    const text = Array.from (this.selectedLines)
      .map (line => line.textContent.trim ())
      .join ('');

    // Find the first occurrence of "："or ":" and split properly
    const colonIndex = text.indexOf ('：') !== -1
      ? text.indexOf ('：')
      : text.indexOf (':');

    if (colonIndex !== -1) {
      // If colon is found, split text into key and value
      const key = text.substring (0, colonIndex).trim ();
      const value = text.substring (colonIndex + 1).trim ();

      this.elements.modalText.textContent = text;
      this.elements.keyInput.value = key;
      this.elements.valueInput.value = value;
    } else {
      // If no colon is found
      this.elements.modalText.textContent = text;
      this.elements.keyInput.value = '';
      this.elements.valueInput.value = text;
    }

    this.showModal ();
  }

  showModal () {
    this.elements.modal.classList.remove ('hidden');
    this.elements.keyInput.focus ();
  }

  hideModal () {
    this.elements.modal.classList.add ('hidden');
    this.elements.keyInput.value = '';
    this.elements.valueInput.value = '';
  }

  saveKeyValue () {
    const key = this.elements.keyInput.value.trim ();
    if (!key) {
      alert ('请输入字段名称');
      return;
    }

    const value = this.elements.valueInput.value.trim ();
    this.keyValueMap.set (key, value);
    this.updateKVDisplay ();
    this.hideModal ();
    //this.markProcessed ();
  }

  markProcessed () {
    this.selectedLines.forEach (line => {
      const index = line.dataset.index;
      this.processedLines.add (index);
      line.classList.remove ('bg-blue-100');
      line.classList.add ('bg-gray-300');
    });
    this.selectedLines.clear ();
    this.elements.processBtn.disabled = true;
  }

  updateKVDisplay () {
    this.elements.kvDisplay.innerHTML = Array.from (this.keyValueMap.entries ())
      .map (
        ([key, value]) => `
                <div class="flex gap-2 mb-1 p-1 hover:bg-gray-50">
          <span class="font-semibold min-w-[100px]">${key}:</span>
          <span class="flex-1">${value}</span>
          <div class="flex gap-1">
            <button class="edit-kv px-2 text-blue-500 hover:bg-blue-50 rounded"
                    data-key="${key}" data-value="${value}">
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

    this.attachRemoveHandlers ();

    // Enable analyze button if there are key-value pairs
    const analyzeBtn = document.getElementById ('analyze-btn');
    if (analyzeBtn) {
      analyzeBtn.disabled = this.keyValueMap.size === 0;
    }
  }

  attachRemoveHandlers () {
    const removeButtons = this.elements.kvDisplay.querySelectorAll (
      '.remove-kv'
    );
    removeButtons.forEach (button => {
      button.addEventListener ('click', e => {
        const key = e.target.dataset.key;
        // Add confirmation dialog
        if (confirm (`确定要删除 "${key}" 吗？`)) {
          this.keyValueMap.delete (key);
          this.updateKVDisplay ();
        }
      });
    });
  }

  removeKeyValue (key) {
    this.keyValueMap.delete (key);

    // Find and unmark related lines
    const lineElements = this.elements.results.querySelectorAll ('.ocr-line');
    lineElements.forEach (line => {
      if (line.textContent.includes (key)) {
        const index = line.dataset.index;
        this.processedLines.delete (index);
        line.classList.remove ('bg-gray-300');
      }
    });

    this.updateKVDisplay ();
  }

  getKeyValuePairs () {
    return Object.fromEntries (this.keyValueMap);
  }
}
