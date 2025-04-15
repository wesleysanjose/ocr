// static/js/case_management/ui.js

/**
 * UI-related methods for the CaseManagement class
 * This extends the CaseManagement prototype with rendering methods
 */
(function (CaseManagement) {
  /**
     * Renders the case list
     * @param {Array} cases - The cases to render
     */
  CaseManagement.prototype.renderCaseList = function (cases) {
    if (!this.elements.caseList) return;

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
  };

  /**
     * Renders the case detail view
     */
  CaseManagement.prototype.renderCaseDetail = function () {
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
  };

  /**
     * Renders the pagination controls
     */
  CaseManagement.prototype.renderPagination = function () {
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
  };

  /**
     * Renders the documents list
     */
  CaseManagement.prototype.renderDocumentsList = function () {
    if (!this.elements.documentsList) {
      console.warn ('Document list element not found in the DOM');
      return;
    }

    const documents = this.selectedCase.documents || [];
    console.log (
      'Rendering documents list:',
      documents.length,
      'documents found'
    );

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
    console.log ('Documents list HTML rendered successfully');

    // Add view handlers
    const viewButtons = this.elements.documentsList.querySelectorAll (
      '.btn-view'
    );
    console.log (
      `Found ${viewButtons.length} document view buttons to attach handlers to`
    );

    viewButtons.forEach (btn => {
      btn.addEventListener ('click', event => {
        try {
          // Prevent default behavior to avoid page reload
          event.preventDefault ();
          event.stopPropagation ();

          const docId = btn.dataset.id;
          console.log (`View button clicked for document ID: ${docId}`);

          // Check if document viewer is available
          if (window.documentViewer) {
            console.log ('Document viewer is available');
          } else {
            console.warn (
              'Document viewer is NOT available - may open in new tab instead'
            );
          }

          // Log selected case info
          console.log (
            'Current selected case:',
            this.selectedCase
              ? {id: this.selectedCase.id, name: this.selectedCase.name}
              : 'No case selected'
          );

          // Call the view document method
          this.viewDocument (docId);
        } catch (error) {
          console.error ('Error in document view button click handler:', error);
          this.showToast ('查看文档时出错: ' + error.message, 'error');
        }
      });

      // Add a data attribute to indicate handler was attached
      btn.setAttribute ('data-handler-attached', 'true');
    });

    // Verify handlers were attached
    const buttonsWithHandlers = this.elements.documentsList.querySelectorAll (
      '.btn-view[data-handler-attached="true"]'
    );
    console.log (
      `Successfully attached handlers to ${buttonsWithHandlers.length}/${viewButtons.length} buttons`
    );
  };

  /**
     * Shows a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of toast (success or error)
     */
  CaseManagement.prototype.showToast = function (message, type = 'success') {
    // Create toast element if it doesn't exist
    let toast = document.getElementById ('toast');
    if (!toast) {
      toast = document.createElement ('div');
      toast.id = 'toast';
      toast.className =
        'fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-100 transition-opacity duration-300 opacity-0';
      document.body.appendChild (toast);
    }

    // Set toast styling based on type
    if (type === 'success') {
      toast.className =
        'fixed bottom-4 right-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg z-100 transition-opacity duration-300 opacity-0';
    } else if (type === 'error') {
      toast.className =
        'fixed bottom-4 right-4 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg z-100 transition-opacity duration-300 opacity-0';
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
  };

  /**
     * Returns the appropriate CSS class for a status badge
     * @param {string} status - The case status
     * @returns {string} - The CSS class
     */
  CaseManagement.prototype.getStatusBadgeClass = function (status) {
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
  };

  /**
     * Formats a date string
     * @param {string} dateString - The date string to format
     * @returns {string} - The formatted date
     */
  CaseManagement.prototype.formatDate = function (dateString) {
    if (!dateString) return '';
    const date = new Date (dateString);
    return date.toLocaleDateString ('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  /**
     * Formats a date and time string
     * @param {string} dateString - The date string to format
     * @returns {string} - The formatted date and time
     */
  CaseManagement.prototype.formatDateTime = function (dateString) {
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
  };
}) (window.CaseManagement);
