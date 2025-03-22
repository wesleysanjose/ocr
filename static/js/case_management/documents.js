// static/js/case_management/main.js

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
      console.error ('No case selected for document upload');
      this.showToast ('请先选择案件', 'error');
      return;
    }

    // Check if file input exists and has a file
    if (!this.elements.fileInput || !this.elements.fileInput.files.length) {
      console.error ('No file selected for upload');
      this.showToast ('请选择要上传的文件', 'error');
      return;
    }

    const file = this.elements.fileInput.files[0];
    const documentType = this.elements.documentTypeSelect
      ? this.elements.documentTypeSelect.value
      : '待分类';

    // Show loading state
    if (this.elements.uploadBtn) {
      this.elements.uploadBtn.disabled = true;
      this.elements.uploadBtn.innerHTML =
        '<span class="spinner"></span> 上传中...';
    }

    // Upload the document
    this.api
      .uploadDocument (this.selectedCase.id, file, documentType)
      .then (response => {
        console.log ('Document uploaded successfully:', response);

        // Reset form
        if (this.elements.uploadForm) {
          this.elements.uploadForm.reset ();
        }

        // Refresh documents list
        this.loadCaseDetail (this.selectedCase.id);

        // Show success message
        this.showToast ('文档上传成功', 'success');
      })
      .catch (error => {
        console.error ('Failed to upload document:', error);
        this.showToast ('文档上传失败', 'error');
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
   */
  CaseManagement.prototype.viewDocument = function (documentId) {
    if (!this.selectedCase) {
      console.error ('No case selected for document viewing');
      return;
    }

    // Get document details
    this.api
      .getDocument (this.selectedCase.id, documentId)
      .then (document => {
        if (window.documentViewer) {
          window.documentViewer.openDocument (
            document.name,
            document.file_path
          );
        } else {
          console.error ('Document viewer not initialized');
          window.open (document.file_path, '_blank');
        }
      })
      .catch (error => {
        console.error ('Failed to get document details:', error);
        this.showToast ('无法查看文档', 'error');
      });
  };

  /**
   * Show a toast notification
   */
  CaseManagement.prototype.showToast = function (message, type = 'info') {
    const toast = document.createElement ('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild (toast);

    // Show the toast
    setTimeout (() => {
      toast.classList.add ('show');
    }, 10);

    // Remove the toast after 3 seconds
    setTimeout (() => {
      toast.classList.remove ('show');
      setTimeout (() => {
        document.body.removeChild (toast);
      }, 300);
    }, 3000);
  };
}) (window.CaseManagement || (window.CaseManagement = {}));
