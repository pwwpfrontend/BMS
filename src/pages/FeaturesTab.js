import React, { useState, useEffect } from 'react';

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
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

function FeaturesTab({ resource, onUpdate }) {
  const [features, setFeatures] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [security, setSecurity] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const featuresArray = Object.entries(resource.details?.features || {}).map(([key, value]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      enabled: value,
      description: ''
    }));

    const amenitiesArray = Object.entries(resource.details?.amenities || {}).map(([key, value]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      enabled: value,
      description: ''
    }));

    const securityArray = Object.entries(resource.details?.security || {}).map(([key, value]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      enabled: value,
      description: ''
    }));

    setFeatures(featuresArray);
    setAmenities(amenitiesArray);
    setSecurity(securityArray);
  }, [resource.details?.features, resource.details?.amenities, resource.details?.security]);

  const handleItemToggle = (category, itemId, value) => {
    if (category === 'features') {
      setFeatures(prev => prev.map(item => 
        item.id === itemId ? { ...item, enabled: value } : item
      ));
    } else if (category === 'amenities') {
      setAmenities(prev => prev.map(item => 
        item.id === itemId ? { ...item, enabled: value } : item
      ));
    } else if (category === 'security') {
      setSecurity(prev => prev.map(item => 
        item.id === itemId ? { ...item, enabled: value } : item
      ));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const featuresData = features.reduce((acc, item) => {
        acc[item.id] = item.enabled;
        return acc;
      }, {});

      const amenitiesData = amenities.reduce((acc, item) => {
        acc[item.id] = item.enabled;
        return acc;
      }, {});

      const securityData = security.reduce((acc, item) => {
        acc[item.id] = item.enabled;
        return acc;
      }, {});

      const metadata = resource.originalData?.metadata?.capacity || resource.originalData?.metadata || {};

      const resourceData = {
        name: resource.name,
        metadata: {
          capacity: resource.limitations?.capacity || 10,
          category: resource.category || 'meeting_room',
          photo_url: resource.image || null,
          location_id: "g1PhBs8LucuZrpXXOVfwIdzXcFdpvwazyMupP9iH9e59ca39",
          resource_details: {
            description: resource.details?.resourceDetails || '',
            features: featuresData,
            amenities: amenitiesData,
            security: securityData
          },
          email_confirmation: resource.email_confirmation || false,
          rates: resource.rates || [],
          resource_plans: metadata.resource_plans || [],
          defined_timings: resource.defined_timings || []
        }
      };
      
      const response = await apiRequest(`/updateResource/${resource.id}`, 'PUT', resourceData);
      
      if (response.message === 'Resource updated successfully') {
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-[#79C485] text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = 'Features updated successfully!';
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
          }
        }, 3000);
        
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error updating features:', error);
      alert('Failed to update features: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const CategorySection = ({ title, items, category }) => (
    <div>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-3 gap-4">
        {items.length === 0 ? (
          <div className="col-span-3 text-center py-8">
            <p className="text-gray-500 text-sm italic">No {title.toLowerCase()} added yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id}>
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={item.enabled}
                  onChange={(e) => handleItemToggle(category, item.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600" 
                />
                <span className="text-sm">{item.name}</span>
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <CategorySection title="Features" items={features} category="features" />
      <CategorySection title="Amenities" items={amenities} category="amenities" />
      <CategorySection title="Security" items={security} category="security" />

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default FeaturesTab;