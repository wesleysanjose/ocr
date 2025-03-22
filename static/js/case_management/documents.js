// static/js/case_management/documents.js

/**
 * Document-related methods for the CaseManagement class
 * This extends the CaseManagement prototype with document operations
 */
(function (CaseManagement) {
  /**
   * View a document
   * @param {string} documentId - The ID of the document to view
   */
  CaseManagement.prototype.viewDocument = function (documentId) {
    if (!this.selectedCase) {
      console.error ('No case selected for document view');
      this.showToast ('请先选择案件', 'error');
      return;
    }

    console.log (
      `Attempting to view document: ${documentId} from case: ${this.selectedCase.id}`
    );

    // Ensure document viewer is initialized
    if (!window.documentViewer) {
      console.error ('Document viewer not available');
      this.showToast ('文档查看器未初始化', 'error');

      // Try to initialize document viewer
      if (typeof DocumentViewer === 'function') {
        console.log ('Attempting to initialize document viewer');
        window.documentViewer = new DocumentViewer ();
      } else {
        console.error ('DocumentViewer class not found');
        this.showToast ('文档查看器加载失败', 'error');
        return;
      }
    }

    // Now try to view the document
    try {
      window.documentViewer.viewDocument (this.selectedCase.id, documentId);
    } catch (error) {
      console.error ('Error opening document viewer:', error);
      this.showToast ('打开文档失败: ' + error.message, 'error');
    }
  };

  /**
   * Upload a document to the current case
   */
  CaseManagement.prototype.uploadDocument = function () {
    if (!this.selectedCase) {
      console.error ('No case selected for document upload');
      this.showToast ('请先选择案件', 'error');
      return;
    }

    console.log ('Starting document upload for case:', this.selectedCase.id);

    // Use document upload form from case detail
    const fileInput = document.getElementById ('document-file-input');
    const documentTypeSelect = document.getElementById ('document-type-select');

    console.log ('File input element:', fileInput);
    console.log ('Document type select element:', documentTypeSelect);

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      console.error ('No file selected for upload');
      this.showToast ('请选择文件', 'error');
      return;
    }

    const file = fileInput.files[0];
    const documentType = documentTypeSelect ? documentTypeSelect.value : '待分类';

    console.log (
      `Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}bytes, document type: ${documentType}`
    );

    this.performDocumentUpload (file, documentType);
  };

  /**
   * Perform the actual document upload
   * @param {File} file - The file to upload
   * @param {string} documentType - The document type
   */
  CaseManagement.prototype.performDocumentUpload = async function (
    file,
    documentType
  ) {
    try {
      // Get upload button
      const uploadBtn = document.getElementById ('upload-document-btn');

      // Disable button
      if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = '上传中...';
      }

      console.log (
        `Making upload request to: ${this.api.baseUrl}/${this.selectedCase.id}/documents`
      );

      // Upload file
      const result = await this.api.uploadDocument (
        this.selectedCase.id,
        file,
        documentType
      );

      console.log ('Upload result:', result);

      // Update case data
      if (!this.selectedCase.documents) {
        this.selectedCase.documents = [];
      }

      this.selectedCase.documents.push (result.document);

      // Reset form
      if (this.elements.fileInput) {
        this.elements.fileInput.value = '';
      }

      // Show success message
      this.showToast ('文档上传成功');

      // Refresh documents list
      this.renderDocumentsList ();
    } catch (error) {
      console.error ('Failed to upload document:', error);
      this.showToast ('上传失败: ' + error.message, 'error');
    } finally {
      // Reset button
      const uploadBtn = document.getElementById ('upload-document-btn');
      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = '上传文档';
      }
    }
  };

  /**
   * Setup direct document upload functionality
   */
  CaseManagement.prototype.setupDirectDocumentUpload = function () {
    console.log ('Setting up direct document upload handler');

    // Find the document upload elements
    const fileInput = document.getElementById ('document-file-input');
    const uploadBtn = document.getElementById ('upload-document-btn');
    const documentTypeSelect = document.getElementById ('document-type-select');

    console.log ('Document upload elements:', {
      fileInput: !!fileInput,
      uploadBtn: !!uploadBtn,
      documentTypeSelect: !!documentTypeSelect,
    });

    if (!fileInput || !uploadBtn) {
      console.error ('Document upload elements not found');
      return;
    }

    // Set up file input change handler
    fileInput.addEventListener ('change', function (event) {
      const file = event.target.files[0];
      console.log (`File selected: ${file ? file.name : 'none'}`);

      // Update UI to show selected file
      if (file) {
        const fileName = document.createElement ('div');
        fileName.className = 'mt-2 text-sm text-gray-600';
        fileName.innerHTML = `已选择: <span class="font-medium">${file.name}</span>`;

        // Remove previous file name display if it exists
        const prevFileName = fileInput.parentElement.querySelector ('.text-sm');
        if (prevFileName) {
          prevFileName.remove ();
        }

        fileInput.parentElement.appendChild (fileName);
      }
    });

    // Set up drag and drop
    const dropZone = fileInput.parentElement;
    if (dropZone) {
      // Prevent default drag behaviors
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach (eventName => {
        dropZone.addEventListener (eventName, this.preventDefaults, false);
      });

      // Highlight drop zone when item is dragged over it
      ['dragenter', 'dragover'].forEach (eventName => {
        dropZone.addEventListener (eventName, this.highlight, false);
      });

      ['dragleave', 'drop'].forEach (eventName => {
        dropZone.addEventListener (eventName, this.unhighlight, false);
      });

      // Handle dropped files
      dropZone.addEventListener ('drop', this.handleDrop.bind (this), false);
    }

    // Set up upload button click handler
    uploadBtn.addEventListener ('click', event => {
      event.preventDefault ();
      this.uploadDocument ();
    });
  };

  // Drag and drop helper methods
  CaseManagement.prototype.preventDefaults = function (e) {
    e.preventDefault ();
    e.stopPropagation ();
  };

  CaseManagement.prototype.highlight = function (e) {
    e.currentTarget.classList.add ('border-blue-500');
    e.currentTarget.classList.add ('bg-blue-50');
  };

  CaseManagement.prototype.unhighlight = function (e) {
    e.currentTarget.classList.remove ('border-blue-500');
    e.currentTarget.classList.remove ('bg-blue-50');
  };

  CaseManagement.prototype.handleDrop = function (e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    const fileInput = document.getElementById ('document-file-input');

    if (files.length > 0 && fileInput) {
      fileInput.files = files;
      // Trigger change event
      const event = new Event ('change', {bubbles: true});
      fileInput.dispatchEvent (event);
    }
  };
}) (window.CaseManagement);
