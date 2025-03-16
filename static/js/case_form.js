class CaseForm {
  constructor () {
    this.initElements ();
    this.bindEvents ();
    this.isEdit = false;
    this.caseId = null;
  }

  initElements () {
    this.elements = {
      modal: document.getElementById ('case-form-modal'),
      form: document.getElementById ('case-form'),
      title: document.getElementById ('form-title'),
      nameInput: document.getElementById ('case-name-input'),
      phoneInput: document.getElementById ('case-phone-input'),
      typeSelect: document.getElementById ('case-type-select'),
      statusSelect: document.getElementById ('case-status-select'),
      saveBtn: document.getElementById ('save-case-btn'),
      cancelBtn: document.getElementById ('cancel-case-btn'),
    };
  }

  bindEvents () {
    if (this.elements.form) {
      this.elements.form.addEventListener ('submit', e => {
        e.preventDefault ();
        this.saveCase ();
      });
    }

    if (this.elements.cancelBtn) {
      this.elements.cancelBtn.addEventListener ('click', () => {
        this.hideModal ();
      });
    }
  }

  showCreateModal () {
    this.isEdit = false;
    this.caseId = null;

    // Set title
    this.elements.title.textContent = '新建案件';

    // Clear form
    this.elements.form.reset ();

    // Show modal
    this.elements.modal.classList.remove ('hidden');
    this.elements.nameInput.focus ();
  }

  showEditModal (caseData) {
    this.isEdit = true;
    this.caseId = caseData.id;

    // Set title
    this.elements.title.textContent = '编辑案件';

    // Fill form
    this.elements.nameInput.value = caseData.name;
    this.elements.phoneInput.value = caseData.phone;
    this.elements.typeSelect.value = caseData.type;
    this.elements.statusSelect.value = caseData.status;

    // Show modal
    this.elements.modal.classList.remove ('hidden');
    this.elements.nameInput.focus ();
  }

  hideModal () {
    this.elements.modal.classList.add ('hidden');
    this.elements.form.reset ();
  }

  async saveCase () {
    try {
      // Validate form
      if (!this.elements.nameInput.value.trim ()) {
        alert ('请输入姓名');
        return;
      }

      if (!this.elements.phoneInput.value.trim ()) {
        alert ('请输入联系电话');
        return;
      }

      // Disable save button
      this.elements.saveBtn.disabled = true;
      this.elements.saveBtn.textContent = '保存中...';

      // Prepare data
      const caseData = {
        name: this.elements.nameInput.value.trim (),
        phone: this.elements.phoneInput.value.trim (),
        type: this.elements.typeSelect.value,
        status: this.elements.statusSelect.value,
      };

      // Save case
      if (this.isEdit) {
        await window.caseAPI.updateCase (this.caseId, caseData);
      } else {
        await window.caseAPI.createCase (caseData);
      }

      // Hide modal
      this.hideModal ();

      // Refresh case list
      if (window.caseManagement) {
        window.caseManagement.loadCases ();
      }
    } catch (error) {
      console.error ('Save case error:', error);
      alert ('保存失败：' + error.message);
    } finally {
      this.elements.saveBtn.disabled = false;
      this.elements.saveBtn.textContent = '保存';
    }
  }
}

// Initialize case form
window.caseForm = new CaseForm ();
