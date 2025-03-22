// static/js/report-handler.js

class ReportHandler {
  constructor (apiService) {
    this.api = apiService;
    this.currentCase = null;
    this.currentReport = null;
    this.reportFields = new Map ();
    this.reportTemplates = {
      medical: 'Medical Examination Report',
      forensic: 'Forensic Analysis Report',
      custom: 'Custom Report',
    };

    this.initElements ();
    this.bindEvents ();
  }

  initElements () {
    // Report builder elements
    this.reportTemplate = document.getElementById ('report-template');
    this.reportFields = document.getElementById ('report-fields');
    this.generateReportBtn = document.getElementById ('generate-report-btn');
    this.saveReportBtn = document.getElementById ('save-report-btn');
    this.exportReportBtn = document.getElementById ('export-report-btn');

    // Report preview elements
    this.reportPreview = document.getElementById ('report-preview');
    this.editReportBtn = document.getElementById ('edit-report-btn');
  }

  bindEvents () {
    // Report template selection
    this.reportTemplate.addEventListener (
      'change',
      this.handleTemplateChange.bind (this)
    );

    // Report buttons
    this.generateReportBtn.addEventListener (
      'click',
      this.generateReport.bind (this)
    );
    this.saveReportBtn.addEventListener ('click', this.saveReport.bind (this));
    this.exportReportBtn.addEventListener (
      'click',
      this.exportReport.bind (this)
    );
    this.editReportBtn.addEventListener ('click', this.editReport.bind (this));
  }

  // Load case reports
  async loadCaseReports (caseId) {
    if (!caseId) {
      this.clearReportFields ();
      this.clearReportPreview ();
      return;
    }

    this.currentCase = caseId;

    try {
      // Get fields from OCR handler if available
      if (window.app && window.app.ocrHandler) {
        const extractedFields = window.app.ocrHandler.getExtractedFields ();
        this.updateReportFields (extractedFields);
      }

      // Load existing reports
      const result = await this.api.getReports (caseId, {status: 'draft'});

      if (result.reports && result.reports.length > 0) {
        // Use the most recent draft report
        this.currentReport = result.reports[0].id;
        this.loadReportData (result.reports[0]);
      } else {
        // No reports yet
        this.currentReport = null;
        this.renderDefaultTemplate ();
      }
    } catch (error) {
      console.error ('Failed to load reports:', error);
      this.showReportError ('Failed to load reports');
    }
  }

  // Update report fields from extracted fields
  updateReportFields (extractedFields) {
    // Clear existing field checkboxes
    this.reportFields.innerHTML = '';

    // Add field checkboxes
    Object.entries (extractedFields).forEach (([key, value]) => {
      const fieldId = `field-${this.slugify (key)}`;

      const fieldElement = document.createElement ('div');
      fieldElement.className = 'field-checkbox flex items-center';

      fieldElement.innerHTML = `
          <input type="checkbox" id="${fieldId}" class="mr-2" checked data-field-key="${this.escapeHtml (key)}">
          <label for="${fieldId}" class="text-sm">${this.escapeHtml (key)}</label>
        `;

      this.reportFields.appendChild (fieldElement);
    });
  }

  // Load report data
  loadReportData (report) {
    // Set template
    this.reportTemplate.value = report.report_type || 'medical';

    // Update preview with report content
    if (report.content && typeof report.content === 'object') {
      this.renderReportContent (report.content);
    } else {
      this.renderDefaultTemplate ();
    }

    // Update field selections based on field_data
    if (report.field_data) {
      this.updateFieldSelections (report.field_data);
    }
  }

  // Update field checkboxes based on existing data
  updateFieldSelections (fieldData) {
    const checkboxes = this.reportFields.querySelectorAll (
      'input[type="checkbox"]'
    );

    checkboxes.forEach (checkbox => {
      const fieldKey = checkbox.dataset.fieldKey;
      checkbox.checked = fieldData.hasOwnProperty (fieldKey);
    });
  }

  // Handle template change
  handleTemplateChange () {
    this.renderDefaultTemplate ();
  }

  // Generate report based on template and fields
  generateReport () {
    const templateType = this.reportTemplate.value;
    const selectedFields = this.getSelectedFields ();

    if (Object.keys (selectedFields).length === 0) {
      alert ('Please select at least one field for the report');
      return;
    }

    // Generate report content
    let content;

    switch (templateType) {
      case 'medical':
        content = this.generateMedicalReport (selectedFields);
        break;
      case 'forensic':
        content = this.generateForensicReport (selectedFields);
        break;
      case 'custom':
        content = this.generateCustomReport (selectedFields);
        break;
      default:
        content = this.generateMedicalReport (selectedFields);
    }

    // Render the report
    this.renderReportContent (content);
  }

  // Get selected fields
  getSelectedFields () {
    const selectedFields = {};
    const checkboxes = this.reportFields.querySelectorAll (
      'input[type="checkbox"]:checked'
    );

    checkboxes.forEach (checkbox => {
      const fieldKey = checkbox.dataset.fieldKey;

      // Get field value from OCR handler
      if (window.app && window.app.ocrHandler) {
        const extractedFields = window.app.ocrHandler.getExtractedFields ();
        if (fieldKey in extractedFields) {
          selectedFields[fieldKey] = extractedFields[fieldKey];
        }
      }
    });

    return selectedFields;
  }

  // Generate medical report
  generateMedicalReport (fields) {
    return {
      title: 'Medical Examination Report',
      type: 'medical',
      date: new Date ().toLocaleDateString (),
      caseNumber: fields['Case Number'] || fields['Case #'] || 'N/A',
      sections: [
        {
          title: 'Patient Information',
          fields: fields,
        },
        {
          title: 'Examination Findings',
          content: 'The patient presents with...',
        },
        {
          title: 'Diagnosis',
          content: fields['Diagnosis'] || 'N/A',
        },
        {
          title: 'Recommendations',
          content: 'Based on the examination, it is recommended that...',
        },
      ],
    };
  }

  // Generate forensic report
  generateForensicReport (fields) {
    return {
      title: 'Forensic Analysis Report',
      type: 'forensic',
      date: new Date ().toLocaleDateString (),
      caseNumber: fields['Case Number'] || fields['Case #'] || 'N/A',
      sections: [
        {
          title: 'Case Information',
          fields: fields,
        },
        {
          title: 'Evidence Analysis',
          content: 'The following evidence was analyzed...',
        },
        {
          title: 'Findings',
          content: fields['Findings'] || 'N/A',
        },
        {
          title: 'Conclusions',
          content: 'Based on the analysis, it is concluded that...',
        },
      ],
    };
  }

  // Generate custom report
  generateCustomReport (fields) {
    return {
      title: 'Custom Report',
      type: 'custom',
      date: new Date ().toLocaleDateString (),
      fields: fields,
      content: 'Custom report content goes here...',
    };
  }

  // Render report content
  renderReportContent (content) {
    if (!content) return;

    if (typeof content === 'string') {
      // If content is a string, use as HTML
      this.reportPreview.innerHTML = content;
      return;
    }

    // Generate HTML based on content object
    let html = `<div class="prose max-w-none">`;

    // Title
    html += `<h1>${this.escapeHtml (content.title)}</h1>`;

    // Case info
    html += `<p><strong>Case Number:</strong> ${this.escapeHtml (content.caseNumber || 'N/A')}</p>`;
    html += `<p><strong>Date:</strong> ${this.escapeHtml (content.date || new Date ().toLocaleDateString ())}</p>`;

    // Sections
    if (content.sections && content.sections.length > 0) {
      content.sections.forEach (section => {
        html += `<h2>${this.escapeHtml (section.title)}</h2>`;

        if (section.fields) {
          html += `<table class="border-collapse border border-gray-300 w-full">
              <tbody>`;

          Object.entries (section.fields).forEach (([key, value]) => {
            html += `<tr class="border border-gray-300">
                <td class="border border-gray-300 p-2 bg-gray-50 font-semibold">${this.escapeHtml (key)}</td>
                <td class="border border-gray-300 p-2">${this.escapeHtml (value)}</td>
              </tr>`;
          });

          html += `</tbody></table>`;
        }

        if (section.content) {
          html += `<p>${this.escapeHtml (section.content)}</p>`;
        }
      });
    } else if (content.fields) {
      // Simple field list
      html += `<table class="border-collapse border border-gray-300 w-full">
          <tbody>`;

      Object.entries (content.fields).forEach (([key, value]) => {
        html += `<tr class="border border-gray-300">
            <td class="border border-gray-300 p-2 bg-gray-50 font-semibold">${this.escapeHtml (key)}</td>
            <td class="border border-gray-300 p-2">${this.escapeHtml (value)}</td>
          </tr>`;
      });

      html += `</tbody></table>`;
    }

    // Additional content
    if (content.content) {
      html += `<p>${this.escapeHtml (content.content)}</p>`;
    }

    html += `</div>`;

    this.reportPreview.innerHTML = html;
  }

  // Render default template
  renderDefaultTemplate () {
    const templateType = this.reportTemplate.value;
    const title = this.reportTemplates[templateType] || 'Report';

    let html = `<div class="prose max-w-none">
        <h1>${title}</h1>
        <p><strong>Case Number:</strong> ${window.app.currentCase ? window.app.currentCase : 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date ().toLocaleDateString ()}</p>
        
        <p class="text-gray-500 italic">Generate a report to preview content here.</p>
      </div>`;

    this.reportPreview.innerHTML = html;
  }

  // Save report to database
  async saveReport () {
    if (!this.currentCase) {
      alert ('Please select a case first');
      return;
    }

    try {
      const templateType = this.reportTemplate.value;
      const selectedFields = this.getSelectedFields ();

      // Get report content
      const content = this.reportPreview.innerHTML;

      // Create report data
      const reportData = {
        tenant_id: window.app.currentTenant,
        case_id: this.currentCase,
        title: this.reportTemplates[templateType] || 'Report',
        report_type: templateType,
        content: {
          html: content,
          template: templateType,
        },
        field_data: selectedFields,
        status: 'draft',
      };

      let result;

      if (this.currentReport) {
        // Update existing report
        result = await this.api.updateReport (this.currentReport, reportData);
      } else {
        // Create new report
        result = await this.api.createReport (reportData);
        this.currentReport = result.id;
      }

      alert ('Report saved successfully');
    } catch (error) {
      console.error ('Failed to save report:', error);
      alert ('Failed to save report');
    }
  }

  // Export report as PDF
  exportReport () {
    alert ('PDF export functionality will be implemented here');
    // TODO: Implement PDF export
  }

  // Edit existing report
  editReport () {
    // Enable editing of the report content
    alert ('Report editing functionality will be implemented here');
    // TODO: Implement report editing
  }

  // Clear report fields
  clearReportFields () {
    this.reportFields.innerHTML = `
        <div class="p-4 text-center text-gray-500">
          <p>No fields available</p>
        </div>
      `;
  }

  // Clear report preview
  clearReportPreview () {
    this.reportPreview.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <i class="bx bx-file-blank text-4xl mb-2"></i>
          <p>Select a case and generate a report to preview</p>
        </div>
      `;

    this.currentReport = null;
  }

  // Show report error
  showReportError (message) {
    this.reportPreview.innerHTML = `
        <div class="p-8 text-center text-red-500">
          <i class="bx bx-error-circle text-4xl mb-2"></i>
          <p>${message}</p>
        </div>
      `;
  }

  // Helper function to slugify text
  slugify (text) {
    return text
      .toString ()
      .toLowerCase ()
      .replace (/\s+/g, '-')
      .replace (/[^\w\-]+/g, '')
      .replace (/\-\-+/g, '-')
      .replace (/^-+/, '')
      .replace (/-+$/, '');
  }

  // Helper function to escape HTML
  escapeHtml (text) {
    const element = document.createElement ('div');
    element.textContent = text;
    return element.innerHTML;
  }
}
