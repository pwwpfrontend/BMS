const BASE_URL = 'https://njs-01.optimuslab.space/bhms';

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
          errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
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

  // Toggle form active status
  async toggleFormStatus(formId, isActive) {
    return this.apiRequest(`/forms/${formId}`, {
      method: 'PUT',
      body: JSON.stringify({ active: isActive }),
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

  // Get all responses for a form
  async getFormResponses(formId) {
    return this.apiRequest(`/form-responses/${formId}`);
  }

  // Get specific response details by response ID
  async getResponseDetails(formId, responseId) {
    const allResponses = await this.getFormResponses(formId);
    return allResponses.find(response => response._id === responseId);
  }

  // Submit form response
  async submitFormResponse(responseData) {
    return this.apiRequest('/form-responses', {
      method: 'POST',
      body: JSON.stringify(responseData),
    });
  }

  // Delete a single response
  async deleteResponse(formId, responseId) {
    return this.apiRequest(`/form-responses/${responseId}`, {
      method: 'DELETE',
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

  // Bulk delete responses
  async bulkDeleteResponses(responseIds) {
    const deletePromises = responseIds.map(responseId => this.deleteResponse(null, responseId));
    return Promise.all(deletePromises);
  }

  // Send form to customer
  async sendFormToCustomer(formId, customerEmail, customerName) {
    // Get the complete form data including all fields
    const formData = await this.getFormById(formId);
    
    // Prepare the request body with complete form information
    const requestBody = {
      formId: formData._id,
      formName: formData.name,
      formDescription: formData.description,
      formType: formData.type,
      customerEmail: customerEmail,
      customerName: customerName,
      fields: formData.fields,
      sentAt: new Date().toISOString()
    };

    console.log('Sending form to customer:', requestBody);

    // TODO: Replace with actual API endpoint when available
    // For now, this logs the data that would be sent
    // In production, this would be: return this.apiRequest('/send-form', { method: 'POST', body: JSON.stringify(requestBody) });
    
    return requestBody;
  }
}

export default new FormsAPI();