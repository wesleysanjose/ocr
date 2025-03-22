// static/js/document-handler.js

class DocumentHandler {
  constructor (apiService) {
    this.api = apiService;
    this.currentDocument = null;
    this.currentPage = 1;
    this.totalPages = 1;
    this.currentZoom = CONFIG.preview.zoom.default;
    this.documentCache = new Map (); // Cache for document previews

    this.initElements ();
    this.bindEvents ();
  }

  initElements () {
    // Document tab elements
    this.documentTab = document.getElementById ('document-tab');
    this.documentList = document.getElementById ('document-list');
    this.documentPreview = document.getElementById ('document-preview');
    this.documentSearch = document.getElementById ('document-search');

    // Preview controls
    this.zoomIn = document.getElementById ('zoom-in');
    this.zoomOut = document.getElementById ('zoom-out');
    this.zoomLevel = document.getElementById ('zoom-level');
    this.prevPage = document.getElementById ('prev-page');
    this.nextPage = document.getElementById ('next-page');
    this.pageInfo = document.getElementById ('page-info');

    // Upload controls
    this.uploadBtn = document.getElementById ('upload-document-btn');
    this.uploadModal = document.getElementById ('upload-modal');
    this.closeUploadBtn = document.getElementById ('close-upload-modal');
    this.uploadForm = document.getElementById ('upload-form');
    this.uploadFile = document.getElementById ('upload-file');
    this.selectedFile = document.getElementById ('selected-file');
    this.cancelUpload = document.getElementById ('cancel-upload');
    this.submitUpload = document.getElementById ('submit-upload');
  }

  bindEvents () {
    // Document list events
    this.documentSearch.addEventListener (
      'input',
      this.handleDocumentSearch.bind (this)
    );

    // Preview control events
    this.zoomIn.addEventListener ('click', () => this.handleZoom ('in'));
    this.zoomOut.addEventListener ('click', () => this.handleZoom ('out'));
    this.prevPage.addEventListener ('click', () => this.handlePageChange (-1));
    this.nextPage.addEventListener ('click', () => this.handlePageChange (1));

    // Upload events
    this.uploadBtn.addEventListener ('click', this.showUploadModal.bind (this));
    this.closeUploadBtn.addEventListener (
      'click',
      this.hideUploadModal.bind (this)
    );
    this.cancelUpload.addEventListener (
      'click',
      this.hideUploadModal.bind (this)
    );
    this.uploadFile.addEventListener (
      'change',
      this.handleFileSelection.bind (this)
    );
    this.uploadForm.addEventListener (
      'submit',
      this.handleDocumentUpload.bind (this)
    );
  }

  // Load documents for a case
  async loadDocuments (caseId) {
    if (!caseId) {
      this.clearDocumentList ();
      this.clearDocumentPreview ();
      return;
    }

    try {
      this.showDocumentListLoading ();
      const result = await this.api.getDocuments (caseId);

      if (result.documents && result.documents.length > 0) {
        this.renderDocumentList (result.documents);
      } else {
        this.showNoDocuments ();
      }
    } catch (error) {
      console.error ('Failed to load documents:', error);
      this.showDocumentError ('Failed to load documents');
    }
  }

  // Render document list
  renderDocumentList (documents) {
    this.documentList.innerHTML = '';

    documents.forEach (doc => {
      const documentItem = document.createElement ('div');
      documentItem.className =
        'document-item p-2 border-b hover:bg-gray-50 cursor-pointer';
      documentItem.dataset.id = doc.id;

      const fileIcon = this.getFileIcon (doc.document_type, doc.filename);

      documentItem.innerHTML = `
          <div class="flex items-start">
            <div class="mr-2 mt-1">
              ${fileIcon}
            </div>
            <div class="flex-1">
              <div class="font-medium text-sm">${doc.filename}</div>
              <div class="text-xs text-gray-500">
                ${doc.page_count} page${doc.page_count !== 1 ? 's' : ''} • 
                ${this.formatDate (doc.created_at)}
              </div>
            </div>
          </div>
        `;

      documentItem.addEventListener ('click', () =>
        this.selectDocument (doc.id, doc.case_id)
      );

      this.documentList.appendChild (documentItem);
    });
  }

  // Get appropriate file icon based on file type
  getFileIcon (docType, filename) {
    const extension = filename.split ('.').pop ().toLowerCase ();

    if (docType === 'pdf' || extension === 'pdf') {
      return '<i class="bx bxs-file-pdf text-red-500 text-xl"></i>';
    } else if (['jpg', 'jpeg', 'png'].includes (extension)) {
      return '<i class="bx bxs-file-image text-blue-500 text-xl"></i>';
    } else {
      return '<i class="bx bxs-file text-gray-500 text-xl"></i>';
    }
  }

  // Format date for display
  formatDate (dateString) {
    const date = new Date (dateString);
    const now = new Date ();
    const diffMs = now - date;
    const diffDays = Math.floor (diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString ();
    }
  }

  // Select and load a document
  async selectDocument (documentId, caseId) {
    if (this.currentDocument === documentId) return;

    // Update UI to show selected document
    const documentItems = this.documentList.querySelectorAll ('.document-item');
    documentItems.forEach (item => {
      item.classList.remove ('active');
      if (item.dataset.id === documentId) {
        item.classList.add ('active');
      }
    });

    this.currentDocument = documentId;
    this.currentPage = 1;

    // Load document preview
    await this.loadDocumentPreview (documentId, caseId, this.currentPage);

    // Notify OCR handler about the document selection
    if (window.app && window.app.ocrHandler) {
      window.app.ocrHandler.loadDocumentOCR (
        documentId,
        caseId,
        this.currentPage
      );
    }
  }

  // Load document preview
  async loadDocumentPreview (documentId, caseId, page) {
    if (!documentId || !caseId) return;

    const cacheKey = `${documentId}_${page}`;

    try {
      this.showPreviewLoading ();

      // Check cache first
      let previewData;
      if (this.documentCache.has (cacheKey)) {
        previewData = this.documentCache.get (cacheKey);
      } else {
        previewData = await this.api.getDocumentPreview (
          documentId,
          caseId,
          page
        );
        this.documentCache.set (cacheKey, previewData);
      }

      this.renderDocumentPreview (previewData);
    } catch (error) {
      console.error ('Failed to load document preview:', error);
      this.showPreviewError ('Failed to load document preview');
    }
  }

  // Render document preview
  renderDocumentPreview (previewData) {
    this.totalPages = previewData.page_count;
    this.currentPage = previewData.page;

    // Create image element
    const img = document.createElement ('img');
    img.src = previewData.image_url;
    img.alt = `Page ${previewData.page}`;
    img.style.transform = `scale(${this.currentZoom / 100})`;
    img.style.transformOrigin = 'top center';

    // Update preview container
    this.documentPreview.innerHTML = '';
    this.documentPreview.appendChild (img);

    // Update page navigation
    this.updatePageNavigation ();
  }

  // Update page navigation controls
  updatePageNavigation () {
    this.pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    this.prevPage.disabled = this.currentPage <= 1;
    this.nextPage.disabled = this.currentPage >= this.totalPages;

    // Show/hide page controls if only one page
    const pageControls = document.querySelector ('.page-controls');
    if (this.totalPages <= 1) {
      pageControls.classList.add ('hidden');
    } else {
      pageControls.classList.remove ('hidden');
    }
  }

  // Handle page navigation
  async handlePageChange (delta) {
    const newPage = this.currentPage + delta;

    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      await this.loadDocumentPreview (
        this.currentDocument,
        window.app.currentCase,
        this.currentPage
      );

      // Update OCR display for the new page
      if (window.app && window.app.ocrHandler) {
        window.app.ocrHandler.loadDocumentOCR (
          this.currentDocument,
          window.app.currentCase,
          this.currentPage
        );
      }
    }
  }

  // Handle zoom controls
  handleZoom (direction) {
    if (direction === 'in') {
      this.currentZoom = Math.min (
        this.currentZoom + CONFIG.preview.zoom.step,
        CONFIG.preview.zoom.max
      );
    } else {
      this.currentZoom = Math.max (
        this.currentZoom - CONFIG.preview.zoom.step,
        CONFIG.preview.zoom.min
      );
    }

    // Update zoom level display
    this.zoomLevel.textContent = `${this.currentZoom}%`;

    // Apply zoom to image
    const previewImage = this.documentPreview.querySelector ('img');
    if (previewImage) {
      previewImage.style.transform = `scale(${this.currentZoom / 100})`;
    }

    // Update button states
    this.zoomIn.disabled = this.currentZoom >= CONFIG.preview.zoom.max;
    this.zoomOut.disabled = this.currentZoom <= CONFIG.preview.zoom.min;
  }

  // Handle document search
  handleDocumentSearch () {
    const searchText = this.documentSearch.value.toLowerCase ();
    const documentItems = this.documentList.querySelectorAll ('.document-item');

    documentItems.forEach (item => {
      const documentName = item
        .querySelector ('.font-medium')
        .textContent.toLowerCase ();
      if (documentName.includes (searchText)) {
        item.classList.remove ('hidden');
      } else {
        item.classList.add ('hidden');
      }
    });
  }

  // Show document list loading state
  showDocumentListLoading () {
    this.documentList.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <div class="loader mx-auto mb-2"></div>
          <p>Loading documents...</p>
        </div>
      `;
  }

  // Show no documents message
  showNoDocuments () {
    this.documentList.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <i class="bx bx-file text-4xl mb-2"></i>
          <p>No documents found</p>
          <p class="text-sm mt-1">Upload a document to get started</p>
        </div>
      `;
  }

  // Show document list error
  showDocumentError (message) {
    this.documentList.innerHTML = `
        <div class="p-8 text-center text-red-500">
          <i class="bx bx-error-circle text-4xl mb-2"></i>
          <p>${message}</p>
        </div>
      `;
  }

  // Show preview loading state
  showPreviewLoading () {
    this.documentPreview.innerHTML = `
        <div class="flex items-center justify-center h-full text-gray-500">
          <div class="text-center">
            <div class="loader mx-auto mb-2"></div>
            <p>Loading preview...</p>
          </div>
        </div>
      `;
  }

  // Show preview error
  showPreviewError (message) {
    this.documentPreview.innerHTML = `
        <div class="flex items-center justify-center h-full text-red-500">
          <div class="text-center">
            <i class="bx bx-error-circle text-6xl mb-2"></i>
            <p>${message}</p>
          </div>
        </div>
      `;
  }

  // Clear document list
  clearDocumentList () {
    this.documentList.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <i class="bx bx-folder-open text-4xl mb-2"></i>
          <p>No case selected</p>
          <p class="text-sm mt-1">Select a case to view documents</p>
        </div>
      `;
  }

  // Clear document preview
  clearDocumentPreview () {
    this.documentPreview.innerHTML = `
        <div class="flex items-center justify-center h-full text-gray-400">
          <div class="text-center">
            <i class="bx bx-file-blank text-6xl"></i>
            <p class="mt-2">Select a document to preview</p>
          </div>
        </div>
      `;

    // Reset navigation
    this.currentDocument = null;
    this.currentPage = 1;
    this.totalPages = 1;
    this.updatePageNavigation ();
  }

  // Show upload modal
  showUploadModal () {
    this.uploadModal.classList.remove ('hidden');
    // Reset form
    this.uploadForm.reset ();
    this.selectedFile.classList.add ('hidden');
    this.selectedFile.textContent = '';
  }

  // Hide upload modal
  hideUploadModal () {
    this.uploadModal.classList.add ('hidden');
  }

  // Handle file selection
  handleFileSelection (event) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.textContent = file.name;
      this.selectedFile.classList.remove ('hidden');

      // Check file size
      if (file.size > CONFIG.upload.maxSize) {
        alert (
          `File is too large. Maximum size is ${CONFIG.upload.maxSize / (1024 * 1024)} MB`
        );
        this.uploadForm.reset ();
        this.selectedFile.classList.add ('hidden');
      }
    } else {
      this.selectedFile.classList.add ('hidden');
    }
  }

  // Handle document upload
  async handleDocumentUpload (event) {
    event.preventDefault ();

    const file = this.uploadFile.files[0];
    if (!file) {
      alert ('Please select a file to upload');
      return;
    }

    const description = document.getElementById ('document-description').value;
    const tags = document
      .getElementById ('document-tags')
      .value.split (',')
      .map (tag => tag.trim ())
      .filter (tag => tag.length > 0);

    // Create form data
    const formData = new FormData ();
    formData.append ('file', file);
    formData.append ('description', description);
    formData.append ('tags', JSON.stringify (tags));

    // Disable form and show loading
    this.submitUpload.disabled = true;
    this.submitUpload.innerHTML = '<div class="loader mx-auto"></div>';

    try {
      await this.api.uploadDocument (window.app.currentCase, formData);

      // Hide modal and reload documents
      this.hideUploadModal ();
      await this.loadDocuments (window.app.currentCase);

      // Notify user
      alert ('Document uploaded successfully');
    } catch (error) {
      console.error ('Upload failed:', error);
      alert ('Upload failed: ' + error.message);
    } finally {
      // Reset button
      this.submitUpload.disabled = false;
      this.submitUpload.textContent = 'Upload';
    }
  }
}
