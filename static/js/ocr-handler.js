// static/js/ocr-handler.js

class OCRHandler {
  constructor (apiService) {
    this.api = apiService;
    this.currentDocument = null;
    this.currentPage = 1;
    this.selectedParagraphs = new Set ();
    this.extractedFields = new Map ();
    this.ocrTextCache = new Map ();

    this.initElements ();
    this.bindEvents ();
  }

  initElements () {
    // OCR text elements
    this.ocrTextContainer = document.getElementById ('ocr-text-container');
    this.extractAllBtn = document.getElementById ('extract-all-btn');
    this.clearSelectionBtn = document.getElementById ('clear-selection-btn');

    // Field elements
    this.fieldsContainer = document.getElementById ('fields-container');
    this.addFieldBtn = document.getElementById ('add-field-btn');
    this.saveFieldsBtn = document.getElementById ('save-fields-btn');

    // Field modal elements
    this.fieldModal = document.getElementById ('field-modal');
    this.closeFieldModalBtn = document.getElementById ('close-field-modal');
    this.fieldForm = document.getElementById ('field-form');
    this.fieldNameInput = document.getElementById ('field-name');
    this.fieldValueInput = document.getElementById ('field-value');
    this.cancelFieldBtn = document.getElementById ('cancel-field');
    this.saveFieldBtn = document.getElementById ('save-field');
  }

  bindEvents () {
    // OCR text events
    this.extractAllBtn.addEventListener (
      'click',
      this.handleExtractAll.bind (this)
    );
    this.clearSelectionBtn.addEventListener (
      'click',
      this.clearSelection.bind (this)
    );

    // Field events
    this.addFieldBtn.addEventListener (
      'click',
      this.showAddFieldModal.bind (this)
    );
    this.saveFieldsBtn.addEventListener ('click', this.saveFields.bind (this));

    // Field modal events
    this.closeFieldModalBtn.addEventListener (
      'click',
      this.hideFieldModal.bind (this)
    );
    this.cancelFieldBtn.addEventListener (
      'click',
      this.hideFieldModal.bind (this)
    );
    this.fieldForm.addEventListener (
      'submit',
      this.handleSaveField.bind (this)
    );
  }

  // Load OCR text for a document page
  async loadDocumentOCR (documentId, caseId, page = 1) {
    if (!documentId || !caseId) {
      this.clearOCRText ();
      return;
    }

    this.currentDocument = documentId;
    this.currentPage = page;

    try {
      this.showOCRLoading ();

      // Check cache first
      const cacheKey = `${documentId}_${page}`;
      let ocrData;

      if (this.ocrTextCache.has (cacheKey)) {
        ocrData = this.ocrTextCache.get (cacheKey);
      } else {
        // Get OCR text from document preview endpoint
        const previewData = await this.api.getDocumentPreview (
          documentId,
          caseId,
          page
        );
        ocrData = previewData.ocr_text || '';
        this.ocrTextCache.set (cacheKey, ocrData);
      }

      this.renderOCRText (ocrData);
    } catch (error) {
      console.error ('Failed to load OCR text:', error);
      this.showOCRError ('Failed to load OCR text');
    }
  }

  // Render OCR text with selectable paragraphs
  renderOCRText (ocrText) {
    this.ocrTextContainer.innerHTML = '';

    if (!ocrText || ocrText.trim () === '') {
      this.showNoOCRText ();
      return;
    }

    // Split text into paragraphs (by newlines or paragraph markers)
    const paragraphs = ocrText.split (/\n+/).filter (p => p.trim () !== '');

    paragraphs.forEach ((paragraph, index) => {
      const paragraphElement = document.createElement ('div');
      paragraphElement.className =
        'ocr-paragraph p-2 hover:bg-blue-50 cursor-pointer';
      paragraphElement.dataset.index = index;
      paragraphElement.innerHTML = `<p>${this.escapeHtml (paragraph)}</p>`;

      // Add click handler for paragraph selection
      paragraphElement.addEventListener ('click', () =>
        this.toggleParagraphSelection (paragraphElement, paragraph)
      );

      this.ocrTextContainer.appendChild (paragraphElement);
    });
  }

  // Toggle paragraph selection
  toggleParagraphSelection (element, text) {
    const index = element.dataset.index;

    if (this.selectedParagraphs.has (index)) {
      // Deselect
      this.selectedParagraphs.delete (index);
      element.classList.remove ('selected');
    } else {
      // Select
      this.selectedParagraphs.add (index);
      element.classList.add ('selected');
    }

    // Update buttons state
    this.updateSelectionButtonsState ();
  }

  // Update selection buttons state based on selection
  updateSelectionButtonsState () {
    this.clearSelectionBtn.disabled = this.selectedParagraphs.size === 0;
  }

  // Clear selection
  clearSelection () {
    this.selectedParagraphs.clear ();

    const paragraphs = this.ocrTextContainer.querySelectorAll (
      '.ocr-paragraph'
    );
    paragraphs.forEach (p => p.classList.remove ('selected'));

    this.updateSelectionButtonsState ();
  }

  // Handle extract all button click
  handleExtractAll () {
    // Select all paragraphs
    const paragraphs = this.ocrTextContainer.querySelectorAll (
      '.ocr-paragraph'
    );

    paragraphs.forEach ((p, index) => {
      p.classList.add ('selected');
      this.selectedParagraphs.add (p.dataset.index);
    });

    this.updateSelectionButtonsState ();

    // Analyze selected text
    this.analyzeSelectedText ();
  }

  // Analyze selected text to extract fields
  analyzeSelectedText () {
    if (this.selectedParagraphs.size === 0) return;

    const selectedTexts = [];
    const paragraphs = this.ocrTextContainer.querySelectorAll (
      '.ocr-paragraph'
    );

    this.selectedParagraphs.forEach (index => {
      const paragraph = paragraphs[index];
      if (paragraph) {
        selectedTexts.push (paragraph.textContent.trim ());
      }
    });

    const combinedText = selectedTexts.join ('\n');

    // Process text to extract key-value pairs
    const fields = this.extractKeyValuePairs (combinedText);

    // Add extracted fields
    fields.forEach ((value, key) => {
      this.addField (key, value);
    });

    // Clear selection after processing
    this.clearSelection ();
  }

  // Extract key-value pairs from text
  extractKeyValuePairs (text) {
    const fields = new Map ();

    // Split text into lines
    const lines = text.split ('\n');

    lines.forEach (line => {
      // Look for patterns like "Key: Value" or "Key - Value"
      const keyValueRegex = /^(.*?)(?::|：|-|－|—|–)(.+)$/;
      const match = line.match (keyValueRegex);

      if (match) {
        const key = match[1].trim ();
        const value = match[2].trim ();

        if (key && value) {
          fields.set (key, value);
        }
      }
    });

    return fields;
  }

  // Add a field to the fields container
  addField (name, value, update = false) {
    // Update or add to extracted fields
    this.extractedFields.set (name, value);

    // If updating, find and update existing field
    if (update) {
      const existingField = this.fieldsContainer.querySelector (
        `[data-field-name="${this.escapeHtml (name)}"]`
      );
      if (existingField) {
        existingField.querySelector ('.field-value').textContent = value;
        return;
      }
    }

    // Create field element
    const fieldElement = document.createElement ('div');
    fieldElement.className = 'field-item bg-gray-50 p-3 rounded mb-2 fade-in';
    fieldElement.dataset.fieldName = name;

    fieldElement.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="font-medium">${this.escapeHtml (name)}</div>
          <div class="flex space-x-1">
            <button class="edit-field text-blue-600 hover:text-blue-800">
              <i class="bx bx-edit"></i>
            </button>
            <button class="delete-field text-red-600 hover:text-red-800">
              <i class="bx bx-trash"></i>
            </button>
          </div>
        </div>
        <div class="mt-1 text-gray-700 field-value">${this.escapeHtml (value)}</div>
      `;

    // Add event listeners to buttons
    const editBtn = fieldElement.querySelector ('.edit-field');
    const deleteBtn = fieldElement.querySelector ('.delete-field');

    editBtn.addEventListener ('click', () =>
      this.showEditFieldModal (name, value)
    );
    deleteBtn.addEventListener ('click', () => this.deleteField (name));

    // Add to container
    this.fieldsContainer.appendChild (fieldElement);
  }

  // Delete a field
  deleteField (name) {
    if (confirm (`Are you sure you want to delete the field "${name}"?`)) {
      this.extractedFields.delete (name);

      const fieldElement = this.fieldsContainer.querySelector (
        `[data-field-name="${this.escapeHtml (name)}"]`
      );
      if (fieldElement) {
        fieldElement.remove ();
      }
    }
  }

  // Show add field modal
  showAddFieldModal () {
    this.fieldModal.classList.remove ('hidden');
    this.fieldNameInput.value = '';
    this.fieldValueInput.value = '';
    this.fieldNameInput.focus ();
  }

  // Show edit field modal
  showEditFieldModal (name, value) {
    this.fieldModal.classList.remove ('hidden');
    this.fieldNameInput.value = name;
    this.fieldValueInput.value = value;
    this.fieldValueInput.focus ();
  }

  // Hide field modal
  hideFieldModal () {
    this.fieldModal.classList.add ('hidden');
    this.fieldForm.reset ();
  }

  // Handle save field form submit
  handleSaveField (event) {
    event.preventDefault ();

    const name = this.fieldNameInput.value.trim ();
    const value = this.fieldValueInput.value.trim ();

    if (!name) {
      alert ('Please enter a field name');
      return;
    }

    // Check if field exists to determine if updating
    const update = this.extractedFields.has (name);

    // Add or update field
    this.addField (name, value, update);

    // Hide modal
    this.hideFieldModal ();
  }

  // Save fields to database (or prepare for report)
  async saveFields () {
    if (this.extractedFields.size === 0) {
      alert ('No fields to save');
      return;
    }

    try {
      // Convert Map to object
      const fieldsObject = {};
      this.extractedFields.forEach ((value, key) => {
        fieldsObject[key] = value;
      });

      // TODO: Save fields to database or pass to report handler

      alert ('Fields saved successfully');
    } catch (error) {
      console.error ('Failed to save fields:', error);
      alert ('Failed to save fields');
    }
  }

  // Get extracted fields
  getExtractedFields () {
    const fieldsObject = {};
    this.extractedFields.forEach ((value, key) => {
      fieldsObject[key] = value;
    });
    return fieldsObject;
  }

  // Show OCR loading state
  showOCRLoading () {
    this.ocrTextContainer.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <div class="loader mx-auto mb-2"></div>
          <p>Loading OCR text...</p>
        </div>
      `;
  }

  // Show no OCR text message
  showNoOCRText () {
    this.ocrTextContainer.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <i class="bx bx-file-blank text-4xl mb-2"></i>
          <p>No OCR text available</p>
        </div>
      `;
  }

  // Show OCR error
  showOCRError (message) {
    this.ocrTextContainer.innerHTML = `
        <div class="p-8 text-center text-red-500">
          <i class="bx bx-error-circle text-4xl mb-2"></i>
          <p>${message}</p>
        </div>
      `;
  }

  // Clear OCR text
  clearOCRText () {
    this.ocrTextContainer.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <i class="bx bx-file-blank text-4xl mb-2"></i>
          <p>Select a document to view OCR text</p>
        </div>
      `;

    this.currentDocument = null;
    this.selectedParagraphs.clear ();
  }

  // Helper function to escape HTML for safe insertion
  escapeHtml (text) {
    const element = document.createElement ('div');
    element.textContent = text;
    return element.innerHTML;
  }
}
