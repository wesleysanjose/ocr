// static/js/case_management.js - Handles case management UI logic
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

    this.initElements ();
    this.bindEvents ();
    this.loadCases ();

    console.log ('CaseManagement initialized');
  }

  initElements () {
    console.log ('Initializing CaseManagement elements');

    // Case list elements
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

    // Log the elements we found for debugging
    console.log ('CaseManagement elements:', {
      caseList: !!this.elements.caseList,
      statusTabs: !!this.elements.statusTabs,
      caseDetail: !!this.elements.caseDetail,
      uploadForm: !!this.elements.uploadForm,
      fileInput: !!this.elements.fileInput,
      documentTypeSelect: !!this.elements.documentTypeSelect,
      uploadBtn: !!this.elements.uploadBtn,
      documentsList: !!this.elements.documentsList,
    });

    // Log missing elements
    const missingElements = [];
    for (const [key, value] of Object.entries (this.elements)) {
      if (!value) {
        missingElements.push (key);
      }
    }

    if (missingElements.length > 0) {
      console.error ('Missing CaseManagement elements:', missingElements);
    }
  }

  bindEvents () {
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

  async loadCases () {
    try {
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
      this.elements.caseList.innerHTML =
        '<div class="p-4 text-red-500 text-center">加载案件失败</div>';
    }
  }

  renderCaseList (cases) {
    if (cases.length === 0) {
      this.elements.caseList.innerHTML =
        '<div class="p-4 text-gray-500 text-center">没有找到案件</div>';
      return;
    }

    const html = cases
      .map (
        caseItem => `
        <div class="case-item bg-white p-4 rounded-lg shadow hover:shadow-md cursor-pointer transition-shadow ${this.selectedCase && this.selectedCase.id === caseItem.id ? 'border-l-4 border-blue-500' : ''}" 
             data-id="${caseItem.id}">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-medium">${caseItem.name}</h3>
              <p class="text-sm text-gray-500">${caseItem.case_number}</p>
            </div>
            <span class="${this.getStatusBadgeClass (caseItem.status)}">
              ${caseItem.status}
            </span>
          </div>
          <div class="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
            </svg>
            <span>${caseItem.type}</span>
            <span class="text-gray-300 mx-1">|</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>
            <span>${this.formatDate (caseItem.create_time)}</span>
          </div>
        </div>
      `
      )
      .join ('');

    this.elements.caseList.innerHTML = html;

    // Add click handlers
    const caseItems = this.elements.caseList.querySelectorAll ('.case-item');
    caseItems.forEach (item => {
      item.addEventListener ('click', () => {
        const caseId = item.dataset.id;
        this.loadCaseDetail (caseId);

        // Update selection
        caseItems.forEach (i =>
          i.classList.remove ('border-l-4', 'border-blue-500')
        );
        item.classList.add ('border-l-4', 'border-blue-500');
      });
    });
  }

  getStatusBadgeClass (status) {
    const baseClass = 'px-2 py-1 rounded-full text-sm ';
    switch (status) {
      case '待处理':
        return baseClass + 'bg-yellow-100 text-yellow-800';
      case '进行中':
        return baseClass + 'bg-blue-100 text-blue-800';
      case '待审核':
        return baseClass + 'bg-purple-100 text-purple-800';
      case '已完成':
        return baseClass + 'bg-green-100 text-green-800';
      default:
        return baseClass + 'bg-gray-100 text-gray-800';
    }
  }

  formatDate (dateString) {
    if (!dateString) return '';
    const date = new Date (dateString);
    return date.toLocaleDateString ('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  renderPagination () {
    if (!this.elements.pagination) return;

    if (this.totalPages <= 1) {
      this.elements.pagination.innerHTML = '';
      return;
    }

    let html = '';

    // Previous button
    html += `<button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''} px-3 py-1 border rounded ${this.currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'}" 
                      ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
                上一页
              </button>`;

    // Page numbers
    const maxPages = 5;
    const startPage = Math.max (
      1,
      this.currentPage - Math.floor (maxPages / 2)
    );
    const endPage = Math.min (this.totalPages, startPage + maxPages - 1);

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''} px-3 py-1 border rounded ${i === this.currentPage ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}" 
                        data-page="${i}">${i}</button>`;
    }

    // Next button
    html += `<button class="pagination-btn ${this.currentPage === this.totalPages ? 'disabled' : ''} px-3 py-1 border rounded ${this.currentPage === this.totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'}" 
                      ${this.currentPage === this.totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">
                下一页
              </button>`;

    this.elements.pagination.innerHTML = html;

    // Add click handlers
    const pageBtns = this.elements.pagination.querySelectorAll (
      '.pagination-btn:not(.disabled)'
    );
    pageBtns.forEach (btn => {
      btn.addEventListener ('click', () => {
        this.currentPage = parseInt (btn.dataset.page);
        this.loadCases ();
      });
    });
  }

  async loadCaseDetail (caseId) {
    try {
      console.log (`Loading case detail for ID: ${caseId}`);

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
      } else {
        // Just make sure the right sections are visible
        this.elements.emptyState.classList.add ('hidden');
        this.elements.caseDetail.classList.remove ('hidden');
      }
    }
  }

  renderCaseDetail () {
    if (!this.selectedCase) return;

    console.log ('Showing case detail view and hiding empty state');

    // Make sure the detail view is visible and the empty state is hidden
    this.elements.caseDetail.classList.remove ('hidden');
    this.elements.emptyState.classList.add ('hidden');

    // Log the current display status
    console.log ('Current display status:', {
      caseDetailDisplay: window.getComputedStyle (this.elements.caseDetail)
        .display,
      emptyStateDisplay: window.getComputedStyle (this.elements.emptyState)
        .display,
    });

    // Fill form fields
    const form = this.elements.caseInfoForm;
    if (form) {
      const nameInput = form.querySelector ('#case-name');
      const phoneInput = form.querySelector ('#case-phone');
      const typeSelect = form.querySelector ('#case-type');
      const statusSelect = form.querySelector ('#case-status');
      const caseNumberInput = form.querySelector ('#case-number');
      const createTimeInput = form.querySelector ('#case-create-time');

      if (nameInput) nameInput.value = this.selectedCase.name;
      if (phoneInput) phoneInput.value = this.selectedCase.phone;
      if (typeSelect) typeSelect.value = this.selectedCase.type;
      if (statusSelect) statusSelect.value = this.selectedCase.status;
      if (caseNumberInput)
        caseNumberInput.value = this.selectedCase.case_number;
      if (createTimeInput)
        createTimeInput.value = this.formatDateTime (
          this.selectedCase.create_time
        );

      console.log ('Form fields updated with case data');
    }

    // Render documents list
    this.renderDocumentsList ();

    // Force a reflow to make sure the changes take effect
    void this.elements.caseDetail.offsetHeight;
  }

  formatDateTime (dateString) {
    if (!dateString) return '';
    const date = new Date (dateString);
    return date.toLocaleString ('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  renderDocumentsList () {
    if (!this.elements.documentsList) return;

    const documents = this.selectedCase.documents || [];

    if (documents.length === 0) {
      this.elements.documentsList.innerHTML =
        '<div class="text-center text-gray-500 py-4">尚未上传文档</div>';
      return;
    }

    const html = documents
      .map (
        doc => `
        <div class="document-item border-b p-2 hover:bg-gray-50 flex items-center justify-between" data-id="${doc.id}">
          <div class="flex items-center gap-3">
            <div class="document-icon text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="document-info">
              <div class="document-name font-medium">${doc.filename}</div>
              <div class="document-meta text-sm text-gray-500">
                <span class="document-type">${doc.document_type}</span>
                <span class="mx-1">•</span>
                <span class="document-date">${this.formatDate (doc.upload_time)}</span>
              </div>
            </div>
          </div>
          <div class="document-actions">
            <button class="btn-view px-3 py-1 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50" data-id="${doc.id}">查看</button>
          </div>
        </div>
      `
      )
      .join ('');

    this.elements.documentsList.innerHTML = html;

    // Add view handlers
    const viewButtons = this.elements.documentsList.querySelectorAll (
      '.btn-view'
    );
    viewButtons.forEach (btn => {
      btn.addEventListener ('click', () => {
        const docId = btn.dataset.id;
        this.viewDocument (docId);
      });
    });
  }

  viewDocument (documentId) {
    if (!this.selectedCase) return;

    if (window.documentViewer) {
      window.documentViewer.viewDocument (this.selectedCase.id, documentId);
    } else {
      console.error ('Document viewer not available');
    }
  }

  async saveCase () {
    if (!this.selectedCase) return;

    try {
      // Disable button
      this.elements.saveChangesBtn.disabled = true;
      this.elements.saveChangesBtn.textContent = '保存中...';

      // Get form data
      const form = this.elements.caseInfoForm;
      const nameInput = form.querySelector ('#case-name');
      const phoneInput = form.querySelector ('#case-phone');
      const typeSelect = form.querySelector ('#case-type');
      const statusSelect = form.querySelector ('#case-status');

      // Prepare data
      const caseData = {
        name: nameInput.value.trim (),
        phone: phoneInput.value.trim (),
        type: typeSelect.value,
        status: statusSelect.value,
      };

      // Validate
      if (!caseData.name) {
        alert ('请输入姓名');
        return;
      }

      if (!caseData.phone) {
        alert ('请输入联系电话');
        return;
      }

      // Save case
      await this.api.updateCase (this.selectedCase.id, caseData);

      // Update local data
      this.selectedCase = {
        ...this.selectedCase,
        ...caseData,
      };

      // Show success message
      this.showToast ('保存成功');

      // Refresh case list
      this.loadCases ();
    } catch (error) {
      console.error ('Failed to save case:', error);
      this.showToast ('保存失败: ' + error.message, 'error');
    } finally {
      // Reset button
      this.elements.saveChangesBtn.disabled = false;
      this.elements.saveChangesBtn.textContent = '保存修改';
    }
  }

  async uploadDocument () {
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

    try {
      // Get upload button
      const uploadBtn = document.getElementById ('upload-document-btn');

      // Disable button
      if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = '上传中...';
      }

      // Create FormData object
      const formData = new FormData ();
      formData.append ('file', file);
      formData.append ('document_type', documentType);
      formData.append ('analyze', 'false'); // Set to 'true' to enable auto-analysis

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
      fileInput.value = '';

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
  }

  async exportReport () {
    if (!this.selectedCase) return;

    try {
      // Disable button
      this.elements.exportReportBtn.disabled = true;
      this.elements.exportReportBtn.textContent = '导出中...';

      // TODO: Implement report export
      // This would typically involve a server-side API call to generate a PDF or Excel report

      // For now, let's just show a mock success message
      setTimeout (() => {
        this.showToast ('报告导出功能即将上线');
      }, 1000);
    } catch (error) {
      console.error ('Failed to export report:', error);
      this.showToast ('导出失败: ' + error.message, 'error');
    } finally {
      // Reset button
      this.elements.exportReportBtn.disabled = false;
      this.elements.exportReportBtn.textContent = '导出报告';
    }
  }

  showToast (message, type = 'success') {
    // Create toast element if it doesn't exist
    let toast = document.getElementById ('toast');
    if (!toast) {
      toast = document.createElement ('div');
      toast.id = 'toast';
      toast.className =
        'fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300 opacity-0';
      document.body.appendChild (toast);
    }

    // Set toast styling based on type
    if (type === 'success') {
      toast.className =
        'fixed bottom-4 right-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg transition-opacity duration-300 opacity-0';
    } else if (type === 'error') {
      toast.className =
        'fixed bottom-4 right-4 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg transition-opacity duration-300 opacity-0';
    }

    // Set message
    toast.textContent = message;

    // Show toast
    setTimeout (() => {
      toast.classList.replace ('opacity-0', 'opacity-100');
    }, 10);

    // Hide toast after 3 seconds
    setTimeout (() => {
      toast.classList.replace ('opacity-100', 'opacity-0');
    }, 3000);
  }

  debounce (func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout (timeout);
      timeout = setTimeout (() => func.apply (context, args), wait);
    };
  }
}

// Add this to the end of case_management.js

function testDocumentUpload () {
  console.log ('Testing document upload component...');

  // Get the case management instance
  const caseManagement = window.caseManagement;
  if (!caseManagement) {
    console.error ('Case management instance not found');
    return;
  }

  // Check if elements are properly initialized
  console.log ('Upload elements:', {
    uploadForm: caseManagement.elements.uploadForm,
    fileInput: caseManagement.elements.fileInput,
    documentTypeSelect: caseManagement.elements.documentTypeSelect,
    uploadBtn: caseManagement.elements.uploadBtn,
  });

  // Check event listeners
  if (caseManagement.elements.uploadForm) {
    const listeners = getEventListeners (caseManagement.elements.uploadForm);
    console.log ('Upload form event listeners:', listeners);
  } else {
    console.log ('Upload form element not found, cannot check event listeners');
  }

  // Check the file input element
  const fileInput = caseManagement.elements.fileInput;
  if (fileInput) {
    console.log ('File input element found:', {
      id: fileInput.id,
      type: fileInput.type,
      accept: fileInput.accept,
    });

    // Check if the accept attribute is correctly set
    if (!fileInput.accept) {
      console.warn ('File input accept attribute is not set');
    } else {
      console.log ('File input accept attribute is set to:', fileInput.accept);
    }
  } else {
    console.error ('File input element not found');
  }

  console.log ('Document upload component test complete');
}

// Call this function after the page has loaded
window.addEventListener ('DOMContentLoaded', () => {
  // Wait for case management initialization
  setTimeout (() => {
    if (window.caseManagement) {
      testDocumentUpload ();
    }
  }, 1000);
});

// Helper function to check for DOM event listeners (note: this won't work in all browsers)
function getEventListeners (element) {
  if (typeof element._events !== 'undefined') {
    return element._events;
  } else {
    return 'Cannot access event listeners (not supported in this browser)';
  }
}

// Add this to your case_management.js file

function setupDirectDocumentUpload () {
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
      dropZone.addEventListener (eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach (eventName => {
      dropZone.addEventListener (eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach (eventName => {
      dropZone.addEventListener (eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener ('drop', handleDrop, false);
  }

  // Set up upload button click handler
  uploadBtn.addEventListener ('click', async function (event) {
    event.preventDefault ();

    // Check if we have a case management instance
    if (!window.caseManagement) {
      console.error ('Case management instance not found');
      alert ('系统错误，请刷新页面重试');
      return;
    }

    // Use the case management upload method
    window.caseManagement.uploadDocument ();
  });

  // Helper functions for drag and drop
  function preventDefaults (e) {
    e.preventDefault ();
    e.stopPropagation ();
  }

  function highlight () {
    dropZone.classList.add ('border-blue-500');
    dropZone.classList.add ('bg-blue-50');
  }

  function unhighlight () {
    dropZone.classList.remove ('border-blue-500');
    dropZone.classList.remove ('bg-blue-50');
  }

  function handleDrop (e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
      fileInput.files = files;
      // Trigger change event
      const event = new Event ('change', {bubbles: true});
      fileInput.dispatchEvent (event);
    }
  }

  console.log ('Document upload handler setup complete');
}

// Call this after loading case details
document.addEventListener ('DOMContentLoaded', function () {
  console.log ('DOM content loaded, checking for document upload elements');
  setTimeout (setupDirectDocumentUpload, 1000); // Give time for other scripts to load
});

// Export class
window.CaseManagement = CaseManagement;
