class CaseAPI {
  constructor () {
    this.baseUrl = '/api/cases';
  }

  async getCases (status = null, page = 1, limit = 20) {
    try {
      const queryParams = new URLSearchParams ();
      if (status && status !== '全部') {
        queryParams.append ('status', status);
      }
      queryParams.append ('skip', (page - 1) * limit);
      queryParams.append ('limit', limit);

      const response = await fetch(`${this.baseUrl}/?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching cases:', error);
      throw error;
    }
  }

  async getCase (caseId) {
    try {
      const response = await fetch (`${this.baseUrl}/${caseId}`);

      if (!response.ok) {
        throw new Error (`API error: ${response.status}`);
      }

      return await response.json ();
    } catch (error) {
      console.error (`Error fetching case ${caseId}:`, error);
      throw error;
    }
  }

  async createCase (caseData) {
    try {
      const response = await fetch (this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify (caseData),
      });

      if (!response.ok) {
        throw new Error (`API error: ${response.status}`);
      }

      return await response.json ();
    } catch (error) {
      console.error ('Error creating case:', error);
      throw error;
    }
  }

  async updateCase (caseId, caseData) {
    try {
      const response = await fetch (`${this.baseUrl}/${caseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify (caseData),
      });

      if (!response.ok) {
        throw new Error (`API error: ${response.status}`);
      }

      return await response.json ();
    } catch (error) {
      console.error (`Error updating case ${caseId}:`, error);
      throw error;
    }
  }

  async uploadDocument (caseId, file, documentType = '待分类', analyze = false) {
    try {
      const formData = new FormData ();
      formData.append ('file', file);
      formData.append ('document_type', documentType);
      formData.append ('analyze', analyze.toString ());

      const response = await fetch (`${this.baseUrl}/${caseId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error (`API error: ${response.status}`);
      }

      return await response.json ();
    } catch (error) {
      console.error (`Error uploading document to case ${caseId}:`, error);
      throw error;
    }
  }

  async getDocument (caseId, documentId) {
    try {
      const response = await fetch (
        `${this.baseUrl}/${caseId}/documents/${documentId}`
      );

      if (!response.ok) {
        throw new Error (`API error: ${response.status}`);
      }

      return await response.json ();
    } catch (error) {
      console.error (`Error fetching document ${documentId}:`, error);
      throw error;
    }
  }

  async updateDocument (caseId, documentId, documentData) {
    try {
      const response = await fetch (
        `${this.baseUrl}/${caseId}/documents/${documentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify (documentData),
        }
      );

      if (!response.ok) {
        throw new Error (`API error: ${response.status}`);
      }

      return await response.json ();
    } catch (error) {
      console.error (`Error updating document ${documentId}:`, error);
      throw error;
    }
  }
}

// Export the API instance
window.caseAPI = new CaseAPI ();
