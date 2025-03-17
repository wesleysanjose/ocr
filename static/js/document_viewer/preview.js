// static/js/document_viewer/preview.js

/**
 * Preview tab functionality for DocumentViewer
 * Responsible for document display, zooming, and page navigation
 */
(function(DocumentViewer) {
    /**
     * Load and display a document
     * @param {string} caseId - The ID of the case containing the document
     * @param {string} documentId - The ID of the document to view
     */
    DocumentViewer.prototype.viewDocument = async function(caseId, documentId) {
      try {
        console.log(`Viewing document: case=${caseId}, document=${documentId}`);
  
        // Show loading state
        this.elements.container.classList.remove('hidden');
        this.showLoader('正在加载文档...');
  
        // Load document data
        const document = await window.caseAPI.getDocument(caseId, documentId);
        console.log('Document data loaded:', document);
  
        this.currentDocument = document;
        this.currentCaseId = caseId;
  
        // Set document title
        if (this.elements.documentTitle) {
          this.elements.documentTitle.textContent = document.filename || '文档查看';
        }
  
        // Reset state
        this.currentPage = 1;
        this.zoom = 100;
        this.keyValueMap.clear();
        this.selectedText = [];
        this.fieldCategories = {
          personal: [],
          medical: [],
          incident: [],
          legal: []
        };
  
        // Load processed text if available
        if (document.processed_text) {
          for (const [key, value] of Object.entries(document.processed_text)) {
            this.keyValueMap.set(key, {
              value: value,
              category: this.guessCategory(key) // Assign a category based on key name
            });
          }
        }
  
        // Render document
        this.renderDocument();
        
        // Activate the first tab by default
        this.switchTab('preview-tab');
      } catch (error) {
        console.error(`Failed to load document ${documentId}:`, error);
        this.showError('加载文档失败: ' + error.message);
      }
    };
    
    /**
     * Bind events for the preview tab
     */
    DocumentViewer.prototype.bindPreviewEvents = function() {
      if (this.elements.prevPageBtn) {
        this.elements.prevPageBtn.addEventListener('click', () => this.changePage(-1));
      }
  
      if (this.elements.nextPageBtn) {
        this.elements.nextPageBtn.addEventListener('click', () => this.changePage(1));
      }
  
      if (this.elements.zoomInBtn) {
        this.elements.zoomInBtn.addEventListener('click', () => this.zoomChange(25));
      }
  
      if (this.elements.zoomOutBtn) {
        this.elements.zoomOutBtn.addEventListener('click', () => this.zoomChange(-25));
      }
    };
  
    /**
     * Render the document with current page and zoom settings
     */
    DocumentViewer.prototype.renderDocument = function() {
      if (!this.currentDocument || !this.currentDocument.ocr_data) {
        console.error('No document data to render');
        return;
      }
  
      console.log('Rendering document', this.currentDocument);
      const pagesData = this.currentDocument.ocr_data.pages;
      this.totalPages = pagesData.length;
  
      // Update page info
      if (this.elements.pageInfo) {
        this.elements.pageInfo.textContent = `第 ${this.currentPage} 页，共 ${this.totalPages} 页`;
      }
  
      // Update page navigation buttons
      if (this.elements.prevPageBtn) {
        this.elements.prevPageBtn.disabled = this.currentPage === 1;
      }
  
      if (this.elements.nextPageBtn) {
        this.elements.nextPageBtn.disabled = this.currentPage === this.totalPages;
      }
  
      // Set preview image
      const pageData = pagesData[this.currentPage - 1];
      if (this.elements.previewImage && pageData && pageData.preview) {
        this.elements.previewImage.src = pageData.preview;
        
        // Add error handling for image
        this.elements.previewImage.onerror = () => {
          this.elements.previewImage.src = '';
          this.elements.previewImage.alt = '预览图片加载失败';
          console.error('Failed to load preview image:', pageData.preview);
        };
      }
  
      // Update zoom
      this.updateZoomDisplay();
  
      // Display OCR results if that function is available
      if (pageData && pageData.raw && typeof this.displayOCRResults === 'function') {
        this.displayOCRResults(pageData.raw);
      }
  
      // Update page selectors
      this.updatePageSelectors(this.totalPages);
  
      // Display KV pairs if that function is available
      if (typeof this.updateKVDisplay === 'function') {
        this.updateKVDisplay();
      }
  
      // Show viewer
      if (this.elements.container) {
        this.elements.container.classList.remove('hidden');
      }
    };
  
    /**
     * Update the page selector UI
     * @param {number} totalPages - Total number of pages in the document
     */
    DocumentViewer.prototype.updatePageSelectors = function(totalPages) {
      // Update existing page selectors to match the total pages
      const selectorContainer = this.elements.pageSelectors[0]?.parentElement;
      if (!selectorContainer) return;
      
      // Clear existing selectors
      selectorContainer.innerHTML = '';
      
      // Create new selectors
      for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.className = `px-2 py-1 ${i === this.currentPage ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'} rounded text-sm mr-1 page-selector`;
        button.dataset.page = i;
        button.textContent = `第${i}页`;
        
        button.addEventListener('click', () => {
          this.showOcrPage(i);
        });
        
        selectorContainer.appendChild(button);
      }
    };
  
    /**
     * Change the current page
     * @param {number} delta - The number of pages to change by (positive or negative)
     */
    DocumentViewer.prototype.changePage = function(delta) {
      if (!this.currentDocument) return;
  
      const pagesData = this.currentDocument.ocr_data.pages;
      const newPage = this.currentPage + delta;
  
      if (newPage < 1 || newPage > pagesData.length) {
        return;
      }
  
      this.currentPage = newPage;
      this.renderDocument();
    };
  
    /**
     * Change the current zoom level
     * @param {number} delta - The amount to change zoom by (positive or negative)
     */
    DocumentViewer.prototype.zoomChange = function(delta) {
      const newZoom = this.zoom + delta;
      if (newZoom < 25 || newZoom > 300) {
        return;
      }
  
      this.zoom = newZoom;
      this.updateZoomDisplay();
    };
  
    /**
     * Update the zoom display with current zoom level
     */
    DocumentViewer.prototype.updateZoomDisplay = function() {
      if (this.elements.zoomDisplay) {
        this.elements.zoomDisplay.textContent = `${this.zoom}%`;
      }
  
      if (this.elements.previewImage) {
        this.elements.previewImage.style.transform = `scale(${this.zoom / 100})`;
        this.elements.previewImage.style.transformOrigin = 'top left';
      }
    };
  
    /**
     * Show a specific page in the OCR tab
     * @param {number} page - The page number to show
     */
    DocumentViewer.prototype.showOcrPage = function(page) {
      // Update current page
      this.currentPage = page;
      
      // Update page selectors
      if (this.elements.pageSelectors) {
        this.elements.pageSelectors.forEach(selector => {
          if (parseInt(selector.dataset.page) === page) {
            selector.classList.add('bg-blue-100', 'text-blue-800');
            selector.classList.remove('text-gray-600', 'hover:bg-gray-100');
          } else {
            selector.classList.remove('bg-blue-100', 'text-blue-800');
            selector.classList.add('text-gray-600', 'hover:bg-gray-100');
          }
        });
      }
      
      // Load OCR content for this page
      const pageData = this.currentDocument?.ocr_data?.pages[page - 1];
      if (pageData && pageData.raw && typeof this.displayOCRResults === 'function') {
        this.displayOCRResults(pageData.raw);
      }
      
      // Update preview image as well
      if (this.elements.previewImage && pageData?.preview) {
        this.elements.previewImage.src = pageData.preview;
      }
      
      // Update page info
      if (this.elements.pageInfo) {
        const totalPages = this.currentDocument?.ocr_data?.pages.length || 1;
        this.elements.pageInfo.textContent = `第 ${page} 页，共 ${totalPages} 页`;
      }
    };
  
  })(window.DocumentViewer);