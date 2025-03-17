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
