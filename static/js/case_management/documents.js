// static/js/case_management/documents.js

/**
 * Document-related methods for the CaseManagement class
 * This extends the CaseManagement prototype with document handling methods
 */
(function (CaseManagement) {
  // Debug flag - can be toggled in console for troubleshooting
  const DEBUG = false;

  /**
   * Logger utility for document operations
   */
  const logger = {
    debug: function (message, ...args) {
      if (DEBUG) console.debug (`[Documents] ${message}`, ...args);
    },
    info: function (message, ...args) {
      console.info (`[Documents] ${message}`, ...args);
    },
    warn: function (message, ...args) {
      console.warn (`[Documents] ${message}`, ...args);
    },
    error: function (message, ...args) {
      console.error (`[Documents] ${message}`, ...args);
    },
  };

  /**
   * Upload a document to the current case
   * @returns {Promise} Resolves when upload completes
   */
  CaseManagement.prototype.uploadDocument = function () {
    logger.debug ('uploadDocument called');

    // Validate case selection
    if (!this.selectedCase) {
      logger.error ('No case selected for document upload');
      this.showToast ('请先选择案件', 'error');
      return Promise.reject (new Error ('No case selected'));
    }

    // Validate file input
    if (!this.elements.fileInput) {
      logger.error ('File input element not found');
      this.showToast ('上传组件未初始化', 'error');
      return Promise.reject (new Error ('File input not found'));
    }

    if (!this.elements.fileInput.files.length) {
      logger.error ('No file selected for upload');
      this.showToast ('请选择要上传的文件', 'error');
      return Promise.reject (new Error ('No file selected'));
    }

    const file = this.elements.fileInput.files[0];

    // Validate file size (100MB max)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      logger.error (`File too large: ${file.size} bytes`);
      this.showToast ('文件太大，最大限制为100MB', 'error');
      return Promise.reject (new Error ('File too large'));
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];

    if (!allowedTypes.includes (file.type)) {
      logger.error (`Invalid file type: ${file.type}`);
      this.showToast ('不支持的文件类型，请上传PDF或图片', 'error');
      return Promise.reject (new Error ('Invalid file type'));
    }

    const documentType = this.elements.documentTypeSelect
      ? this.elements.documentTypeSelect.value
      : '待分类';

    // Show loading state
    if (this.elements.uploadBtn) {
      this.elements.uploadBtn.disabled = true;
      this.elements.uploadBtn.innerHTML =
        '<span class="spinner"></span> 上传中...';
    }

    logger.info (`Uploading document to case ${this.selectedCase.id}`, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      documentType: documentType,
    });

    // Upload the document with timeout and retry logic
    let retryCount = 0;
    const MAX_RETRIES = 2;

    const attemptUpload = () => {
      return new Promise ((resolve, reject) => {
        // Set a timeout for the API call
        const timeoutId = setTimeout (() => {
          reject (new Error ('Upload request timed out'));
        }, 60000); // 60 second timeout

        this.api
          .uploadDocument (this.selectedCase.id, file, documentType)
          .then (response => {
            clearTimeout (timeoutId);
            resolve (response);
          })
          .catch (error => {
            clearTimeout (timeoutId);
            reject (error);
          });
      });
    };

    return attemptUpload ()
      .catch (error => {
        if (retryCount < MAX_RETRIES) {
          logger.warn (
            `Upload failed, retrying (${retryCount + 1}/${MAX_RETRIES})`,
            error
          );
          retryCount++;
          return attemptUpload ();
        }
        throw error;
      })
      .then (response => {
        logger.info ('Document uploaded successfully', response);

        // Reset form
        if (this.elements.uploadForm) {
          this.elements.uploadForm.reset ();
        }

        // Refresh documents list
        this.loadCaseDetail (this.selectedCase.id);

        // Show success message
        this.showToast ('文档上传成功', 'success');
        return response;
      })
      .catch (error => {
        logger.error ('Failed to upload document', error);

        // Show appropriate error message based on error type
        if (error.message === 'Upload request timed out') {
          this.showToast ('上传超时，请检查网络连接', 'error');
        } else if (error.name === 'AbortError') {
          this.showToast ('上传已取消', 'warning');
        } else if (error.message && error.message.includes ('Network')) {
          this.showToast ('网络错误，请检查连接', 'error');
        } else {
          this.showToast ('文档上传失败', 'error');
        }

        throw error;
      })
      .finally (() => {
        // Reset button state
        if (this.elements.uploadBtn) {
          this.elements.uploadBtn.disabled = false;
          this.elements.uploadBtn.textContent = '上传文档';
        }
      });
  };

  /**
   * View a document
   * @param {string} documentId - ID of the document to view
   * @returns {Promise} Resolves when document is opened
   */
  CaseManagement.prototype.viewDocument = function (documentId) {
    logger.debug (`viewDocument called for document ${documentId}`);

    if (!this.selectedCase) {
      logger.error ('No case selected for document viewing');
      this.showToast ('请先选择案件', 'error');
      return Promise.reject (new Error ('No case selected'));
    }

    if (!documentId) {
      logger.error ('No document ID provided');
      this.showToast ('文档ID无效', 'error');
      return Promise.reject (new Error ('Invalid document ID'));
    }

    // Show loading indicator
    const loadingToast = this.showToast ('正在加载文档...', 'info', false);

    // Get document details with timeout
    return new Promise ((resolve, reject) => {
      const timeoutId = setTimeout (() => {
        reject (new Error ('Document fetch timed out'));
      }, 30000); // 30 second timeout

      this.api
        .getDocument (this.selectedCase.id, documentId)
        .then (document => {
          clearTimeout (timeoutId);
          resolve (document);
        })
        .catch (error => {
          clearTimeout (timeoutId);
          reject (error);
        });
    })
      .then (document => {
        logger.info ('Document fetched successfully', document);

        // Remove loading toast
        if (loadingToast && loadingToast.parentNode) {
          document.body.removeChild (loadingToast);
        }

        if (!document || !document.file_path) {
          throw new Error ('Invalid document data received');
        }

        if (window.documentViewer) {
          window.documentViewer.openDocument (
            document.name || '未命名文档',
            document.file_path
          );
        } else {
          logger.warn ('Document viewer not initialized, opening in new tab');
          window.open (document.file_path, '_blank');
        }

        return document;
      })
      .catch (error => {
        logger.error ('Failed to get document details', error);

        // Remove loading toast
        if (loadingToast && loadingToast.parentNode) {
          document.body.removeChild (loadingToast);
        }

        // Show appropriate error message
        if (error.message === 'Document fetch timed out') {
          this.showToast ('文档加载超时', 'error');
        } else if (error.message && error.message.includes ('Network')) {
          this.showToast ('网络错误，请检查连接', 'error');
        } else {
          this.showToast ('无法查看文档', 'error');
        }

        throw error;
      });
  };

  /**
   * Delete a document
   * @param {string} documentId - ID of the document to delete
   * @returns {Promise} Resolves when document is deleted
   */
  CaseManagement.prototype.deleteDocument = function (documentId) {
    logger.debug (`deleteDocument called for document ${documentId}`);

    if (!this.selectedCase) {
      logger.error ('No case selected for document deletion');
      this.showToast ('请先选择案件', 'error');
      return Promise.reject (new Error ('No case selected'));
    }

    if (!documentId) {
      logger.error ('No document ID provided for deletion');
      this.showToast ('文档ID无效', 'error');
      return Promise.reject (new Error ('Invalid document ID'));
    }

    // Confirm deletion
    if (!confirm ('确定要删除此文档吗？此操作无法撤销。')) {
      logger.debug ('Document deletion cancelled by user');
      return Promise.resolve (false);
    }

    logger.info (
      `Deleting document ${documentId} from case ${this.selectedCase.id}`
    );

    return this.api
      .deleteDocument (this.selectedCase.id, documentId)
      .then (() => {
        logger.info ('Document deleted successfully');
        this.loadCaseDetail (this.selectedCase.id);
        this.showToast ('文档已删除', 'success');
        return true;
      })
      .catch (error => {
        logger.error ('Failed to delete document', error);
        this.showToast ('删除文档失败', 'error');
        throw error;
      });
  };

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type of toast (info, success, warning, error)
   * @param {boolean} autoRemove - Whether to auto-remove the toast
   * @returns {HTMLElement} The toast element
   */
  CaseManagement.prototype.showToast = function (
    message,
    type = 'info',
    autoRemove = true
  ) {
    const toast = document.createElement ('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Add accessibility attributes
    toast.setAttribute ('role', 'alert');
    toast.setAttribute ('aria-live', 'assertive');

    document.body.appendChild (toast);

    // Show the toast
    setTimeout (() => {
      toast.classList.add ('show');
    }, 10);

    // Remove the toast after 3 seconds if autoRemove is true
    if (autoRemove) {
      setTimeout (() => {
        toast.classList.remove ('show');
        setTimeout (() => {
          if (toast.parentNode) {
            document.body.removeChild (toast);
          }
        }, 300);
      }, 3000);
    }

    return toast;
  };

  /**
   * Enable debug mode for document operations
   */
  CaseManagement.prototype.enableDocumentDebug = function () {
    window.DEBUG_DOCUMENTS = true;
    logger.info ('Document debug mode enabled');
    return 'Document debug mode enabled. Check console for detailed logs.';
  };

  /**
   * Show the document viewer with the specified document
   * @param {Object} document - The document to display
   */
  CaseManagement.prototype.showDocumentViewer = function (document) {
    logger.debug ('Showing document viewer for document', document);

    if (!window.documentViewer) {
      logger.error ('Document viewer not initialized');
      this.showToast ('文档查看器未初始化', 'error');
      return;
    }

    // Set the current document
    window.documentViewer.loadDocument (document);

    // Show the viewer
    const viewerElement = document.getElementById ('document-viewer');
    if (viewerElement) {
      viewerElement.classList.remove ('hidden');
      viewerElement.classList.add ('active');
    } else {
      logger.error ('Document viewer element not found');
      this.showToast ('无法显示文档查看器', 'error');
    }
  };
}) (window.CaseManagement || (window.CaseManagement = {}));
