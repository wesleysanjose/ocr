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
}) (window.CaseManagement);
