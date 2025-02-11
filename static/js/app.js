class App {
  constructor () {
    this.preview = new PreviewHandler ();
    this.ocr = new OCRProcessor ();
    this.analyzer = new AIAnalyzer ();
    this.initFileUpload ();
  }

  initFileUpload () {
    const fileInput = document.getElementById ('file-upload');
    const uploadStatus = document.getElementById ('upload-status');

    fileInput.addEventListener ('change', async event => {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > CONFIG.upload.maxSize) {
        alert ('文件太大。最大限制为100MB。');
        fileInput.value = '';
        return;
      }

      uploadStatus.classList.remove ('hidden');

      try {
        const formData = new FormData ();
        formData.append ('file', file);

        const response = await fetch ('/api/ocr', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error ('OCR processing failed');
        }

        const result = await response.json ();
        this.preview.updatePreview (result);
      } catch (error) {
        console.error ('Upload error:', error);
        this.ocr.elements.results.innerHTML =
          '<div class="p-4 text-red-500">Error processing file. Please try again.</div>';
      } finally {
        uploadStatus.classList.add ('hidden');
      }
    });
  }
}

// Initialize application when DOM is loaded
document.addEventListener ('DOMContentLoaded', () => {
  window.app = new App ();
});
