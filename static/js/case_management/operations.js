// static/js/case_management/operations.js

/**
 * Case operation methods for the CaseManagement class
 * This extends the CaseManagement prototype with methods for saving, exporting, etc.
 */
(function (CaseManagement) {
  /**
     * Save the current case
     */
  CaseManagement.prototype.saveCase = async function () {
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
  };

  /**
     * Export report for the current case
     */
  CaseManagement.prototype.exportReport = async function () {
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
  };

  /**
     * Test document upload functionality
     * This is a developer helper method
     */
  CaseManagement.prototype.testDocumentUpload = function () {
    console.log ('Testing document upload component...');

    // Check if elements are properly initialized
    console.log ('Upload elements:', {
      uploadForm: this.elements.uploadForm,
      fileInput: this.elements.fileInput,
      documentTypeSelect: this.elements.documentTypeSelect,
      uploadBtn: this.elements.uploadBtn,
    });

    // Check the file input element
    const fileInput = this.elements.fileInput;
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
        console.log (
          'File input accept attribute is set to:',
          fileInput.accept
        );
      }
    } else {
      console.error ('File input element not found');
    }

    console.log ('Document upload component test complete');
  };
}) (window.CaseManagement);


// Add this function to operations.js which extends the CaseManagement prototype

/**
 * Sets up direct document upload functionality
 * This allows documents to be uploaded directly from the case detail view
 */
CaseManagement.prototype.setupDirectDocumentUpload = function() {
  console.log('Setting up direct document upload...');
  
  // Check if upload elements exist - more robust checking
  if (!this.elements.uploadForm) {
    console.warn('Document upload form not found, creating one dynamically');
    
    // Find a suitable container to add the form to
    const documentSection = document.querySelector('.document-section') || 
                           document.getElementById('case-detail');
    
    if (documentSection) {
      // Create a form element dynamically
      const uploadForm = document.createElement('form');
      uploadForm.id = 'document-upload-form';
      uploadForm.className = 'mt-4 p-4 border border-dashed border-gray-300 rounded';
      uploadForm.innerHTML = `
        <div class="mb-3">
          <label for="document-file-input" class="block text-sm font-medium text-gray-700 mb-1">
            选择文件
          </label>
          <input type="file" id="document-file-input" 
                 class="w-full p-2 border border-gray-300 rounded" 
                 accept=".pdf,.jpg,.jpeg,.png">
        </div>
        <div class="mb-3">
          <label for="document-type-select" class="block text-sm font-medium text-gray-700 mb-1">
            文档类型
          </label>
          <select id="document-type-select" class="w-full p-2 border border-gray-300 rounded">
            <option value="待分类">待分类</option>
            <option value="病历">病历</option>
            <option value="诊断证明">诊断证明</option>
            <option value="检查报告">检查报告</option>
            <option value="事故认定书">事故认定书</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <button type="submit" id="upload-document-btn" 
                class="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          上传文档
        </button>
      `;
      
      // Add the form to the document
      documentSection.appendChild(uploadForm);
      
      // Update the elements reference
      this.elements.uploadForm = uploadForm;
      this.elements.fileInput = document.getElementById('document-file-input');
      this.elements.documentTypeSelect = document.getElementById('document-type-select');
      this.elements.uploadBtn = document.getElementById('upload-document-btn');
      
      console.log('Created document upload form dynamically');
    } else {
      console.error('Could not find a suitable container for the upload form');
      return;
    }
  }
  
  // Now that we've ensured the form exists, set up the event listener
  this.elements.uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (typeof this.uploadDocument === 'function') {
      this.uploadDocument();
    } else {
      console.error('uploadDocument method not found');
    }
  });
  
  // Add drag and drop support for the upload area if it exists
  const uploadArea = document.getElementById('document-upload-area') || this.elements.uploadForm;
  if (uploadArea) {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.add('border-blue-500', 'bg-blue-50');
      }, false);
    });
    
    // Remove highlight when item is dragged out or dropped
    ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
      }, false);
    });
    
    // Handle dropped files
    uploadArea.addEventListener('drop', (e) => {
      if (!this.selectedCase) {
        if (typeof this.showToast === 'function') {
          this.showToast('请先选择案件', 'error');
        } else {
          alert('请先选择案件');
        }
        return;
      }
      
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files.length > 0 && this.elements.fileInput) {
        this.elements.fileInput.files = files;
        // Trigger file input change event
        const event = new Event('change', { bubbles: true });
        this.elements.fileInput.dispatchEvent(event);
      }
    }, false);
  }
  
  console.log('Direct document upload setup complete');
};
