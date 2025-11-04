import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Download, Menu, Plus } from 'lucide-react';

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

function RatesTab({ resource, onUpdate }) {
  // Initialize rates from resource.rates which now comes from metadata.rates
  const [rates, setRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Update rates when resource changes
  useEffect(() => {
    console.log('RatesTab: Resource data:', resource);
    console.log('RatesTab: Resource rates:', resource.rates);
    setRates(resource.rates || []);
  }, [resource]);

  const addNewRate = () => {
    const newRate = {
      price_name: 'New Rate',
      description: '',
      price: 0,
      renewal_type: 'every hour'
    };
    setRates([...rates, newRate]);
    setSelectedRate(newRate);
  };

  const updateRate = (index, updatedRate) => {
    const newRates = [...rates];
    newRates[index] = updatedRate;
    setRates(newRates);
  };

  const deleteRate = (index) => {
    const newRates = rates.filter((_, i) => i !== index);
    setRates(newRates);
    if (selectedRate === rates[index]) {
      setSelectedRate(null);
    }
  };

  const handleSaveRates = async () => {
    try {
      setIsSaving(true);
      
      const existingData = resource.originalData || {};
      const existingMetadata = existingData.metadata || {};
      
      // Build update body with correct structure
      const resourceData = {
        name: resource.name,  // Changed from resource_name to name
        capacity: resource.limitations?.capacity || existingMetadata.capacity || 10,
        metadata: {
          photo_url: resource.image,
          category: resource.category,
          resource_details: {
            description: resource.details?.resourceDetails || ''
          },
          email_confirmation: resource.email_confirmation || false,
          rates: rates,  // Updated rates array
          resource_plans: existingMetadata.resource_plans || []
        },
        // Preserve existing timing and duration settings
        defined_timings: existingData.defined_timings || [],
        max_duration: existingData.max_duration || 'PT10H',
        min_duration: existingData.min_duration || 'PT1H',
        duration_interval: existingData.duration_interval || 'PT15M'
      };
      
      console.log('RatesTab: Saving rates:', resourceData);
      const response = await apiRequest(`/updateResource/${resource.id}`, 'PUT', resourceData);
      console.log('RatesTab: Update response:', response);
      
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-[#79C485] text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = 'Rates updated successfully!';
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.parentNode.removeChild(successMessage);
        }
      }, 3000);
      
      if (onUpdate) await onUpdate();
    } catch (err) {
      console.error('Error updating rates:', err);
      alert('Failed to update rates: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (selectedRate) {
    const rateIndex = rates.findIndex(rate => rate === selectedRate);
    
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedRate(null)}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          ← Back to rates
        </button>
        
        <h2 className="text-xl font-semibold">{selectedRate.price_name}</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price name</label>
          <input
            type="text"
            value={selectedRate.price_name}
            onChange={(e) => {
              const updatedRate = { ...selectedRate, price_name: e.target.value };
              if (rateIndex !== -1) {
                updateRate(rateIndex, updatedRate);
                setSelectedRate(updatedRate);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={selectedRate.description}
            onChange={(e) => {
              const updatedRate = { ...selectedRate, description: e.target.value };
              if (rateIndex !== -1) {
                updateRate(rateIndex, updatedRate);
                setSelectedRate(updatedRate);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
          />
        </div>

        <div>
          <h3 className="font-semibold mb-2">Price</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                value={selectedRate.price}
                onChange={(e) => {
                  const updatedRate = { ...selectedRate, price: parseFloat(e.target.value) || 0 };
                  if (rateIndex !== -1) {
                    updateRate(rateIndex, updatedRate);
                    setSelectedRate(updatedRate);
                  }
                }}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </div>
            <select 
              value={selectedRate.renewal_type}
              onChange={(e) => {
                const updatedRate = { ...selectedRate, renewal_type: e.target.value };
                if (rateIndex !== -1) {
                  updateRate(rateIndex, updatedRate);
                  setSelectedRate(updatedRate);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="every hour">every hour</option>
              <option value="every day">every day</option>
              <option value="every week">every week</option>
              <option value="every month">every month</option>
              <option value="every use">every use</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end items-center pt-4 border-t border-gray-200">
          
          
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedRate(null)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button 
              onClick={handleSaveRates}
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Resource rates</h2>
        <p className="text-sm text-gray-500">
          Resources can have any number of rates based on the type of users booking it, the time of the day, the day of the week or the duration of the booking.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
            <Download className="w-4 h-4" />
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
            <Menu className="w-4 h-4" />
            <span className="text-sm">Bulk actions</span>
          </button>
          
          <button 
            onClick={addNewRate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add rate</span>
          </button>
        </div>
      </div>

      {rates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-2">No rates added yet</p>
          <p className="text-sm text-gray-400 mb-4">Click "Add rate" to create your first pricing rate</p>
          <button 
            onClick={addNewRate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add rate
          </button>
        </div>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                    <input type="checkbox" className="w-4 h-4" />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                    Name ↑
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                    Price ↕
                  </th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRate(rate)}
                  >
                    <td className="px-4 py-4">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4" 
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{rate.price_name || 'Unnamed Rate'}</div>
                      <div className="text-sm text-gray-500">{rate.description || 'No description'}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-medium text-gray-900">${rate.price || 0}</div>
                      <div className="text-sm text-gray-500">{rate.renewal_type || 'every hour'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRate(rate);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Rows per page: 
              <select className="ml-2 border border-gray-300 rounded px-2 py-1">
                <option>15</option>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSaveRates}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Save All Rates
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RatesTab;