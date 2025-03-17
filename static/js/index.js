document.addEventListener ('DOMContentLoaded', () => {
  // Check if CaseManagement exists before trying to use it
  if (typeof CaseManagement === 'function') {
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
  } else {
    console.error (
      'CaseManagement class not found. Make sure case_management.js is loaded correctly.'
    );
  }
});
