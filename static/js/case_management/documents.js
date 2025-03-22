// static/js/case_management/main.js

/**
 * Main CaseManagement class that coordinates all case-related operations
 */
class CaseManagement {
  constructor () {
    console.log ('Initializing CaseManagement');
    this.api = window.caseAPI;
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalCases = 0;
    this.totalPages = 0;
    this.selectedCase = null;
    this.selectedStatus = '全部';

    // Initialize elements object first
    this.elements = {};

    // Initialize components
    this.initElements ();
    this.bindEvents ();

    // Load cases on initialization
    this.loadCases ();

    console.log ('CaseManagement initialized');
  }

  initElements () {
    console.log ('Initializing CaseManagement elements');

    // Initialize elements directly instead of inside a DOMContentLoaded event
    this.elements = {
      caseList: document.getElementById ('case-list'),
      statusTabs: document.getElementById ('status-tabs'),
      newCaseBtn: document.getElementById ('new-case-btn'),
      searchInput: document.getElementById ('search-input'),
      pagination: document.getElementById ('pagination'),

      // Case detail elements
      caseDetail: document.getElementById ('case-detail'),
      emptyState: document.getElementById ('empty-state'),
      caseInfoForm: document.getElementById ('case-info-form'),
      saveChangesBtn: document.getElementById ('save-changes-btn'),
      exportReportBtn: document.getElementById ('export-report-btn'),

      // Document upload - note we're being more explicit about getting elements
      uploadForm: document.getElementById ('document-upload-form'),
      fileInput: document.getElementById ('document-file-input'),
      documentTypeSelect: document.getElementById ('document-type-select'),
      uploadBtn: document.getElementById ('upload-document-btn'),
      documentsList: document.getElementById ('documents-list'),
    };

    // Log any missing elements
    const missingElements = [];
    for (const [key, value] of Object.entries (this.elements)) {
      if (!value) {
        missingElements.push (key);
      }
    }

    if (missingElements.length > 0) {
      console.warn ('Missing CaseManagement elements:', missingElements);
    }
  }

  bindEvents () {
    // Only bind events to elements that exist

    // Status filter clicks
    if (this.elements.statusTabs) {
      const tabs = this.elements.statusTabs.querySelectorAll ('button');
      tabs.forEach (tab => {
        tab.addEventListener ('click', () => {
          this.selectedStatus = tab.dataset.status;
          this.currentPage = 1;
          this.loadCases ();

          // Update active tab
          tabs.forEach (t => t.classList.remove ('active-tab'));
          tab.classList.add ('active-tab');
        });
      });
    }

    // New case button
    if (this.elements.newCaseBtn) {
      this.elements.newCaseBtn.addEventListener ('click', () => {
        if (window.caseForm) {
          window.caseForm.showCreateModal ();
        }
      });
    }

    // Search input
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener (
        'input',
        this.debounce (() => {
          this.currentPage = 1;
          this.loadCases ();
        }, 300)
      );
    }

    // Save changes button
    if (this.elements.saveChangesBtn) {
      this.elements.saveChangesBtn.addEventListener (
        'click',
        this.saveCase.bind (this)
      );
    }

    // Document upload form
    if (this.elements.uploadForm) {
      this.elements.uploadForm.addEventListener ('submit', e => {
        e.preventDefault ();
        this.uploadDocument ();
      });
    }

    // Export report button
    if (this.elements.exportReportBtn) {
      this.elements.exportReportBtn.addEventListener (
        'click',
        this.exportReport.bind (this)
      );
    }
  }

  // Load cases from the API
  async loadCases () {
    try {
      if (!this.elements.caseList) {
        console.warn ('Case list element not found, cannot load cases');
        return;
      }

      // Show loading state
      this.elements.caseList.innerHTML =
        '<div class="p-4 text-gray-500 text-center">加载中...</div>';

      // Get search term
      const searchTerm = this.elements.searchInput
        ? this.elements.searchInput.value
        : '';

      // Make API call
      const result = await this.api.getCases (
        this.selectedStatus,
        this.currentPage,
        this.pageSize
      );

      // Update pagination info
      this.totalCases = result.total;
      this.totalPages = result.pages;

      // Render case list
      this.renderCaseList (result.cases);
      this.renderPagination ();
    } catch (error) {
      console.error ('Failed to load cases:', error);
      if (this.elements.caseList) {
        this.elements.caseList.innerHTML =
          '<div class="p-4 text-red-500 text-center">加载案件失败</div>';
      }
    }
  }

  // Case Detail Management
  async loadCaseDetail (caseId) {
    try {
      console.log (`Loading case detail for ID: ${caseId}`);

      if (!this.elements.caseDetail || !this.elements.emptyState) {
        console.warn ('Case detail elements not found');
        return;
      }

      // Important: Don't modify the HTML content, just show loading indicator
      const loadingIndicator = document.createElement ('div');
      loadingIndicator.className = 'p-4 text-gray-500 text-center';
      loadingIndicator.textContent = '加载中...';

      // Clear any previous content without removing the form
      const detailContainer = this.elements.caseDetail.querySelector (
        '.detail-container'
      );
      if (detailContainer) {
        detailContainer.innerHTML = '';
        detailContainer.appendChild (loadingIndicator);
      } else {
        // If we don't have a detail container, just show the case detail and empty state properly
        this.elements.emptyState.classList.add ('hidden');
        this.elements.caseDetail.classList.remove ('hidden');
      }

      // Load case data
      console.log (`Making API request to: ${this.api.baseUrl}/${caseId}`);
      const caseData = await this.api.getCase (caseId);
      console.log ('Received case data:', caseData);
      this.selectedCase = caseData;

      // Render detail view
      this.renderCaseDetail ();
      // Force visibility of case detail panel
      this.elements.caseDetail.style.display = 'block';
      this.elements.emptyState.style.display = 'none';
    } catch (error) {
      console.error (`Failed to load case ${caseId}:`, error);

      // Show error message without removing form
      const errorMessage = document.createElement ('div');
      errorMessage.className = 'p-4 text-red-500 text-center';
      errorMessage.textContent = '加载案件详情失败';

      const detailContainer = this.elements.caseDetail.querySelector (
        '.detail-container'
      );
      if (detailContainer) {
        detailContainer.innerHTML = '';
        detailContainer.appendChild (errorMessage);
      } else if (this.elements.caseDetail && this.elements.emptyState) {
        // Just make sure the right sections are visible
        this.elements.emptyState.classList.add ('hidden');
        this.elements.caseDetail.classList.remove ('hidden');
      }
    }
  }

  // Utility method for debouncing
  debounce (func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout (timeout);
      timeout = setTimeout (() => func.apply (context, args), wait);
    };
  }
}

// static/js/case_management/documents.js

/**
 * Document-related methods for the CaseManagement class
 * This extends the CaseManagement prototype with document handling methods
 */
(function (CaseManagement) {
  /**
   * Upload a document to the current case
   */
  CaseManagement.prototype.uploadDocument = function () {
    if (!this.selectedCase) {
      console.error('No case selected for document upload');
      this.showToast('请先选择案件', 'error');
      return;
    }

    // Check if file input exists and has a file
    if (!this.elements.fileInput || !this.elements.fileInput.files.length) {
      console.error('No file selected for upload');
      this.showToast('请选择要上传的文件', 'error');
      return;
    }

    const file = this.elements.fileInput.files[0];
    const documentType = this.elements.documentTypeSelect 
      ? this.elements.documentTypeSelect.value 
      : '待分类';

    // Show loading state
    if (this.elements.uploadBtn) {
      this.elements.uploadBtn.disabled = true;
      this.elements.uploadBtn.innerHTML = '<span class="spinner"></span> 上传中...';
    }

    // Upload the document
    this.api.uploadDocument(this.selectedCase.id, file, documentType)
      .then(response => {
        console.log('Document uploaded successfully:', response);
        
        // Reset form
        if (this.elements.uploadForm) {
          this.elements.uploadForm.reset();
        }
        
        // Refresh documents list
        this.loadCaseDetail(this.selectedCase.id);
        
        // Show success message
        this.showToast('文档上传成功', 'success');
      })
      .catch(error => {
        console.error('Failed to upload document:', error);
        this.showToast('文档上传失败', 'error');
      })
      .finally(() => {
        // Reset button state
        if (this.elements.uploadBtn) {
          this.elements.uploadBtn.disabled = false;
          this.elements.uploadBtn.textContent = '上传文档';
        }
      });
  };

  /**
   * View a document
   */
  CaseManagement.prototype.viewDocument = function (documentId) {
    if (!this.selectedCase) {
      console.error('No case selected for document viewing');
      return;
    }

    // Get document details
    this.api.getDocument(this.selectedCase.id, documentId)
      .then(document => {
        if (window.documentViewer) {
          window.documentViewer.openDocument(document.name, document.file_path);
        } else {
          console.error('Document viewer not initialized');
          window.open(document.file_path, '_blank');
        }
      })
      .catch(error => {
        console.error('Failed to get document details:', error);
        this.showToast('无法查看文档', 'error');
      });
  };

  /**
   * Show a toast notification
   */
  CaseManagement.prototype.showToast = function (message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Remove the toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  };

})(window.CaseManagement || (window.CaseManagement = {}));
