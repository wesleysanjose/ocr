// static/js/case_management/init.js

/**
 * Initialization script for case management
 * This creates an instance of CaseManagement and binds it to the window
 */
document.addEventListener ('DOMContentLoaded', () => {
  console.log ('Initializing case management system...');

  // Check if CaseManagement class is available
  if (typeof CaseManagement === 'undefined') {
    console.error (
      'CaseManagement class not found. Make sure main.js is loaded correctly.'
    );
    return;
  }

  // Create case management instance
  if (!window.caseManagement) {
    window.caseManagement = new CaseManagement ();

    // Set up document upload after everything is loaded
    setTimeout (() => {
      if (window.caseManagement) {
        window.caseManagement.setupDirectDocumentUpload ();
      }
    }, 500);
  }

  // Add new case button handler if not already handled in CaseManagement
  const newCaseBtn = document.getElementById ('new-case-btn');
  if (newCaseBtn) {
    newCaseBtn.addEventListener ('click', () => {
      if (window.caseForm) {
        window.caseForm.showCreateModal ();
      }
    });
  }

  console.log ('Case management system initialized');
});

// Optional: Export to module system if needed
// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = { CaseManagement };
// }
