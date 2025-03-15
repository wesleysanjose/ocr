/**
 * Case Management UI functionality
 */
class CaseManager {
  constructor () {
    this.currentCase = null;
    this.currentOcrText = null;
    this.initElements ();
    this.bindEvents ();
    this.loadCases ();
  }

  initElements () {
    // Case management elements
    this.elements = {
      // Case list view
      caseListContainer: document.getElementById ('case-list-container'),
      caseSearchInput: document.getElementById ('case-search-input'),
      caseFilterBtn: document.getElementById ('case-filter-btn'),
      createCaseBtn: document.getElementById ('create-case-btn'),

      // Case detail view
      caseDetailContainer: document.getElementById ('case-detail-container'),
      caseInfoContainer: document.getElementById ('case-info-container'),
      caseDocumentsContainer: document.getElementById (
        'case-documents-container'
      ),
      uploadDocumentBtn: document.getElementById ('upload-document-btn'),

      // Case forms
      createCaseForm: document.getElementById ('create-case-form'),
      createCaseSubmitBtn: document.getElementById ('create-case-submit'),
      createCaseCloseBtn: document.getElementById ('create-case-close'),
      addCustomFieldBtn: document.getElementById ('add-custom-field-btn'),
      customFieldsContainer: document.getElementById (
        'custom-fields-container'
      ),

      // Document upload
      documentUploadForm: document.getElementById ('document-upload-form'),
      documentFileInput: document.getElementById ('document-file-input'),
      documentUploadSubmitBtn: document.getElementById (
        'document-upload-submit'
      ),
      documentUploadCloseBtn: document.getElementById ('document-upload-close'),
      runOcrCheckbox: document.getElementById ('run-ocr-checkbox'),

      // Document viewer
      documentViewerModal: document.getElementById ('document-viewer-modal'),
      documentViewerTitle: document.getElementById ('document-viewer-title'),
      documentViewerContent: document.getElementById (
        'document-viewer-content'
      ),
      documentViewerCloseBtn: document.getElementById ('document-viewer-close'),

      // OCR results
      ocrResultsModal: document.getElementById ('ocr-results-modal'),
      ocrResultsContent: document.getElementById ('ocr-results-content'),
      ocrResultsCloseBtn: document.getElementById ('ocr-results-close'),
      analyzeOcrTextBtn: document.getElementById ('analyze-ocr-text-btn'),

      // Analysis results
      analysisResultsModal: document.getElementById ('analysis-results-modal'),
      analysisResultsContent: document.getElementById (
        'analysis-results-content'
      ),
      analysisResultsCloseBtn: document.getElementById (
        'analysis-results-close'
      ),
    };
  }

  bindEvents () {
    // Case list events
    if (this.elements.createCaseBtn) {
      this.elements.createCaseBtn.addEventListener ('click', () =>
        this.showCreateCaseForm ()
      );
    }

    if (this.elements.caseSearchInput) {
      this.elements.caseSearchInput.addEventListener ('input', () =>
        this.searchCases ()
      );
    }

    if (this.elements.caseFilterBtn) {
      this.elements.caseFilterBtn.addEventListener ('click', () =>
        this.showFilterOptions ()
      );
    }

    // Case form events
    if (this.elements.createCaseForm) {
      this.elements.createCaseForm.addEventListener ('submit', e => {
        e.preventDefault ();
        this.createCase ();
      });
    }

    if (this.elements.createCaseCloseBtn) {
      this.elements.createCaseCloseBtn.addEventListener ('click', () =>
        this.hideCreateCaseForm ()
      );
    }

    if (this.elements.addCustomFieldBtn) {
      this.elements.addCustomFieldBtn.addEventListener ('click', () =>
        this.addCustomField ()
      );
    }

    // Document upload events
    if (this.elements.uploadDocumentBtn) {
      this.elements.uploadDocumentBtn.addEventListener ('click', () =>
        this.showDocumentUploadForm ()
      );
    }

    if (this.elements.documentUploadForm) {
      this.elements.documentUploadForm.addEventListener ('submit', e => {
        e.preventDefault ();
        this.uploadDocument ();
      });
    }

    if (this.elements.documentUploadCloseBtn) {
      this.elements.documentUploadCloseBtn.addEventListener ('click', () =>
        this.hideDocumentUploadForm ()
      );
    }

    // Document viewer events
    if (this.elements.documentViewerCloseBtn) {
      this.elements.documentViewerCloseBtn.addEventListener ('click', () =>
        this.hideDocumentViewer ()
      );
    }

    // OCR results events
    if (this.elements.ocrResultsCloseBtn) {
      this.elements.ocrResultsCloseBtn.addEventListener ('click', () =>
        this.hideOcrResults ()
      );
    }

    if (this.elements.analyzeOcrTextBtn) {
      this.elements.analyzeOcrTextBtn.addEventListener ('click', () =>
        this.analyzeCurrentOcrText ()
      );
    }

    // Analysis results events
    if (this.elements.analysisResultsCloseBtn) {
      this.elements.analysisResultsCloseBtn.addEventListener ('click', () =>
        this.hideAnalysisResults ()
      );
    }
  }

  // Document actions
  viewDocument (materialId) {
    fetch (`/api/documents/${materialId}`)
      .then (response => response.json ())
      .then (document => {
        this.elements.documentViewerTitle.textContent =
          document.filename || 'Document Viewer';

        // Create iframe to display document
        const iframe = document.createElement ('iframe');
        iframe.className = 'w-full h-full border-0';
        iframe.src = `/api/documents/${materialId}/content`;

        // Clear previous content and add iframe
        this.elements.documentViewerContent.innerHTML = '';
        this.elements.documentViewerContent.appendChild (iframe);

        // Show the modal
        this.elements.documentViewerModal.classList.remove ('hidden');
      })
      .catch (error => {
        console.error ('Error viewing document:', error);
        this.showError ('Failed to load document');
      });
  }

  hideDocumentViewer () {
    this.elements.documentViewerModal.classList.add ('hidden');
    this.elements.documentViewerContent.innerHTML = '';
  }

  runOCR (materialId) {
    // Show loading state
    this.showInfo ('Running OCR, please wait...');

    fetch (`/api/documents/${materialId}/ocr`, {
      method: 'POST',
    })
      .then (response => response.json ())
      .then (result => {
        if (result.success) {
          this.showSuccess ('OCR completed successfully');
          this.showOCRResults (materialId, result.ocr_results);
        } else {
          this.showError (result.error || 'Failed to run OCR');
        }
      })
      .catch (error => {
        console.error ('Error running OCR:', error);
        this.showError ('Failed to run OCR');
      });
  }

  showOCRResults (materialId, ocrResults) {
    // Extract text from OCR results
    let text = '';

    if (ocrResults.data && ocrResults.data.pages) {
      // Multiple pages format
      for (const page of ocrResults.data.pages) {
        if (page.text) {
          text += page.text + '\n\n';
        }
      }
    } else if (ocrResults.data && ocrResults.data.text) {
      // Single text field format
      text = ocrResults.data.text;
    }

    // Store current OCR text for analysis
    this.currentOcrText = text;
    this.currentMaterialId = materialId;

    // Display OCR results
    this.elements.ocrResultsContent.innerHTML = `
            <div class="mb-4">
                <h3 class="text-lg font-medium mb-2">OCR Results</h3>
                <div class="text-sm text-gray-500 mb-2">
                    Processed with: ${ocrResults.processor || 'Unknown'} 
                    on ${new Date (ocrResults.timestamp).toLocaleString ()}
                </div>
            </div>
            <div class="bg-gray-50 p-4 rounded border overflow-auto h-96 font-mono text-sm whitespace-pre-wrap">
                ${text || 'No text extracted'}
            </div>
        `;

    // Show the modal
    this.elements.ocrResultsModal.classList.remove ('hidden');
  }

  hideOcrResults () {
    this.elements.ocrResultsModal.classList.add ('hidden');
  }

  analyzeCurrentOcrText () {
    if (!this.currentOcrText || !this.currentMaterialId) {
      this.showError ('No OCR text available for analysis');
      return;
    }

    // Show loading state
    this.showInfo ('Analyzing text, please wait...');

    fetch (`/api/documents/${this.currentMaterialId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify ({
        text: this.currentOcrText,
      }),
    })
      .then (response => response.json ())
      .then (result => {
        if (result.analysis) {
          this.showSuccess ('Analysis completed successfully');
          this.showAnalysisResults (result.analysis);
        } else {
          this.showError (result.error || 'Failed to analyze text');
        }
      })
      .catch (error => {
        console.error ('Error analyzing text:', error);
        this.showError ('Failed to analyze text');
      });
  }

  analyzeDocument (materialId) {
    // Show loading state
    this.showInfo ('Analyzing document, please wait...');

    fetch (`/api/documents/${materialId}/analyze`, {
      method: 'POST',
    })
      .then (response => response.json ())
      .then (result => {
        if (result.analysis) {
          this.showSuccess ('Analysis completed successfully');
          this.showAnalysisResults (result.analysis);
        } else {
          this.showError (result.error || 'Failed to analyze document');
        }
      })
      .catch (error => {
        console.error ('Error analyzing document:', error);
        this.showError ('Failed to analyze document');
      });
  }

  showAnalysisResults (analysis) {
    // Format analysis results
    let analysisHtml = '';

    if (typeof analysis === 'string') {
      // Simple text analysis
      analysisHtml = `
                <div class="bg-gray-50 p-4 rounded border overflow-auto h-96 whitespace-pre-wrap">
                    ${analysis}
                </div>
            `;
    } else if (typeof analysis === 'object') {
      // Structured analysis
      analysisHtml = `
                <div class="bg-gray-50 p-4 rounded border overflow-auto h-96">
                    ${this.formatStructuredAnalysis (analysis)}
                </div>
            `;
    }

    // Display analysis results
    this.elements.analysisResultsContent.innerHTML = `
            <div class="mb-4">
                <h3 class="text-lg font-medium mb-2">Analysis Results</h3>
            </div>
            ${analysisHtml}
        `;

    // Show the modal
    this.elements.analysisResultsModal.classList.remove ('hidden');
  }

  formatStructuredAnalysis (analysis) {
    if (Array.isArray (analysis)) {
      return `
                <ul class="list-disc pl-5">
                    ${analysis
                      .map (
                        item =>
                          `<li>${this.formatStructuredAnalysis (item)}</li>`
                      )
                      .join ('')}
                </ul>
            `;
    } else if (typeof analysis === 'object' && analysis !== null) {
      return `
                <div class="mb-2">
                    ${Object.entries (analysis)
                      .map (([key, value]) => `
                        <div class="mb-2">
                            <span class="font-medium">${key}:</span> 
                            <div class="pl-4">${this.formatStructuredAnalysis (value)}</div>
                        </div>
                    `)
                      .join ('')}
                </div>
            `;
    } else {
      return String (analysis);
    }
  }

  hideAnalysisResults () {
    this.elements.analysisResultsModal.classList.add ('hidden');
  }

  // Notification functions
  showSuccess (message) {
    this.showNotification (message, 'success');
  }

  showError (message) {
    this.showNotification (message, 'error');
  }

  showInfo (message) {
    this.showNotification (message, 'info');
  }

  showNotification (message, type = 'info') {
    // Create notification element
    const notification = document.createElement ('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded shadow-lg z-50 ${type === 'success' ? 'bg-green-500 text-white' : type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`;
    notification.textContent = message;

    // Add to document
    document.body.appendChild (notification);

    // Remove after timeout
    setTimeout (() => {
      notification.classList.add (
        'opacity-0',
        'transition-opacity',
        'duration-500'
      );
      setTimeout (() => {
        document.body.removeChild (notification);
      }, 500);
    }, 3000);
  }
}

// Initialize case manager when DOM is loaded
document.addEventListener ('DOMContentLoaded', () => {
  const caseManager = new CaseManager ();
});
