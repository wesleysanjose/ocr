// static/js/document_viewer/main.js

/**
 * Main DocumentViewer class
 * Core functionality and constructor for the document viewer
 */
class DocumentViewer {
  constructor () {
    console.log ('Initializing DocumentViewer...');
    
    try {
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

      console.log ('DocumentViewer initialized successfully');
    } catch (error) {
      console.error('Error during DocumentViewer initialization:', error);
    }
  }

  /**
   * Initialize references to DOM elements
   */
  initElements () {
    console.log ('Initializing document viewer elements');
    try {
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
      
      // Log found elements for debugging
      console.debug('Document viewer container found:', !!this.elements.container);
      console.debug('Document viewer tabs found:', this.elements.tabButtons?.length || 0);
      
      // Verify critical elements
      if (!this.elements.container) {
        throw new Error('Critical element missing: document-viewer container not found');
      }
    } catch (error) {
      console.error('Error initializing document viewer elements:', error);
      throw error; // Re-throw to handle in constructor
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
        // Add hidden class
        this.elements.container.classList.add ('hidden');
        
        // Also reset any inline styles that might override the hidden class
        this.elements.container.style.display = 'none';
        this.elements.container.style.visibility = 'hidden';
        
        console.debug('Document viewer hidden');
      });
    } else {
      console.error ('Close viewer button not found');
    }

    // Tab navigation
    if (this.elements.tabButtons && this.elements.tabButtons.length > 0) {
      this.elements.tabButtons.forEach (tab => {
        tab.addEventListener ('click', () => {
          const tabId = tab.dataset.tab;
          this.switchTab (tabId);
        });
      });
    } else {
      console.error ('Tab buttons not found');
    }

    // All other binding will be done in their respective modules
  }

  /**
   * Show a loading indicator
   * @param {string} message - Loading message to display
   */
  showLoader (message = '加载中...') {
    if (!this.elements.previewSection) {
      console.error ('Preview section not found, cannot show loader');
      return;
    }

    const loaderDiv = document.createElement ('div');
    loaderDiv.className = 'p-4 text-center text-gray-600';
    loaderDiv.id = 'document-loader';
    loaderDiv.innerHTML = `
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500 mb-2"></div>
      <p>${message}</p>
    `;

    this.elements.previewSection.innerHTML = '';
    this.elements.previewSection.appendChild (loaderDiv);
  }

  /**
   * Display an error message
   * @param {string} message - Error message to display
   */
  showError (message) {
    console.error ('Document viewer error:', message);

    if (!this.elements.previewSection) {
      console.error ('Preview section not found, cannot show error');
      return;
    }

    const errorDiv = document.createElement ('div');
    errorDiv.className = 'p-4 text-center text-red-600';
    errorDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p>${message}</p>
    `;

    this.elements.previewSection.innerHTML = '';
    this.elements.previewSection.appendChild (errorDiv);
  }

  /**
   * Switch to a different tab
   * @param {string} tabId - The ID of the tab to switch to
   */
  switchTab (tabId) {
    if (!tabId) {
      console.error ('Tab ID is undefined');
      return;
    }

    console.log (`Switching to tab: ${tabId}`);

    // Update active tab state
    this.activeTab = tabId;

    // Update tab buttons
    if (this.elements.tabButtons) {
      this.elements.tabButtons.forEach (tab => {
        if (tab.dataset.tab === tabId) {
          tab.classList.add ('active');
        } else {
          tab.classList.remove ('active');
        }
      });
    }

    // Update tab contents
    if (this.elements.tabContents) {
      this.elements.tabContents.forEach (content => {
        if (content.id === tabId) {
          content.classList.add ('active');
          // 确保活动标签页内容可滚动
          content.style.maxHeight = 'calc(80vh - 120px)'; // 减去标题和标签栏的高度
          content.style.overflowY = 'auto';
        } else {
          content.classList.remove ('active');
        }
      });
    }

    // Special handling for tabs when switching - for example, updating OCR display
    if (
      tabId === 'ocr-tab' &&
      typeof this.updateSelectedTextDisplay === 'function'
    ) {
      this.updateSelectedTextDisplay ();
    }
  }

  /**
   * Helper method to debug elements in the viewer
   */
  debugElements () {
    console.log ('Document Viewer Elements:');
    for (const [key, value] of Object.entries (this.elements)) {
      console.log (`- ${key}: ${value ? 'Found' : 'Missing'}`);
    }
  }

  /**
   * Open a document for viewing
   * @param {string} documentName - Name of the document
   * @param {string} documentPath - Path to the document file
   * @param {Object} documentObject - Complete document object (optional)
   */
  openDocument (documentName, documentPath, documentObject = null) {
    console.log(`Opening document with name: "${documentName}", path: "${documentPath}"`);
    
    try {
      // 首先显示文档查看器容器（对所有情况都需要）
      if (this.elements.container) {
        console.debug('Making document viewer visible');
        this.elements.container.classList.remove('hidden');
        
        // 添加调试代码，确保元素可见
        console.debug('Document viewer display style:', window.getComputedStyle(this.elements.container).display);
        console.debug('Document viewer visibility:', window.getComputedStyle(this.elements.container).visibility);
        console.debug('Document viewer opacity:', window.getComputedStyle(this.elements.container).opacity);
        console.debug('Document viewer z-index:', window.getComputedStyle(this.elements.container).zIndex);
        console.debug('Document viewer position:', window.getComputedStyle(this.elements.container).position);
        
        // 强制设置样式确保可见
        this.elements.container.style.display = 'block';
        this.elements.container.style.visibility = 'visible';
        this.elements.container.style.opacity = '1';
        this.elements.container.style.zIndex = '9999';
        
        // 添加滚动条样式
        this.elements.container.style.maxHeight = '90vh'; // 设置最大高度为视口高度的90%
        this.elements.container.style.overflowY = 'auto'; // 添加垂直滚动条
        
        // 检查容器尺寸
        console.debug('Container dimensions:', 
          this.elements.container.offsetWidth, 
          'x', 
          this.elements.container.offsetHeight);
      } else {
        console.error('Document viewer container element not found');
        alert('文档查看器未正确初始化，请刷新页面后重试');
        return;
      }
      
      // 如果提供了完整的文档对象，直接使用
      if (documentObject && typeof documentObject === 'object') {
        console.debug('Using provided document object:', documentObject);
        
        // 设置文档标题
        if (this.elements.documentTitle) {
          this.elements.documentTitle.textContent = documentObject.filename || documentName || '未命名文档';
        }
        
        // 直接使用文档对象
        this.currentDocument = documentObject;
        this.totalPages = documentObject.total_pages || documentObject.page_urls?.length || 1;
        this.currentPage = 1;
        
        // 渲染文档
        this.renderDocument();
        return;
      }
      
      // 以下是原有逻辑，当没有提供文档对象时执行
      if (!documentPath) {
        console.error('Document path is missing or empty');
        this.showError('无法打开文档：文档路径无效');
        return;
      }

      // 尝试从案例管理中获取文档
      if (window.caseManagement && window.caseManagement.selectedCase) {
        console.debug('Case management found with selected case:', window.caseManagement.selectedCase.id);
        const caseId = window.caseManagement.selectedCase.id;

        // Find documentId from documentPath or from documents array
        let documentId = null;

        // If we can extract documentId from the path
        if (documentPath) {
          const pathParts = documentPath.split ('/');
          console.debug('Path parts:', pathParts);
          
          // Attempt to find the document ID in the path
          for (const part of pathParts) {
            if (
              part.match(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
              )
            ) {
              documentId = part;
              console.debug('Found document ID in path:', documentId);
              break;
            }
          }
        }

        // If we couldn't extract from path, try to find by name
        if (
          !documentId &&
          documentName &&
          window.caseManagement.selectedCase.documents
        ) {
          console.debug('Searching for document by name:', documentName);
          const doc = window.caseManagement.selectedCase.documents.find (
            d => d.filename === documentName || d.name === documentName
          );
          if (doc) {
            documentId = doc.id;
            console.debug('Found document ID by name:', documentId);
          }
        }

        // Call the existing viewDocument method if we have both IDs
        if (caseId && documentId) {
          console.log(`Viewing document with caseId: ${caseId}, documentId: ${documentId}`);
          this.viewDocument (caseId, documentId);
          return;
        } else {
          console.error('Could not determine document ID', {
            caseId,
            documentId,
            documentName,
            documentPath
          });
        }
      } else {
        console.error('Case management or selected case not available');
      }

      // If we couldn't use the case management approach, fall back to direct loading
      // Set document title
      if (this.elements.documentTitle) {
        this.elements.documentTitle.textContent = documentName || '未命名文档';
      } else {
        console.warn('Document title element not found, cannot set title');
      }

      // Show loading state
      this.showLoader ('正在加载文档...');

      console.debug(`Attempting to load document data from: ${documentPath}`);
      
      // Load document data
      this.loadDocumentData (documentPath)
        .then (documentData => {
          console.debug('Document data loaded successfully:', documentData);
          this.currentDocument = documentData;
          this.renderDocument ();
        })
        .catch (error => {
          console.error ('Error loading document:', error);
          this.showError (`无法加载文档: ${error.message}`);
        });
    } catch (error) {
      console.error('Error in openDocument:', error);
      this.showError(`打开文档时出错: ${error.message}`);
    }
  }

  /**
   * Render the current document in the viewer
   */
  renderDocument () {
    console.log ('Rendering document:', this.currentDocument);

    if (!this.currentDocument) {
      this.showError ('No document data available');
      return;
    }

    // 设置总页数
    this.totalPages = this.currentDocument.total_pages || 
                      this.currentDocument.page_urls?.length || 1;

    // 重置到第一页
    this.currentPage = 1;

    // 更新页面信息
    this.updatePageInfo ();

    // 加载第一页
    this.loadPage (this.currentPage);

    // 切换到预览标签
    this.switchTab ('preview-tab');
  }

  /**
   * Load a specific page of the document
   * @param {number} pageNumber - The page number to load
   */
  loadPage (pageNumber) {
    console.log (`Loading page ${pageNumber}`);

    if (!this.currentDocument) {
      this.showError ('Document data is invalid');
      return;
    }

    if (pageNumber < 1 || pageNumber > this.totalPages) {
      console.error (`Invalid page number: ${pageNumber}`);
      return;
    }

    // 显示加载状态
    this.showLoader (`加载第 ${pageNumber} 页...`);

    // 获取页面URL
    let pageUrl;
    if (this.currentDocument.page_urls && this.currentDocument.page_urls.length > 0) {
      // 新格式：使用page_urls数组中的url属性
      const pageData = this.currentDocument.page_urls[pageNumber - 1];
      pageUrl = pageData ? pageData.url : null;
    } else if (this.currentDocument.preview_url) {
      // 单页文档：使用preview_url
      pageUrl = this.currentDocument.preview_url;
    } else {
      // 旧格式：构建URL
      pageUrl = `${this.currentDocument.base_url}/page-${pageNumber}.png`;
    }

    if (!pageUrl) {
      this.showError(`无法获取第 ${pageNumber} 页的URL`);
      return;
    }

    // 加载图像
    if (this.elements.previewImage) {
      const img = new Image();
      img.onload = () => {
        this.elements.previewImage.src = pageUrl;
        this.elements.previewImage.classList.remove('hidden');

        // 移除加载器
        const loader = document.getElementById('document-loader');
        if (loader && loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
      };

      img.onerror = () => {
        this.showError(`无法加载第 ${pageNumber} 页`);
      };

      img.src = pageUrl;
    } else {
      this.showError('Preview image element not found');
    }

    // 更新当前页面
    this.currentPage = pageNumber;
    this.updatePageInfo();

    // 更新导航按钮
    if (this.elements.prevPageBtn) {
      this.elements.prevPageBtn.disabled = pageNumber <= 1;
    }

    if (this.elements.nextPageBtn) {
      this.elements.nextPageBtn.disabled = pageNumber >= this.totalPages;
    }
  }
}

// Make DocumentViewer available globally
window.DocumentViewer = DocumentViewer;
