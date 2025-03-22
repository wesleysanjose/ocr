// static/js/app.js

class ForensicDocumentApp {
  constructor () {
    this.currentTenant = null;
    this.currentCase = null;
    this.api = new ApiService ();

    // Initialize handlers
    this.documentHandler = new DocumentHandler (this.api);

    // Initialize when DOM is ready
    this.initElements ();
    this.bindEvents ();
    this.initTabs ();
    this.loadInitialData ();
  }

  initElements () {
    // Tab elements
    this.tabs = document.querySelectorAll ('.tab-btn');
    this.tabPanes = document.querySelectorAll ('.tab-pane');

    // Case elements
    this.caseSelector = document.getElementById ('case-selector');
    this.newCaseBtn = document.getElementById ('new-case-btn');
    this.caseInfoBtn = document.getElementById ('case-info-btn');

    // Tenant selector
    this.tenantSelector = document.getElementById ('tenant-selector');

    // User menu
    this.userMenuBtn = document.getElementById ('user-menu-button');
    this.userMenu = document.getElementById ('user-menu');
  }

  bindEvents () {
    // Tab navigation
    this.tabs.forEach (tab => {
      tab.addEventListener ('click', () => this.changeTab (tab.dataset.tab));
    });

    // Case selection
    this.caseSelector.addEventListener (
      'change',
      this.handleCaseChange.bind (this)
    );

    // Tenant selection
    this.tenantSelector.addEventListener (
      'change',
      this.handleTenantChange.bind (this)
    );

    // User menu toggle
    this.userMenuBtn.addEventListener ('click', () => {
      this.userMenu.classList.toggle ('hidden');
    });

    // Close user menu when clicking outside
    document.addEventListener ('click', event => {
      if (
        !this.userMenuBtn.contains (event.target) &&
        !this.userMenu.contains (event.target)
      ) {
        this.userMenu.classList.add ('hidden');
      }
    });
  }

  // Initialize tab functionality
  initTabs () {
    // Default to document tab
    this.changeTab ('document');
  }

  // Change active tab
  changeTab (tabId) {
    // Update tab buttons
    this.tabs.forEach (tab => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add ('active');
      } else {
        tab.classList.remove ('active');
      }
    });

    // Update tab panes
    this.tabPanes.forEach (pane => {
      if (pane.id === `${tabId}-tab`) {
        pane.classList.remove ('hidden');
      } else {
        pane.classList.add ('hidden');
      }
    });

    // Handle special tab initialization
    this.handleTabChange (tabId);
  }

  // Handle specific tab changes
  handleTabChange (tabId) {
    switch (tabId) {
      case 'organize':
        // Initialize OCR handler if needed
        if (this.ocrHandler && this.currentCase) {
          // Make sure OCR text is loaded for the current document
          if (this.documentHandler.currentDocument) {
            this.ocrHandler.loadDocumentOCR (
              this.documentHandler.currentDocument,
              this.currentCase,
              this.documentHandler.currentPage
            );
          }
        }
        break;
      case 'report':
        // Initialize report handler if needed
        if (this.reportHandler && this.currentCase) {
          this.reportHandler.loadCaseReports (this.currentCase);
        }
        break;
      case 'analysis':
        // Initialize analysis handler if needed
        if (this.analysisHandler && this.currentCase) {
          this.analysisHandler.loadAnalysisConfig ();
        }
        break;
    }
  }

  // Load initial data (tenants and cases)
  async loadInitialData () {
    try {
      // Load tenants
      await this.loadTenants ();

      // If no tenant is selected, can't load cases yet
      if (!this.currentTenant) return;

      // Load cases for the selected tenant
      await this.loadCases ();
    } catch (error) {
      console.error ('Failed to load initial data:', error);
      alert ('Failed to load data. Please refresh the page and try again.');
    }
  }

  // Load tenants/clients
  async loadTenants () {
    try {
      const result = await this.api.getClients ({status: 'active'});

      if (result.clients && result.clients.length > 0) {
        this.renderTenants (result.clients);

        // Select first tenant if none is selected
        if (!this.currentTenant) {
          this.tenantSelector.value = result.clients[0].id;
          this.handleTenantChange ();
        }
      }
    } catch (error) {
      console.error ('Failed to load tenants:', error);
      this.showTenantError ();
    }
  }

  // Render tenant options
  renderTenants (clients) {
    // Clear existing options except the placeholder
    while (this.tenantSelector.options.length > 1) {
      this.tenantSelector.remove (1);
    }

    // Add tenant options
    clients.forEach (client => {
      const option = document.createElement ('option');
      option.value = client.id;
      option.textContent = client.name;
      this.tenantSelector.appendChild (option);
    });
  }

  // Handle tenant change
  handleTenantChange () {
    const tenantId = this.tenantSelector.value;

    if (tenantId) {
      this.currentTenant = tenantId;
      this.api.setTenantId (tenantId);

      // Load cases for the selected tenant
      this.loadCases ();
    } else {
      this.currentTenant = null;
      this.api.setTenantId (null);
      this.clearCases ();
    }
  }

  // Show tenant error
  showTenantError () {
    const option = document.createElement ('option');
    option.value = '';
    option.textContent = 'Error loading clients';

    this.tenantSelector.innerHTML = '';
    this.tenantSelector.appendChild (option);
  }

  // Load cases for the current tenant
  async loadCases () {
    if (!this.currentTenant) return;

    try {
      this.showCaseLoading ();

      const result = await this.api.getCases ();

      if (result.cases && result.cases.length > 0) {
        this.renderCases (result.cases);

        // Select first case if none is selected
        if (!this.currentCase) {
          this.caseSelector.value = result.cases[0].id;
          this.handleCaseChange ();
        }
      } else {
        this.showNoCases ();
      }
    } catch (error) {
      console.error ('Failed to load cases:', error);
      this.showCaseError ();
    }
  }

  // Render case options
  renderCases (cases) {
    // Clear existing options except the placeholder
    while (this.caseSelector.options.length > 1) {
      this.caseSelector.remove (1);
    }

    // Add case options
    cases.forEach (caseItem => {
      const option = document.createElement ('option');
      option.value = caseItem.id;
      option.textContent = `${caseItem.case_number} - ${caseItem.title}`;
      this.caseSelector.appendChild (option);
    });

    // Enable case selector and case info button
    this.caseSelector.disabled = false;
    this.caseInfoBtn.disabled = false;
  }

  // Handle case change
  handleCaseChange () {
    const caseId = this.caseSelector.value;

    if (caseId) {
      this.currentCase = caseId;

      // Load documents for the selected case
      this.documentHandler.loadDocuments (caseId);

      // Enable case info button
      this.caseInfoBtn.disabled = false;
    } else {
      this.currentCase = null;

      // Clear document display
      this.documentHandler.clearDocumentList ();
      this.documentHandler.clearDocumentPreview ();

      // Disable case info button
      this.caseInfoBtn.disabled = true;
    }
  }

  // Show case loading state
  showCaseLoading () {
    this.caseSelector.innerHTML = '<option value="">Loading cases...</option>';
    this.caseSelector.disabled = true;
    this.caseInfoBtn.disabled = true;
  }

  // Show no cases message
  showNoCases () {
    this.caseSelector.innerHTML = '<option value="">No cases found</option>';
    this.caseSelector.disabled = true;
    this.caseInfoBtn.disabled = true;
  }

  // Show case error
  showCaseError () {
    this.caseSelector.innerHTML =
      '<option value="">Error loading cases</option>';
    this.caseSelector.disabled = true;
    this.caseInfoBtn.disabled = true;
  }

  // Clear cases
  clearCases () {
    this.caseSelector.innerHTML = '<option value="">Select a case</option>';
    this.caseSelector.disabled = true;
    this.caseInfoBtn.disabled = true;
    this.currentCase = null;

    // Clear document display
    this.documentHandler.clearDocumentList ();
    this.documentHandler.clearDocumentPreview ();
  }

  // Initialize OCR handler
  initOCRHandler () {
    if (!this.ocrHandler) {
      this.ocrHandler = new OCRHandler (this.api);
    }
  }

  // Initialize report handler
  initReportHandler () {
    if (!this.reportHandler) {
      this.reportHandler = new ReportHandler (this.api);
    }
  }

  // Initialize analysis handler
  initAnalysisHandler () {
    if (!this.analysisHandler) {
      this.analysisHandler = new AnalysisHandler (this.api);
    }
  }
}

// Initialize application when DOM is loaded
document.addEventListener ('DOMContentLoaded', () => {
  window.app = new ForensicDocumentApp ();

  // Initialize other handlers
  window.app.initOCRHandler ();
  window.app.initReportHandler ();
  window.app.initAnalysisHandler ();
});
