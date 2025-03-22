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

      // Fix the URL construction here - remove the extra slash
      const response = await fetch (`${this.baseUrl}?${queryParams}`);

      if (!response.ok) {
        throw new Error (`API error: ${response.status}`);
      }

      return await response.json ();
    } catch (error) {
      console.error ('Error fetching cases:', error);
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
      console.log (`API: Uploading document to case ${caseId}`);
      console.log (
        `File details: name=${file.name}, type=${file.type}, size=${file.size}bytes`
      );
      console.log (`Document type: ${documentType}, Analyze: ${analyze}`);

      const formData = new FormData ();
      formData.append ('file', file);
      formData.append ('document_type', documentType);
      formData.append ('analyze', analyze.toString ());

      // Log form data entries for debugging
      console.log ('Form data entries:');
      for (let [key, value] of formData.entries ()) {
        console.log (`- ${key}: ${value instanceof File ? value.name : value}`);
      }

      console.log (
        `Making fetch request to: ${this.baseUrl}/${caseId}/documents`
      );

      const response = await fetch (`${this.baseUrl}/${caseId}/documents`, {
        method: 'POST',
        body: formData,
      });

      console.log (
        `Response status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        const errorText = await response.text ();
        console.error (`API error response: ${errorText}`);
        throw new Error (`API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json ();
      console.log ('API response:', result);

      return result;
    } catch (error) {
      console.error (`Error uploading document to case ${caseId}:`, error);
      throw error;
    }
  }

  async getDocument (caseId, documentId, includeOcr = true) {
    try {
      // Add query parameters to include OCR data and raw text
      const queryParams = new URLSearchParams ();
      if (includeOcr) {
        queryParams.append ('include_ocr', 'true');
        queryParams.append ('include_raw_text', 'true');
      }

      const url = `${this.baseUrl}/${caseId}/documents/${documentId}?${queryParams}`;
      console.log (`Fetching document: ${url}`);

      const response = await fetch (url);

      if (!response.ok) {
        console.error (`API error: ${response.status}`);
        throw new Error (`API error: ${response.status}`);
      }

      const data = await response.json ();
      console.log (`Document data received:`, data);
      return data;
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
