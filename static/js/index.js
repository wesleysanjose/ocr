document.addEventListener('DOMContentLoaded', () => {
  // Initialize component loader if not already done
  if (!window.componentLoader) {
    window.componentLoader = new ComponentLoader();
    window.componentLoader.initializeApp();
  }
  
  // Ensure we only create one instance of CaseManagement
  if (typeof CaseManagement === 'function' && !window.caseManagement) {
    window.caseManagement = new CaseManagement();

    // Add new case button handler after component is loaded
    setTimeout(() => {
      const newCaseBtn = document.getElementById('new-case-btn');
      if (newCaseBtn) {
        newCaseBtn.addEventListener('click', () => {
          if (window.caseForm) {
            window.caseForm.showCreateModal();
          }
        });
      }
    }, 100);
  } else if (window.caseManagement) {
    console.log('CaseManagement already initialized');
  } else {
    console.error(
      'CaseManagement class not found. Make sure case_management.js is loaded correctly.'
    );
  }
});

// Debug function remains the same
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
