const BASE_URL = 'http://optimus-india-njs-01.netbird.cloud:6008/bhms';

class FormsAPI {
  // Helper method to make API requests
  async apiRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`Making API request: ${config.method || 'GET'} ${url}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'Unknown error';
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || 'Unknown error';
        }
        throw new Error(`API Error (${response.status}): ${errorMessage}`);
      }
      
      const data = await response.json();
      console.log(`API response received:`, data);
      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Please check your internet connection and API server status.');
      }
      console.error('API Request failed:', error.message);
      throw error;
    }
  }

  // FORM MANAGEMENT ENDPOINTS

  // Get all forms
  async getAllForms() {
    return this.apiRequest('/forms');
  }

  // Get form by ID
  async getFormById(formId) {
    return this.apiRequest(`/forms/${formId}`);
  }

  // Create new form
  async createForm(formData) {
    return this.apiRequest('/forms', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  }

  // Update form
  async updateForm(formId, formData) {
    return this.apiRequest(`/forms/${formId}`, {
      method: 'PUT',
      body: JSON.stringify(formData),
    });
  }

  // Delete form
  async deleteForm(formId) {
    return this.apiRequest(`/forms/${formId}`, {
      method: 'DELETE',
    });
  }

  // FIELD (QUESTIONS) MANAGEMENT ENDPOINTS

  // Get all fields for a form
  async getFormFields(formId) {
    return this.apiRequest(`/forms/${formId}/fields`);
  }

  // Get specific field
  async getFormField(formId, fieldId) {
    return this.apiRequest(`/forms/${formId}/fields/${fieldId}`);
  }

  // Add new field to form
  async addFormField(formId, fieldData) {
    return this.apiRequest(`/forms/${formId}/fields`, {
      method: 'POST',
      body: JSON.stringify(fieldData),
    });
  }

  // Update field
  async updateFormField(formId, fieldId, fieldData) {
    return this.apiRequest(`/forms/${formId}/fields/${fieldId}`, {
      method: 'PUT',
      body: JSON.stringify(fieldData),
    });
  }

  // Delete field
  async deleteFormField(formId, fieldId) {
    return this.apiRequest(`/forms/${formId}/fields/${fieldId}`, {
      method: 'DELETE',
    });
  }

  // FORM RESPONSES ENDPOINTS

  // Get all responses for a form (admin view)
  async getFormResponses(formId) {
    return this.apiRequest(`/form-responses/${formId}`);
  }

  // Get specific response details by response ID
  async getResponseDetails(formId, responseId) {
    // Since the API returns all responses for a form, we'll filter for the specific one
    const allResponses = await this.getFormResponses(formId);
    return allResponses.find(response => response._id === responseId);
  }

  // Submit form response (user endpoint - for completeness)
  async submitFormResponse(responseData) {
    return this.apiRequest('/form-responses', {
      method: 'POST',
      body: JSON.stringify(responseData),
    });
  }

  // UTILITY METHODS

  // Bulk delete forms
  async bulkDeleteForms(formIds) {
    const deletePromises = formIds.map(id => this.deleteForm(id));
    return Promise.all(deletePromises);
  }

  // Bulk delete fields
  async bulkDeleteFields(formId, fieldIds) {
    const deletePromises = fieldIds.map(fieldId => this.deleteFormField(formId, fieldId));
    return Promise.all(deletePromises);
  }
}

export default new FormsAPI();