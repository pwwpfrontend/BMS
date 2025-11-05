const BASE_URL = 'https://njs-01.optimuslab.space/booking_features';

class FormsAPI {
  // Helper method to make API requests
  async apiRequest(endpoint, options = {}) {
    const isAbsolute = typeof endpoint === 'string' && /^https?:\/\//i.test(endpoint);
    const url = isAbsolute ? endpoint : `${BASE_URL}${endpoint}`;
    // Resolve bearer token similar to other pages: prefer sessionStorage/localStorage 'access_token', allow explicit override
    const token = (options && options.token)
      || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('access_token'))
      || (typeof localStorage !== 'undefined' && localStorage.getItem('access_token'))
      || (typeof window !== 'undefined' && (window.ACCESS_TOKEN || window.BEARER_TOKEN))
      || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BEARER_TOKEN);
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  async getAllForms(token) {
    const data = await this.apiRequest('/forms', { token });
    return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
  }

  // Get form by ID
  async getFormById(formId, token) {
    return this.apiRequest(`/forms/${formId}`, { token });
  }

  // Create new form
  async createForm(formData, token) {
    return this.apiRequest('/forms', {
      method: 'POST',
      body: JSON.stringify(formData),
      token,
    });
  }

  // Update form
  async updateForm(formId, formData, token) {
    return this.apiRequest(`/forms/${formId}`, {
      method: 'PUT',
      body: JSON.stringify(formData),
      token,
    });
  }

  // Delete form
  async deleteForm(formId, token) {
    return this.apiRequest(`/forms/${formId}`, {
      method: 'DELETE',
      token,
    });
  }

  // Toggle form active status
  async toggleFormStatus(formId, isActive, token) {
    return this.apiRequest(`/forms/${formId}`, {
      method: 'PUT',
      body: JSON.stringify({ active: isActive }),
      token,
    });
  }

  // FIELD (QUESTIONS) MANAGEMENT ENDPOINTS

  // Get all fields for a form
  async getFormFields(formId, token) {
    return this.apiRequest(`/forms/${formId}/fields`, { token });
  }

  // Get specific field
  async getFormField(formId, fieldId, token) {
    return this.apiRequest(`/forms/${formId}/fields/${fieldId}`, { token });
  }

  // Add new field to form
  async addFormField(formId, fieldData, token) {
    return this.apiRequest(`/forms/${formId}/fields`, {
      method: 'POST',
      body: JSON.stringify(fieldData),
      token,
    });
  }

  // Update field
  async updateFormField(formId, fieldId, fieldData, token) {
    return this.apiRequest(`/forms/${formId}/fields/${fieldId}`, {
      method: 'PUT',
      body: JSON.stringify(fieldData),
      token,
    });
  }

  // Delete field
  async deleteFormField(formId, fieldId, token) {
    return this.apiRequest(`/forms/${formId}/fields/${fieldId}`, {
      method: 'DELETE',
      token,
    });
  }

  // FORM RESPONSES ENDPOINTS

  // Get all responses for a form
  async getFormResponses(formId, token) {
    const data = await this.apiRequest(`/form-responses/${formId}`, { token });
    return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
  }

  // Get specific response details by response ID
  async getResponseDetails(formId, responseId, token) {
    return this.apiRequest(`/form-responses/response/${responseId}`, { token });
  }

  // Submit form response
  async submitFormResponse(responseData, token) {
    return this.apiRequest('/form-responses', {
      method: 'POST',
      body: JSON.stringify(responseData),
      token,
    });
  }

  // Delete a single response
  async deleteResponse(formId, responseId, token) {
    return this.apiRequest(`/form-responses/response/${responseId}`, {
      method: 'DELETE',
      token,
    });
  }

  // UTILITY METHODS

  // Bulk delete forms
  async bulkDeleteForms(formIds, token) {
    const deletePromises = formIds.map(id => this.deleteForm(id, token));
    return Promise.all(deletePromises);
  }

  // Bulk delete fields
  async bulkDeleteFields(formId, fieldIds, token) {
    const deletePromises = fieldIds.map(fieldId => this.deleteFormField(formId, fieldId, token));
    return Promise.all(deletePromises);
  }

  // Bulk delete responses
  async bulkDeleteResponses(responseIds) {
    const deletePromises = responseIds.map(responseId => this.deleteResponse(null, responseId));
    return Promise.all(deletePromises);
  }

  // BHMS endpoints (absolute URLs)
  async getBhmsForms(token) {
    return this.apiRequest('https://njs-01.optimuslab.space/bhms/forms', { token });
  }

  async getBhmsFormResponses(formId, token) {
    return this.apiRequest(`https://njs-01.optimuslab.space/bhms/form-responses/${formId}`, { token });
  }

  async getPlans(token) {
    return this.apiRequest('https://njs-01.optimuslab.space/booking_features/plans', { token });
  }

  // Response status update
  async updateResponseStatus(responseId, status, token) {
    return this.apiRequest(`https://njs-01.optimuslab.space/booking_features/form-responses/${responseId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
      token,
    });
  }

  // Interested user submission
  async createInterested(payload, token) {
    return this.apiRequest('https://njs-01.optimuslab.space/booking_features/interested', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    });
  }

  // Get interests (admin)
  async getInterested(token) {
    return this.apiRequest('https://njs-01.optimuslab.space/booking_features/interested', { token });
  }

  // Send/assign form (admin)
  async sendFormAssignment(payload, token) {
    return this.apiRequest('https://njs-01.optimuslab.space/booking_features/send-forms', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    });
  }

  // Token-based response submission
  async submitResponseViaToken(payload, token) {
    return this.apiRequest('https://njs-01.optimuslab.space/booking_features/form-responses/token', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    });
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