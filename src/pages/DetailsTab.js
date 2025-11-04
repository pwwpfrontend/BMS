import React, { useState } from 'react';
import imageApi from '../services/imageApi';

const BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

const apiRequest = async (endpoint, method = 'GET', data = null) => {
  const url = `${BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    // Check if response is plain text
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/plain')) {
      return await response.text();
    }
    
    // Try to parse as JSON, but if it fails and looks like plain text, return as text
    const responseText = await response.text();
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      // If it's a UUID-like string, return as is
      if (responseText.match(/^[a-f0-9-]{36}$/i)) {
        return responseText;
      }
      // Otherwise, throw the parse error
      throw parseError;
    }
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

function DetailsTab({ resource, onUpdate }) {
  const [formData, setFormData] = useState({
    resource_name: resource.name || '',
    category: resource.category || '',
    resource_details: resource.details?.resourceDetails || '',
    email_confirmation: resource.email_confirmation || false,
    photo_url: resource.image || null
  });

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Get existing data from the original resource
      const existingData = resource.originalData || {};
      const existingMetadata = existingData.metadata || {};
      
      // Build the update request body matching the API structure
      const requestBody = {
        name: formData.resource_name,  // Changed from resource_name to name
        capacity: resource.limitations?.capacity || existingMetadata.capacity || 10,
        metadata: {
          photo_url: formData.photo_url,
          category: formData.category,
          resource_details: {
            description: formData.resource_details
          },
          email_confirmation: formData.email_confirmation,
          rates: existingMetadata.rates || [],
          resource_plans: existingMetadata.resource_plans || []
        },
        // Preserve existing timing and duration settings
        defined_timings: existingData.defined_timings || [],
        max_duration: existingData.max_duration || 'PT10H',
        min_duration: existingData.min_duration || 'PT1H',
        duration_interval: existingData.duration_interval || 'PT15M'
      };
      
      console.log('DetailsTab: Updating resource with ID:', resource.id);
      console.log('DetailsTab: Update request body:', requestBody);
      
      const response = await apiRequest(`/updateResource/${resource.id}`, 'PUT', requestBody);
      console.log('DetailsTab: Update response:', response);
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-[#79C485] text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = 'Resource updated successfully!';
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.parentNode.removeChild(successMessage);
        }
      }, 3000);
      
      if (onUpdate) {
        console.log('DetailsTab: Calling onUpdate to refresh data');
        await onUpdate();
      }
    } catch (err) {
      console.error('DetailsTab: Save error:', err);
      alert('Failed to update resource: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    // Show immediate local preview
    const localPreview = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, photo_url: localPreview }));
  
    try {
      setUploadingImage(true);
      const result = await imageApi.uploadImage(file);
      console.log('Upload result:', result);
  
      const imageUrl = result.image_url || result.url || result.imageUrl;
      if (!imageUrl) throw new Error('Upload did not return image URL');
  
      setFormData((prev) => ({ ...prev, photo_url: imageUrl }));
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image: ' + err.message);
      // Revert to original photo
      setFormData((prev) => ({ ...prev, photo_url: resource.image || null }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDiscard = () => {
    setFormData({
      resource_name: resource.name || '',
      category: resource.category || '',
      resource_details: resource.details?.resourceDetails || '',
      email_confirmation: resource.email_confirmation || false,
      photo_url: resource.image || null
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resource name</label>
          <input
            type="text"
            value={formData.resource_name}
            onChange={(e) => setFormData({ ...formData, resource_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select 
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a category</option>
            <option value="meeting_room">Meeting Room</option>
            <option value="conference_room">Conference Room</option>
            <option value="workspace">Workspace</option>
            <option value="desk">Desk</option>
            <option value="equipment">Equipment</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Email Confirmation</h3>
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">Send email confirmation for bookings</label>
          <label className="relative inline-block w-12 h-6 cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.email_confirmation}
              onChange={(e) => setFormData({ ...formData, email_confirmation: e.target.checked })}
              className="sr-only peer" 
            />
            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-6 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Resource details</label>
        <textarea
          value={formData.resource_details}
          onChange={(e) => setFormData({ ...formData, resource_details: e.target.value })}
          placeholder="Enter resource details..."
          rows="6"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
        <div className="flex items-start gap-4">
          <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
            {formData.photo_url ? (
              <img 
                src={formData.photo_url} 
                alt="Resource" 
                className="w-full h-full object-cover rounded" 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="flex items-center justify-center text-gray-400" style={{ display: formData.photo_url ? 'none' : 'flex' }}>
              <span className="text-xs">No Image</span>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploadingImage}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {uploadingImage && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Uploading...</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">The file size limit is 10MB</p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button 
          onClick={handleDiscard}
          disabled={isSaving}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Discard Changes
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          Save
        </button>
      </div>
    </div>
  );
}

export default DetailsTab;