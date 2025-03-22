// static/js/analysis-handler.js

class AnalysisHandler {
  constructor (apiService) {
    this.api = apiService;
    this.currentCase = null;
    this.currentReport = null;
    this.analysisInProgress = false;

    this.initElements ();
    this.bindEvents ();
  }

  initElements () {
    // Analysis control elements
    this.analysisType = document.getElementById ('analysis-type');
    this.analysisPrompt = document.getElementById ('analysis-prompt');
    this.runAnalysisBtn = document.getElementById ('run-analysis-btn');
    this.resetPromptBtn = document.getElementById ('reset-prompt-btn');

    // Analysis options
    this.optionHighlight = document.getElementById ('option-highlight');
    this.optionSuggestions = document.getElementById ('option-suggestions');
    this.optionTerminology = document.getElementById ('option-terminology');

    // Results elements
    this.analysisResults = document.getElementById ('analysis-results');
    this.exportAnalysisBtn = document.getElementById ('export-analysis-btn');
  }

  bindEvents () {
    // Analysis control events
    this.analysisType.addEventListener (
      'change',
      this.updatePromptForType.bind (this)
    );
    this.runAnalysisBtn.addEventListener (
      'click',
      this.runAnalysis.bind (this)
    );
    this.resetPromptBtn.addEventListener (
      'click',
      this.resetPrompt.bind (this)
    );

    // Export button
    this.exportAnalysisBtn.addEventListener (
      'click',
      this.exportAnalysis.bind (this)
    );
  }

  // Load analysis config
  loadAnalysisConfig () {
    // Reset prompt to default
    this.resetPrompt ();

    // Check if there's a current case
    if (!window.app.currentCase) {
      this.clearAnalysisResults ();
      return;
    }

    this.currentCase = window.app.currentCase;

    // Load latest report if available
    this.loadLatestReport ();
  }

  // Load latest report for analysis
  async loadLatestReport () {
    try {
      // Get latest reports for the case
      const result = await this.api.getReports (this.currentCase, {limit: 1});

      if (result.reports && result.reports.length > 0) {
        this.currentReport = result.reports[0].id;

        // If report has previous analysis, display it
        if (result.reports[0].analysis_results) {
          this.renderAnalysisResults (result.reports[0].analysis_results);
        } else {
          this.showNoAnalysisResults ();
        }
      } else {
        // No reports available
        this.currentReport = null;
        this.showNoReports ();
      }
    } catch (error) {
      console.error ('Failed to load reports for analysis:', error);
      this.showAnalysisError ('Failed to load reports');
    }
  }

  // Update prompt based on selected analysis type
  updatePromptForType () {
    const type = this.analysisType.value;

    let promptText = '';

    switch (type) {
      case 'error-check':
        promptText =
          'Analyze this forensic document for errors, inconsistencies, and formatting issues. Identify specific errors and provide suggested corrections.';
        break;
      case 'consistency':
        promptText =
          'Check this forensic document for internal consistency. Identify any contradictions or inconsistencies in the information presented, particularly in dates, measurements, and identifying information.';
        break;
      case 'completeness':
        promptText =
          'Evaluate the completeness of this forensic document. Identify any missing sections, fields, or information that would typically be included in a document of this type.';
        break;
      case 'terminology':
        promptText =
          'Verify the medical/forensic terminology used in this document. Identify any incorrect terms, spellings, or inappropriate usage of technical terminology. Suggest correct alternatives where applicable.';
        break;
      default:
        promptText = CONFIG.analysis.defaultPrompt;
    }

    this.analysisPrompt.value = promptText;
  }

  // Reset prompt to default
  resetPrompt () {
    this.analysisPrompt.value = CONFIG.analysis.defaultPrompt;
  }

  // Run analysis on current report
  async runAnalysis () {
    if (!this.currentReport) {
      alert ('No report available for analysis. Please create a report first.');
      return;
    }

    if (this.analysisInProgress) {
      return;
    }

    const prompt = this.analysisPrompt.value.trim ();

    if (!prompt) {
      alert ('Please enter an analysis prompt');
      return;
    }

    try {
      // Set analysis in progress
      this.analysisInProgress = true;
      this.runAnalysisBtn.disabled = true;
      this.runAnalysisBtn.innerHTML = '<div class="loader mx-auto"></div>';
      this.showAnalysisLoading ();

      // Get analysis options
      const options = {
        highlight: this.optionHighlight.checked,
        suggestions: this.optionSuggestions.checked,
        terminology: this.optionTerminology.checked,
      };

      // Build analysis params
      const analysisParams = {
        tenant_id: window.app.currentTenant,
        prompt: prompt,
        options: options,
      };

      // Run analysis
      const result = await this.api.analyzeReport (
        this.currentReport,
        analysisParams
      );

      // Render results
      this.renderAnalysisResults (result.analysis);
    } catch (error) {
      console.error ('Analysis failed:', error);
      this.showAnalysisError ('Analysis failed: ' + error.message);
    } finally {
      // Reset UI
      this.analysisInProgress = false;
      this.runAnalysisBtn.disabled = false;
      this.runAnalysisBtn.textContent = 'Run Analysis';
    }
  }

  // Render analysis results
  renderAnalysisResults (analysis) {
    if (!analysis) {
      this.showNoAnalysisResults ();
      return;
    }

    // Enable export button
    this.exportAnalysisBtn.disabled = false;

    // Process analysis data
    let html = '';

    // Add completion message
    html += `
        <div class="p-3 bg-blue-50 border-l-4 border-blue-500 mb-4">
          <div class="font-medium">Analysis Completed</div>
          <div class="text-sm mt-1">The report was analyzed based on the provided prompt.</div>
        </div>
      `;

    // If analysis is in JSON format with structured data
    if (typeof analysis === 'object') {
      // Summary section
      if (analysis.summary) {
        html += `
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-800">Summary</h3>
              <div class="mt-2 pl-4 border-l-2 border-gray-300">
                <p class="mb-2">${this.escapeHtml (analysis.summary)}</p>
              </div>
            </div>
          `;
      }

      // Issues section
      if (analysis.issues && analysis.issues.length > 0) {
        html += `<div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-800">Detailed Findings</h3>`;

        analysis.issues.forEach ((issue, index) => {
          const severity = issue.severity || 'error';
          const bgColor = this.getSeverityColor (severity);

          html += `
              <div class="mt-3 p-3 ${bgColor} rounded">
                <div class="font-medium text-${severity === 'error' ? 'red' : severity === 'warning' ? 'yellow' : 'blue'}-800">
                  ${severity
                    .charAt (0)
                    .toUpperCase () + severity.slice (1)} #${index + 1}: ${this.escapeHtml (issue.title || 'Issue')}
                </div>
                <div class="mt-1 text-sm">
                  <p>${this.escapeHtml (issue.description || '')}</p>
                  ${issue.suggestion ? `
                  <div class="mt-2">
                    <span class="font-medium">Suggestion:</span> ${this.escapeHtml (issue.suggestion)}
                  </div>` : ''}
                </div>
              </div>
            `;
        });

        html += `</div>`;
      }

      // Recommendations section
      if (analysis.recommendations && analysis.recommendations.length > 0) {
        html += `
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-800">Recommendations</h3>
              <ul class="mt-2 list-disc pl-5 space-y-2">
                ${analysis.recommendations
                  .map (rec => `<li>${this.escapeHtml (rec)}</li>`)
                  .join ('')}
              </ul>
            </div>
          `;
      }
    } else if (typeof analysis === 'string') {
      // If analysis is a plain string, display as formatted text
      html += `<div class="prose max-w-none">${this.formatAnalysisText (analysis)}</div>`;
    } else if (analysis.raw_result) {
      // If it's the raw result format
      html += `<div class="prose max-w-none">${this.formatAnalysisText (analysis.raw_result)}</div>`;
    }

    this.analysisResults.innerHTML = html;
  }

  // Format plain text analysis with some basic formatting
  formatAnalysisText (text) {
    // Convert newlines to <br>
    let formattedText = text.replace (/\n/g, '<br>');

    // Convert markdown-style headers
    formattedText = formattedText.replace (/^# (.+)$/gm, '<h1>$1</h1>');
    formattedText = formattedText.replace (/^## (.+)$/gm, '<h2>$1</h2>');
    formattedText = formattedText.replace (/^### (.+)$/gm, '<h3>$1</h3>');

    // Convert markdown-style lists
    formattedText = formattedText.replace (/^\* (.+)$/gm, '<li>$1</li>');
    formattedText = formattedText.replace (/^- (.+)$/gm, '<li>$1</li>');
    formattedText = formattedText.replace (/^(\d+)\. (.+)$/gm, '<li>$2</li>');

    // Wrap lists
    formattedText = formattedText.replace (
      /<li>(.+)<\/li><br><li>/g,
      '<li>$1</li><li>'
    );
    formattedText = formattedText.replace (
      /<li>(.+)<\/li><br>/g,
      '<li>$1</li></ul><br>'
    );
    formattedText = formattedText.replace (/<br><li>/g, '<ul><li>');

    // Bold and italic
    formattedText = formattedText.replace (
      /\*\*(.+?)\*\*/g,
      '<strong>$1</strong>'
    );
    formattedText = formattedText.replace (/\*(.+?)\*/g, '<em>$1</em>');

    return formattedText;
  }

  // Get background color class based on severity
  getSeverityColor (severity) {
    switch (severity.toLowerCase ()) {
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'info':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  }

  // Export analysis as PDF or text
  exportAnalysis () {
    alert ('Analysis export functionality will be implemented here');
    // TODO: Implement analysis export
  }

  // Show analysis loading state
  showAnalysisLoading () {
    this.analysisResults.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <div class="loader mx-auto mb-2"></div>
          <p>Running analysis...</p>
          <p class="text-sm mt-2">This may take a minute to complete</p>
        </div>
      `;
  }

  // Show no analysis results message
  showNoAnalysisResults () {
    this.analysisResults.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <i class="bx bx-analyse text-4xl mb-2"></i>
          <p>No analysis results yet</p>
          <p class="text-sm mt-1">Click "Run Analysis" to analyze the current report</p>
        </div>
      `;

    // Disable export button
    this.exportAnalysisBtn.disabled = true;
  }

  // Show no reports message
  showNoReports () {
    this.analysisResults.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <i class="bx bx-file-blank text-4xl mb-2"></i>
          <p>No reports available for analysis</p>
          <p class="text-sm mt-1">Please create a report in the Report tab first</p>
        </div>
      `;

    // Disable run and export buttons
    this.runAnalysisBtn.disabled = true;
    this.exportAnalysisBtn.disabled = true;
  }

  // Show analysis error
  showAnalysisError (message) {
    this.analysisResults.innerHTML = `
        <div class="p-8 text-center text-red-500">
          <i class="bx bx-error-circle text-4xl mb-2"></i>
          <p>${message}</p>
        </div>
      `;
  }

  // Clear analysis results
  clearAnalysisResults () {
    this.analysisResults.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <i class="bx bx-file-blank text-4xl mb-2"></i>
          <p>Select a case to analyze reports</p>
        </div>
      `;

    // Disable run and export buttons
    this.runAnalysisBtn.disabled = true;
    this.exportAnalysisBtn.disabled = true;
  }

  // Helper function to escape HTML
  escapeHtml (text) {
    if (!text) return '';
    const element = document.createElement ('div');
    element.textContent = text;
    return element.innerHTML;
  }
}
