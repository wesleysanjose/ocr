// static/js/document_viewer/ocr.js

/**
 * OCR tab functionality for DocumentViewer
 * Responsible for displaying OCR text and handling text selection
 */
(function (DocumentViewer) {
  /**
     * Bind events for the OCR tab
     */
  DocumentViewer.prototype.bindOcrEvents = function () {
    if (this.elements.pageSelectors) {
      this.elements.pageSelectors.forEach (selector => {
        selector.addEventListener ('click', () => {
          const page = parseInt (selector.dataset.page);
          this.showOcrPage (page);
        });
      });
    }

    if (this.elements.clearSelectionBtn) {
      this.elements.clearSelectionBtn.addEventListener ('click', () => {
        this.clearSelection ();
      });
    }

    if (this.elements.processBtn) {
      this.elements.processBtn.addEventListener ('click', () => {
        this.processSelection ();
      });
    }
  };

  /**
     * Display OCR results from raw text
     * @param {string} rawText - The raw OCR text
     */
  DocumentViewer.prototype.displayOCRResults = function (rawText) {
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
          ? `<div class="ocr-line p-1 hover:bg-gray-100 cursor-pointer" data-index="${index}">${trimmedLine}</div>`
          : '';
      })
      .join ('');

    // Attach line handlers
    this.attachLineHandlers ();
  };

  /**
     * Attach click handlers to OCR lines
     */
  DocumentViewer.prototype.attachLineHandlers = function () {
    if (!this.elements.ocrResults) return;

    const lineElements = this.elements.ocrResults.querySelectorAll (
      '.ocr-line'
    );
    lineElements.forEach (line => {
      line.addEventListener ('click', () => this.handleLineClick (line));
    });
  };

  /**
     * Handle click on an OCR line
     * @param {HTMLElement} line - The line element that was clicked
     */
  DocumentViewer.prototype.handleLineClick = function (line) {
    // Toggle selection
    line.classList.toggle ('bg-blue-100');

    if (line.classList.contains ('bg-blue-100')) {
      // Add to selected text
      this.selectedText.push (line.textContent);
    } else {
      // Remove from selected text
      const index = this.selectedText.indexOf (line.textContent);
      if (index !== -1) {
        this.selectedText.splice (index, 1);
      }
    }

    // Update selected text display
    this.updateSelectedTextDisplay ();

    // Enable/disable buttons
    if (this.elements.clearSelectionBtn) {
      this.elements.clearSelectionBtn.disabled = this.selectedText.length === 0;
    }

    if (this.elements.processBtn) {
      this.elements.processBtn.disabled = this.selectedText.length === 0;
    }
  };

  /**
     * Update the selected text display
     */
  DocumentViewer.prototype.updateSelectedTextDisplay = function () {
    if (!this.elements.selectedTextDisplay) return;

    if (this.selectedText.length === 0) {
      this.elements.selectedTextDisplay.innerHTML =
        '<div class="p-2 text-gray-500 text-center">未选择任何文本</div>';
      return;
    }

    this.elements.selectedTextDisplay.innerHTML = this.selectedText
      .map (
        (text, index) => `
          <div class="p-2 bg-gray-50 rounded mb-1 flex justify-between items-center">
            <span class="text-sm">${text}</span>
            <button class="text-red-500 hover:text-red-700" data-index="${index}">×</button>
          </div>
        `
      )
      .join ('');

    // Add delete handlers
    const deleteButtons = this.elements.selectedTextDisplay.querySelectorAll (
      'button'
    );
    deleteButtons.forEach (button => {
      button.addEventListener ('click', e => {
        e.stopPropagation ();
        const index = parseInt (button.dataset.index);
        this.selectedText.splice (index, 1);
        this.updateSelectedTextDisplay ();

        // Update OCR selection display
        const lines = this.elements.ocrResults.querySelectorAll ('.ocr-line');
        lines.forEach (line => {
          if (line.textContent === this.selectedText[index]) {
            line.classList.remove ('bg-blue-100');
          }
        });

        // Enable/disable buttons
        if (this.elements.clearSelectionBtn) {
          this.elements.clearSelectionBtn.disabled =
            this.selectedText.length === 0;
        }

        if (this.elements.processBtn) {
          this.elements.processBtn.disabled = this.selectedText.length === 0;
        }
      });
    });
  };

  /**
     * Clear the text selection
     */
  DocumentViewer.prototype.clearSelection = function () {
    // Clear selected text array
    this.selectedText = [];

    // Update UI
    this.updateSelectedTextDisplay ();

    // Remove selection highlighting
    const lines = this.elements.ocrResults.querySelectorAll ('.ocr-line');
    lines.forEach (line => {
      line.classList.remove ('bg-blue-100');
    });

    // Disable buttons
    if (this.elements.clearSelectionBtn) {
      this.elements.clearSelectionBtn.disabled = true;
    }

    if (this.elements.processBtn) {
      this.elements.processBtn.disabled = true;
    }
  };

  /**
     * Process the selected text and open the field editor modal
     */
  DocumentViewer.prototype.processSelection = function () {
    if (this.selectedText.length === 0) {
      console.warn ('No text selected for processing');
      return;
    }

    // Combine selected text
    const text = this.selectedText.join ('\n');

    // Try to extract key-value pair
    const colonIndex = text.indexOf ('：') !== -1
      ? text.indexOf ('：')
      : text.indexOf (':');

    // Setup modal
    if (colonIndex !== -1) {
      // If colon is found, split text into key and value
      const key = text.substring (0, colonIndex).trim ();
      const value = text.substring (colonIndex + 1).trim ();

      if (this.elements.modalText) {
        this.elements.modalText.textContent = text;
      }

      if (this.elements.keyInput) {
        this.elements.keyInput.value = key;
      }

      if (this.elements.valueInput) {
        this.elements.valueInput.value = value;
      }

      if (this.elements.categorySelect) {
        this.elements.categorySelect.value = this.guessCategory (key);
      }
    } else {
      // If no colon is found
      if (this.elements.modalText) {
        this.elements.modalText.textContent = text;
      }

      if (this.elements.keyInput) {
        this.elements.keyInput.value = '';
      }

      if (this.elements.valueInput) {
        this.elements.valueInput.value = text;
      }

      if (this.elements.categorySelect) {
        this.elements.categorySelect.value = 'personal'; // Default category
      }
    }

    this.showModal ();
  };

  /**
     * Show the edit field modal
     */
  DocumentViewer.prototype.showModal = function () {
    if (this.elements.modal) {
      this.elements.modal.classList.remove ('hidden');

      if (this.elements.keyInput) {
        this.elements.keyInput.focus ();
      }
    }
  };

  /**
     * Hide the edit field modal
     */
  DocumentViewer.prototype.hideModal = function () {
    if (this.elements.modal) {
      this.elements.modal.classList.add ('hidden');
    }
  };

  /**
     * Bind events for the edit field modal
     */
  DocumentViewer.prototype.bindModalEvents = function () {
    if (this.elements.modalSave) {
      this.elements.modalSave.addEventListener ('click', () => {
        this.saveKeyValue ();
      });
    }

    if (this.elements.modalCancel) {
      this.elements.modalCancel.addEventListener ('click', () => {
        this.hideModal ();
      });
    }
  };
}) (window.DocumentViewer);
