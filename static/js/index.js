document.addEventListener ('DOMContentLoaded', () => {
  // Ensure we only create one instance
  if (typeof CaseManagement === 'function' && !window.caseManagement) {
    window.caseManagement = new CaseManagement ();

    // Add new case button handler
    const newCaseBtn = document.getElementById ('new-case-btn');
    if (newCaseBtn) {
      newCaseBtn.addEventListener ('click', () => {
        if (window.caseForm) {
          window.caseForm.showCreateModal ();
        }
      });
    }
  } else if (window.caseManagement) {
    console.log ('CaseManagement already initialized');
  } else {
    console.error (
      'CaseManagement class not found. Make sure case_management.js is loaded correctly.'
    );
  }
});

// Add this at the end of your index.js file

// Debug function to check document viewer initialization
window.debugDocumentViewer = function() {
  console.log('Document Viewer Debug:');
  console.log('- Initialized:', window.documentViewer ? 'Yes' : 'No');
  
  if (window.documentViewer) {
    console.log('- Elements:', window.documentViewer.elements);
    console.log('- Container found:', window.documentViewer.elements.container ? 'Yes' : 'No');
    console.log('- Methods available:');
    console.log('  - openDocument:', typeof window.documentViewer.openDocument === 'function');
    console.log('  - loadDocument:', typeof window.documentViewer.loadDocument === 'function');
  }
  
  // Check document-viewer element
  const viewerElement = document.getElementById('document-viewer');
  console.log('- DOM element found:', viewerElement ? 'Yes' : 'No');
  if (viewerElement) {
    console.log('- CSS classes:', viewerElement.className);
  }
  
  return 'Document viewer debug complete. Check console for details.';
};

// Run debug on load
setTimeout(() => {
  console.log('Running document viewer debug check...');
  window.debugDocumentViewer();
}, 2000);
