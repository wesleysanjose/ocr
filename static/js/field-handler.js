// static/js/field-handler.js

class FieldHandler {
  constructor (apiService) {
    this.api = apiService;
    this.currentCase = null;
    this.currentDocument = null;
    this.fieldList = [];
    this.selectedFields = new Set ();

    this.initElements ();
    this.bindEvents ();
  }

  initElements () {
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

    // Current field being edited (if any)
    this.editingFieldId = null;
  }

  bindEvents () {
    // Field buttons
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

  // Initialize with data from OCR handler
  initWithOCRData (ocrData) {
    if (!ocrData || Object.keys (ocrData).length === 0) {
      return;
    }

    // Clear existing fields
    this.fieldList = [];
    this.renderFields ();

    // Add fields from OCR data
    Object.entries (ocrData).forEach (([key, value]) => {
      this.addField (key, value);
    });
  }

  // Add a field
  addField (name, value, update = false) {
    // Generate a unique ID for the field
    const fieldId = update && this.editingFieldId
      ? this.editingFieldId
      : `field_${Date.now ()}_${Math.random ().toString (36).substr (2, 9)}`;

    if (update) {
      // Update existing field
      const fieldIndex = this.fieldList.findIndex (f => f.id === fieldId);
      if (fieldIndex !== -1) {
        this.fieldList[fieldIndex] = {id: fieldId, name, value};
      } else {
        // Add as new field
        this.fieldList.push ({id: fieldId, name, value});
      }
    } else {
      // Add new field
      this.fieldList.push ({id: fieldId, name, value});
    }

    // Re-render fields
    this.renderFields ();
    return fieldId;
  }

  // Render all fields
  renderFields () {
    this.fieldsContainer.innerHTML = '';

    if (this.fieldList.length === 0) {
      this.fieldsContainer.innerHTML = `
          <div class="p-8 text-center text-gray-500">
            <p>No fields added yet</p>
            <p class="text-sm mt-1">Select text from OCR or click "Add Field" to create fields</p>
          </div>
        `;
      return;
    }

    // Add each field
    this.fieldList.forEach (field => {
      const fieldElement = document.createElement ('div');
      fieldElement.className = 'field-item bg-gray-50 p-3 rounded mb-2 fade-in';
      fieldElement.dataset.fieldId = field.id;

      fieldElement.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="font-medium">${this.escapeHtml (field.name)}</div>
            <div class="flex space-x-1">
              <button class="edit-field text-blue-600 hover:text-blue-800">
                <i class="bx bx-edit"></i>
              </button>
              <button class="delete-field text-red-600 hover:text-red-800">
                <i class="bx bx-trash"></i>
              </button>
            </div>
          </div>
          <div class="mt-1 text-gray-700 field-value">${this.escapeHtml (field.value)}</div>
        `;

      // Add event listeners
      const editBtn = fieldElement.querySelector ('.edit-field');
      const deleteBtn = fieldElement.querySelector ('.delete-field');

      editBtn.addEventListener ('click', () =>
        this.showEditFieldModal (field.id)
      );
      deleteBtn.addEventListener ('click', () => this.deleteField (field.id));

      // Add to container
      this.fieldsContainer.appendChild (fieldElement);
    });

    // Update save button state
    this.saveFieldsBtn.disabled = this.fieldList.length === 0;
  }

  // Show add field modal
  showAddFieldModal () {
    this.editingFieldId = null;
    this.fieldModal.classList.remove ('hidden');
    this.fieldNameInput.value = '';
    this.fieldValueInput.value = '';
    this.fieldNameInput.focus ();
  }

  // Show edit field modal
  showEditFieldModal (fieldId) {
    const field = this.fieldList.find (f => f.id === fieldId);
    if (!field) return;

    this.editingFieldId = fieldId;
    this.fieldModal.classList.remove ('hidden');
    this.fieldNameInput.value = field.name;
    this.fieldValueInput.value = field.value;
    this.fieldNameInput.focus ();
  }

  // Hide field modal
  hideFieldModal () {
    this.fieldModal.classList.add ('hidden');
    this.fieldForm.reset ();
    this.editingFieldId = null;
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

    // Add or update field
    this.addField (name, value, !!this.editingFieldId);

    // Hide modal
    this.hideFieldModal ();
  }

  // Delete a field
  deleteField (fieldId) {
    if (confirm ('Are you sure you want to delete this field?')) {
      // Remove from fieldList
      this.fieldList = this.fieldList.filter (f => f.id !== fieldId);

      // Re-render fields
      this.renderFields ();
    }
  }

  // Get all fields as object
  getFieldsAsObject () {
    const fields = {};
    this.fieldList.forEach (field => {
      fields[field.name] = field.value;
    });
    return fields;
  }

  // Save fields to server
  async saveFields () {
    if (this.fieldList.length === 0) {
      alert ('No fields to save');
      return;
    }

    if (!this.currentCase || !this.currentDocument) {
      alert ('No case or document selected');
      return;
    }

    try {
      // Convert fields to object
      const fieldsData = this.getFieldsAsObject ();

      // Prepare data to save
      const data = {
        tenant_id: window.app.currentTenant,
        case_id: this.currentCase,
        document_id: this.currentDocument,
        fields: fieldsData,
      };

      // Save fields through API
      // TODO: Update API call when endpoint is available
      // const result = await this.api.saveFields(data);

      alert ('Fields saved successfully');
    } catch (error) {
      console.error ('Failed to save fields:', error);
      alert ('Failed to save fields');
    }
  }

  // Set current case and document
  setContext (caseId, documentId) {
    this.currentCase = caseId;
    this.currentDocument = documentId;
  }

  // Import fields from text
  importFromText (text) {
    if (!text) return;

    // Try to extract key-value pairs
    const lines = text.split ('\n');

    lines.forEach (line => {
      // Look for patterns like "Key: Value" or "Key - Value"
      const keyValueRegex = /^(.*?)(?::|：|-|－|—|–)(.+)$/;
      const match = line.match (keyValueRegex);

      if (match) {
        const key = match[1].trim ();
        const value = match[2].trim ();

        if (key && value) {
          this.addField (key, value);
        }
      }
    });
  }

  // Clear all fields
  clearFields () {
    this.fieldList = [];
    this.renderFields ();
  }

  // Helper function to escape HTML
  escapeHtml (text) {
    if (!text) return '';
    const element = document.createElement ('div');
    element.textContent = text;
    return element.innerHTML;
  }
}
