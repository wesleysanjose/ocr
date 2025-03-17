// static/js/document_viewer/report.js

/**
 * Report tab functionality for DocumentViewer
 * Responsible for report generation and templates
 */
(function (DocumentViewer) {
  /**
     * Bind events for the report tab
     */
  DocumentViewer.prototype.bindReportEvents = function () {
    if (this.elements.loadTemplateBtn) {
      this.elements.loadTemplateBtn.addEventListener ('click', () => {
        this.loadReportTemplate ();
      });
    }

    if (this.elements.previewReportBtn) {
      this.elements.previewReportBtn.addEventListener ('click', () => {
        this.previewReport ();
      });
    }

    if (this.elements.saveReportBtn) {
      this.elements.saveReportBtn.addEventListener ('click', () => {
        this.saveReport ();
      });
    }

    if (this.elements.exportPdfBtn) {
      this.elements.exportPdfBtn.addEventListener ('click', () => {
        this.exportToPdf ();
      });
    }
  };

  /**
     * Apply the organized fields to the report
     */
  DocumentViewer.prototype.applyFieldsToReport = function () {
    // Switch to report tab
    this.switchTab ('report-tab');

    // Update report fields
    this.updateReportFields ();
  };

  /**
     * Update fields in the report template
     */
  DocumentViewer.prototype.updateReportFields = function () {
    // Get all field placeholders
    const placeholders = document.querySelectorAll ('.field-placeholder');

    placeholders.forEach (placeholder => {
      const fieldName = placeholder.dataset.field;
      if (!fieldName) return;

      // Try to find a matching field
      let fieldValue = null;

      // Check direct match
      for (const [key, data] of this.keyValueMap.entries ()) {
        if (
          key === fieldName ||
          key.toLowerCase () === fieldName.toLowerCase ()
        ) {
          fieldValue = data.value;
          break;
        }
      }

      // If no direct match, try to infer
      if (!fieldValue) {
        const fieldMapping = {
          name: ['姓名', '名字', '被鉴定人'],
          gender: ['性别'],
          age: ['年龄', '岁数'],
          workUnit: ['工作单位', '单位', '就职单位'],
          accidentDate: ['事故日期', '事故时间', '日期'],
          accidentLocation: ['事故地点', '地点', '位置'],
          accidentDetails: ['事故经过', '事故描述', '经过', '描述'],
          hospital: ['医院', '就诊医院', '住院医院'],
          diagnosis: ['诊断', '诊断结果', '伤情'],
          hospitalDays: ['住院天数', '住院时间'],
          conclusion: ['结论', '鉴定结论', '伤残等级'],
          assessmentOrg: ['鉴定机构', '鉴定单位'],
          assessmentDate: ['鉴定日期', '鉴定时间'],
          assessor: ['鉴定人', '鉴定专家'],
          certNumber: ['证书编号', '执业证号', '编号'],
        };

        const matchTerms = fieldMapping[fieldName];
        if (matchTerms) {
          for (const [key, data] of this.keyValueMap.entries ()) {
            for (const term of matchTerms) {
              if (key.includes (term) || term.includes (key)) {
                fieldValue = data.value;
                break;
              }
            }
            if (fieldValue) break;
          }
        }
      }

      // Update placeholder if we found a value
      if (fieldValue) {
        placeholder.textContent = fieldValue;
        placeholder.classList.add ('text-blue-800');
      }
    });
  };

  /**
     * Load a report template based on selected option
     */
  DocumentViewer.prototype.loadReportTemplate = function () {
    const templateSelect = this.elements.reportTemplate;
    if (!templateSelect) return;

    const templateType = templateSelect.value;
    console.log (`Loading template: ${templateType}`);

    // In a real implementation, this would load different HTML templates
    // For now, we just show a message and update the existing template

    // Set the report title based on template type
    const reportTitle = document.querySelector ('#report-tab h2');
    if (reportTitle) {
      const titles = {
        traffic: '交通事故伤残鉴定报告',
        work: '工伤认定鉴定报告',
        medical: '医疗事故鉴定报告',
        injury: '伤残等级评定报告',
      };

      if (titles[templateType]) {
        reportTitle.textContent = titles[templateType];
      }
    }

    // Update fields with current data
    this.updateReportFields ();

    // Show success message
    alert ('模板加载成功');
  };

  /**
     * Preview the report in a new window
     */
  DocumentViewer.prototype.previewReport = function () {
    // Get the report content
    const reportContent = document.querySelector ('#report-tab .mx-auto');
    if (!reportContent) {
      alert ('无法生成预览，未找到报告内容');
      return;
    }

    // Clone the content to modify it
    const content = reportContent.cloneNode (true);

    // Add some basic styling
    const style = `
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        h1, h2 { text-align: center; }
        h3 { border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .field-placeholder { color: #000; }
      `;

    // Create a new window
    const previewWindow = window.open ('', '_blank');
    if (previewWindow) {
      previewWindow.document.write (`
          <!DOCTYPE html>
          <html>
          <head>
            <title>报告预览</title>
            <style>${style}</style>
          </head>
          <body>
            ${content.outerHTML}
          </body>
          </html>
        `);
      previewWindow.document.close ();
    } else {
      alert ('无法打开预览窗口，请检查您的浏览器是否阻止了弹出窗口');
    }
  };

  /**
     * Save the report to the case
     */
  DocumentViewer.prototype.saveReport = function () {
    if (!this.currentDocument || !this.currentCaseId) {
      alert ('没有选择文档');
      return;
    }

    alert ('报告已保存');

    // In a real implementation, this would make an API call to save the report
    // For demo purposes, we just show a success message
  };

  /**
     * Export the report to PDF
     */
  DocumentViewer.prototype.exportToPdf = function () {
    alert ('PDF导出功能即将上线');

    // In a real implementation, this would generate a PDF file
    // For demo purposes, we just show a message
  };
}) (window.DocumentViewer);
