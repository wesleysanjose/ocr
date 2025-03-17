// static/js/document_viewer/main.js

/**
 * Main DocumentViewer class
 * Core functionality and constructor for the document viewer
 */
class DocumentViewer {
  constructor () {
    console.log ('Initializing DocumentViewer...');

    // Document state
    this.currentDocument = null;
    this.currentCaseId = null;
    this.currentPage = 1;
    this.totalPages = 1;
    this.zoom = 100;

    // Field data
    this.keyValueMap = new Map ();
    this.selectedText = [];
    this.fieldCategories = {
      personal: [],
      medical: [],
      incident: [],
      legal: [],
    };

    // UI state
    this.activeTab = 'preview-tab';
    this.analysisController = null;

    // Initialize UI elements and bind events
    this.initElements ();
    this.bindEvents ();

    console.log ('DocumentViewer initialized');
  }

  /**
     * Initialize references to DOM elements
     */
  initElements () {
    console.log ('Initializing document viewer elements');
    this.elements = {
      // Main container
      container: document.getElementById ('document-viewer'),
      closeViewerBtn: document.getElementById ('close-viewer'),
      documentTitle: document.getElementById ('document-title'),

      // Tab navigation
      tabButtons: document.querySelectorAll ('.document-tab'),
      tabContents: document.querySelectorAll ('.document-tab-content'),

      // Preview tab elements
      previewSection: document.getElementById ('preview-section'),
      previewImage: document.getElementById ('preview-image'),
      pageInfo: document.getElementById ('page-info'),
      prevPageBtn: document.getElementById ('prev-page'),
      nextPageBtn: document.getElementById ('next-page'),
      zoomInBtn: document.getElementById ('zoom-in'),
      zoomOutBtn: document.getElementById ('zoom-out'),
      zoomDisplay: document.getElementById ('zoom-level'),

      // OCR tab elements
      ocrResults: document.getElementById ('ocr-results'),
      pageSelectors: document.querySelectorAll ('.page-selector'),
      selectedTextDisplay: document.getElementById ('selected-text-display'),
      clearSelectionBtn: document.getElementById ('clear-selection-btn'),
      processBtn: document.getElementById ('process-btn'),

      // Organize tab elements
      kvDisplay: document.getElementById ('kv-display'),
      fieldCategoryTabs: document.querySelectorAll ('.field-category-tab'),
      categoryHeaders: document.querySelectorAll ('.category-header'),
      categoryContents: document.querySelectorAll ('.category-content'),
      addCustomFieldBtn: document.getElementById ('add-custom-field'),
      copyAllFieldsBtn: document.getElementById ('copy-all-fields'),
      applyToReportBtn: document.getElementById ('apply-to-report'),

      // Report tab elements
      reportTemplate: document.getElementById ('report-template'),
      loadTemplateBtn: document.getElementById ('load-template'),
      previewReportBtn: document.getElementById ('preview-report'),
      saveReportBtn: document.getElementById ('save-report'),
      exportPdfBtn: document.getElementById ('export-pdf'),

      // Analysis tab elements
      analysisScope: document.getElementById ('analysis-scope'),
      analysisPrompt: document.getElementById ('analysis-prompt'),
      analyzeBtn: document.getElementById ('analyze-btn'),
      cancelAnalyzeBtn: document.getElementById ('cancel-analyze-btn'),
      resetPromptBtn: document.getElementById ('reset-prompt-btn'),
      analysisResults: document.getElementById ('analysis-results'),

      // Modal elements
      modal: document.getElementById ('key-input-modal'),
      modalText: document.getElementById ('modal-selected-text'),
      keyInput: document.getElementById ('key-input'),
      valueInput: document.getElementById ('value-input'),
      categorySelect: document.getElementById ('category-select'),
      modalSave: document.getElementById ('modal-save'),
      modalCancel: document.getElementById ('modal-cancel'),
    };

    // Log missing elements for debugging
    const missingElements = [];
    for (const [key, value] of Object.entries (this.elements)) {
      if (!value && !key.includes ('Btn') && !key.includes ('tab')) {
        missingElements.push (key);
      }
    }

    if (missingElements.length > 0) {
      console.error ('Missing document viewer elements:', missingElements);
    }
  }

  /**
     * Bind event handlers to DOM elements
     */
  bindEvents () {
    console.log ('Binding document viewer events');

    // Close button
    if (this.elements.closeViewerBtn) {
      this.elements.closeViewerBtn.addEventListener ('click', () => {
        this.elements.container.classList.add ('hidden');
      });
    }

    // Tab navigation
    this.elements.tabButtons.forEach (tab => {
      tab.addEventListener ('click', () => {
        const tabId = tab.dataset.tab;
        this.switchTab (tabId);
      });
    });

    // All other binding will be done in their respective modules
  }

  /**
     * Show a loading indicator
     * @param {string} message - Loading message to display
     */
  showLoader (message = '加载中...') {
    const loaderDiv = document.createElement ('div');
    loaderDiv.className = 'p-4 text-center text-gray-600';
    loaderDiv.id = 'document-loader';
    loaderDiv.innerHTML = `
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500 mb-2"></div>
        <p>${message}</p>
      `;

    if (this.elements.previewSection) {
      this.elements.previewSection.innerHTML = '';
      this.elements.previewSection.appendChild (loaderDiv);
    }
  }

  /**
     * Display an error message
     * @param {string} message - Error message to display
     */
  showError (message) {
    const errorDiv = document.createElement ('div');
    errorDiv.className = 'p-4 text-center text-red-600';
    errorDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>${message}</p>
      `;

    if (this.elements.previewSection) {
      this.elements.previewSection.innerHTML = '';
      this.elements.previewSection.appendChild (errorDiv);
    }
  }

  /**
     * Switch to a different tab
     * @param {string} tabId - The ID of the tab to switch to
     */
  switchTab (tabId) {
    // Update active tab state
    this.activeTab = tabId;

    // Update tab buttons
    this.elements.tabButtons.forEach (tab => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add ('active');
      } else {
        tab.classList.remove ('active');
      }
    });

    // Update tab contents
    this.elements.tabContents.forEach (content => {
      if (content.id === tabId) {
        content.classList.add ('active');
      } else {
        content.classList.remove ('active');
      }
    });

    // Special handling for tabs - implemented in other modules
  }
}

// Make DocumentViewer available globally
window.DocumentViewer = DocumentViewer;
