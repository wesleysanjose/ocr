// static/js/api.js

class ApiService {
  constructor () {
    this.baseUrl = ''; // Same domain
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  // Set tenant ID for all requests
  setTenantId (tenantId) {
    this.tenantId = tenantId;
  }

  // Helper to build query parameters
  buildQueryParams (params = {}) {
    if (this.tenantId) {
      params.tenant_id = this.tenantId;
    }

    const queryParams = new URLSearchParams ();

    for (const [key, value] of Object.entries (params)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray (value)) {
          value.forEach (item => queryParams.append (key, item));
        } else {
          queryParams.append (key, value);
        }
      }
    }

    return queryParams.toString ();
  }

  // Generic request method
  async request (endpoint, method = 'GET', data = null, params = {}) {
    const url = `${this.baseUrl}${endpoint}${params ? '?' + this.buildQueryParams (params) : ''}`;

    const options = {
      method,
      headers: this.headers,
      credentials: 'same-origin',
    };

    if (data) {
      options.body = JSON.stringify (data);
    }

    try {
      const response = await fetch (url, options);

      if (!response.ok) {
        const errorData = await response.json ().catch (() => ({}));
        throw new Error (
          errorData.error || `Request failed with status ${response.status}`
        );
      }

      return response.json ();
    } catch (error) {
      console.error ('API request failed:', error);
      throw error;
    }
  }

  // Upload files
  async uploadFile (endpoint, formData, params = {}) {
    if (this.tenantId) {
      formData.append ('tenant_id', this.tenantId);
    }

    const url = `${this.baseUrl}${endpoint}${params ? '?' + this.buildQueryParams (params) : ''}`;

    try {
      const response = await fetch (url, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json ().catch (() => ({}));
        throw new Error (
          errorData.error || `Upload failed with status ${response.status}`
        );
      }

      return response.json ();
    } catch (error) {
      console.error ('File upload failed:', error);
      throw error;
    }
  }

  // Case API methods
  async getCases (params = {}) {
    return this.request (CONFIG.api.cases, 'GET', null, params);
  }

  async getCase (caseId, params = {}) {
    return this.request (`${CONFIG.api.cases}/${caseId}`, 'GET', null, params);
  }

  async createCase (caseData) {
    return this.request (CONFIG.api.cases, 'POST', caseData);
  }

  async updateCase (caseId, caseData) {
    return this.request (`${CONFIG.api.cases}/${caseId}`, 'PUT', caseData);
  }

  async deleteCase (caseId, params = {}) {
    return this.request (
      `${CONFIG.api.cases}/${caseId}`,
      'DELETE',
      null,
      params
    );
  }

  // Document API methods
  async getDocuments (caseId, params = {}) {
    return this.request (
      `${CONFIG.api.cases}/${caseId}/documents`,
      'GET',
      null,
      params
    );
  }

  async getDocument (documentId, params = {}) {
    return this.request (
      `${CONFIG.api.documents}/${documentId}`,
      'GET',
      null,
      params
    );
  }

  async uploadDocument (caseId, formData) {
    formData.append ('case_id', caseId);
    return this.uploadFile (CONFIG.api.documents, formData);
  }

  async getDocumentPreview (documentId, caseId, page = 1) {
    const endpoint = CONFIG.api.documentPreview.replace (
      '{documentId}',
      documentId
    );
    return this.request (endpoint, 'GET', null, {case_id: caseId, page});
  }

  // Report API methods
  async getReports (caseId, params = {}) {
    return this.request (
      `${CONFIG.api.cases}/${caseId}/reports`,
      'GET',
      null,
      params
    );
  }

  async getReport (reportId, params = {}) {
    return this.request (
      `${CONFIG.api.reports}/${reportId}`,
      'GET',
      null,
      params
    );
  }

  async createReport (reportData) {
    return this.request (CONFIG.api.reports, 'POST', reportData);
  }

  async updateReport (reportId, reportData) {
    return this.request (
      `${CONFIG.api.reports}/${reportId}`,
      'PUT',
      reportData
    );
  }

  async analyzeReport (reportId, analysisParams = {}) {
    const endpoint = CONFIG.api.reportAnalyze.replace ('{reportId}', reportId);
    return this.request (endpoint, 'POST', analysisParams);
  }

  // Client/Tenant API methods
  async getClients (params = {}) {
    return this.request (CONFIG.api.clients, 'GET', null, params);
  }
}
