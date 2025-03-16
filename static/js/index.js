document.addEventListener ('DOMContentLoaded', () => {
  // Initialize case management
  window.caseManagement = new CaseManagement ();

  // Add new case button handler
  const newCaseBtn = document.getElementById ('new-case-btn');
  if (newCaseBtn) {
    newCaseBtn.addEventListener ('click', () => {
      window.caseForm.showCreateModal ();
    });
  }
});
