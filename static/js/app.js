class App {
  constructor () {
    //this.preview = new PreviewHandler ();
    //this.ocr = new OCRProcessor ();
    //this.analyzer = new AIAnalyzer ();
    //this.initFileUpload ();
  }

  initFileUpload () {
    // Use the correct ID from your HTML
    const fileInput = document.getElementById ('document-file-input');
    const uploadStatus = document.getElementById ('upload-status');

    // Check if elements exist before adding event listeners
    if (!fileInput) {
      console.error (
        'File input element not found with ID: document-file-input'
      );
      return;
    }

    fileInput.addEventListener ('change', async event => {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > CONFIG.upload.maxSize) {
        alert ('文件太大。最大限制为100MB。');
        fileInput.value = '';
        return;
      }

      // Check if uploadStatus exists before using it
      if (uploadStatus) {
        uploadStatus.classList.remove ('hidden');

        // Update progress text if it exists
        const progressText = uploadStatus.querySelector ('.progress-text');
        if (progressText) {
          progressText.textContent = '准备上传...';
        }
      }

      try {
        const formData = new FormData ();
        formData.append ('file', file);

        // Update progress if element exists
        if (uploadStatus) {
          const progressText = uploadStatus.querySelector ('.progress-text');
          if (progressText) {
            progressText.textContent = '正在上传文件...';
          }
        }

        const response = await fetch ('/api/ocr', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error ('OCR processing failed');
        }

        // Update progress if element exists
        if (uploadStatus) {
          const progressText = uploadStatus.querySelector ('.progress-text');
          if (progressText) {
            progressText.textContent = '正在处理文档...';
          }
        }

        const result = await response.json ();

        // Check if preview exists before using it
        if (this.preview && typeof this.preview.updatePreview === 'function') {
          this.preview.updatePreview (result);
        } else {
          console.warn (
            'Preview handler not initialized or missing updatePreview method'
          );
        }
      } catch (error) {
        console.error ('Upload error:', error);

        // Check if ocr exists before using it
        if (this.ocr && this.ocr.elements && this.ocr.elements.results) {
          this.ocr.elements.results.innerHTML =
            '<div class="p-4 text-red-500">Error processing file. Please try again.</div>';
        } else {
          console.warn ('OCR processor not initialized or missing elements');
        }
      } finally {
        // Hide upload status if it exists
        if (uploadStatus) {
          uploadStatus.classList.add ('hidden');
        }
      }
    });
  }
}

// Initialize application when DOM is loaded
document.addEventListener ('DOMContentLoaded', () => {
  window.app = new App ();
});
