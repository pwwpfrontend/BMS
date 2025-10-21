import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, SlidersHorizontal, Download, Menu, MapPin, Plus, X, MoreVertical } from 'lucide-react';
import { apiRequest } from '../utils/api';

// Add Rate Modal Component
function AddRateModal({ isOpen, onClose, onSuccess, resource, editingRate = null }) {
  const [formData, setFormData] = useState({
    price_name: '',
    price: '',
    renewal_type: 'every hour',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const renewalTypes = [
    { value: 'every hour', label: 'every hour' },
    { value: 'every day', label: 'every day' },
    { value: 'every week', label: 'every week' },
    { value: 'every month', label: 'every month' },
    { value: 'every use', label: 'every use' }
  ];

  useEffect(() => {
    if (editingRate) {
      setFormData({
        price_name: editingRate.price_name || '',
        price: editingRate.price || '',
        renewal_type: editingRate.renewal_type || 'every hour',
        description: editingRate.description || ''
      });
    } else {
      setFormData({
        price_name: '',
        price: '',
        renewal_type: 'every hour',
        description: ''
      });
    }
  }, [editingRate, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.price_name || !formData.price) {
      setError('Please fill in price name and price');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const rateData = {
        price_name: formData.price_name,
        description: formData.description || '',
        price: parseFloat(formData.price),
        renewal_type: formData.renewal_type
      };

      // Fetch all resources to get current resource data
      const response = await apiRequest('/viewAllresources', 'GET');
      const allResources = response.data || response;
      
      const currentResource = allResources.find(r => 
        r.name === resource.name || r.id === resource.id
      );
      
      if (!currentResource) {
        throw new Error('Resource not found');
      }
      
      let updatedRates = [...(currentResource.rates || [])];
      
      if (editingRate) {
        // Update existing rate
        const rateIndex = updatedRates.findIndex(r => r.price_name === editingRate.price_name);
        if (rateIndex !== -1) {
          updatedRates[rateIndex] = rateData;
        }
      } else {
        // Add new rate
        updatedRates.push(rateData);
      }

      // Update resource with new rates array
      await apiRequest('/createResource', 'POST', {
        resource_name: currentResource.name,
        defined_timings: currentResource.defined_timings || [],
        max_duration: currentResource.max_duration || 120,
        min_duration: currentResource.min_duration || 30,
        duration_interval: currentResource.duration_interval || 15,
        start_date: currentResource.start_date || new Date().toISOString().split('T')[0],
        capacity: currentResource.capacity || 20,
        category: currentResource.category || 'general',
        rates: updatedRates
      });
      
      setFormData({
        price_name: '',
        price: '',
        renewal_type: 'every hour',
        description: ''
      });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save rate');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingRate ? 'Edit Rate' : 'Add Rate'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Resources can have any number of rates based on the type of users booking it, the time of the day, the day of the week or the duration of the booking.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.price_name}
                onChange={(e) => setFormData({ ...formData, price_name: e.target.value })}
                placeholder="e.g., Standard Hourly Rate"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <h3 className="font-semibold mb-3">Price</h3>
              <p className="text-sm text-gray-500 mb-4">
                Use this section to set the price to charge when resources of this type are booked.
              </p>
              
              <div className="flex items-center gap-4">
                <div className="w-48">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <select
                  value={formData.renewal_type}
                  onChange={(e) => setFormData({ ...formData, renewal_type: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {renewalTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {editingRate ? 'Update Rate' : 'Create Rate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Resource Modal Component
function AddResourceModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    max_simultaneous_bookings: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.max_simultaneous_bookings) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      await apiRequest('/create-resource', 'POST', {
        name: formData.name,
        max_simultaneous_bookings: parseInt(formData.max_simultaneous_bookings)
      });
      
      setFormData({
        name: '',
        max_simultaneous_bookings: 1
      });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Resource</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 1B Co-Working Space"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Simultaneous Bookings <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.max_simultaneous_bookings}
              onChange={(e) => setFormData({ ...formData, max_simultaneous_bookings: e.target.value })}
              placeholder="e.g., 20"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of people that can book this resource simultaneously
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              Create Resource
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Resources() {
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedForBulk, setSelectedForBulk] = useState([]);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiRequest('/viewAllresources', 'GET');
      
      const transformedResources = response.data?.map(resource => ({
        id: resource.id,
        name: resource.name,
        location: 'CUHK InnoPort',
        image: null,
        type: 'Free of Charge - CUHK InnoPort',
        category: 'Co-Working Space',
        details: {
          resourceDetails: '',
          features: {
            standing: false,
            soundproof: false,
            quiet: false
          },
          amenities: {
            internet: false,
            projector: false,
            desktop: false
          },
          security: {
            locked: false,
            cctv: false,
            voiceRecorder: false
          }
        },
        limitations: {
          capacity: resource.max_simultaneous_bookings || 20,
          limitGuests: false,
          timeSlots: [],
          availableFor: 'All Customers',
          teams: [],
          restrictTeams: 'Members of any team'
        },
        rates: []
      })) || [];
      
      setResources(transformedResources);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBulkMenu && !event.target.closest('.relative')) {
        setShowBulkMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBulkMenu]);

  if (selectedResource) {
    return <ResourceDetail resource={selectedResource} onBack={() => setSelectedResource(null)} onUpdate={fetchResources} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar currentPath="/resources" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">Resources</h1>
              <p className="text-sm text-gray-500">All Resources</p>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 flex-1">
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedForBulk.length === resources.length && resources.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForBulk(resources.map(r => r.id));
                      } else {
                        setSelectedForBulk([]);
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Select all</span>
                </label>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="text-sm">Sort</span>
                </button>
                
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 ml-4">
                <div className="relative">
                  <button 
                    onClick={() => setShowBulkMenu(!showBulkMenu)}
                    disabled={selectedForBulk.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 ${
                      selectedForBulk.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Menu className="w-4 h-4" />
                    <span className="text-sm">Bulk actions</span>
                    {selectedForBulk.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {selectedForBulk.length}
                      </span>
                    )}
                  </button>
                  
                  {showBulkMenu && selectedForBulk.length > 0 && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete ${selectedForBulk.length} resource(s)?`)) {
                            try {
                              for (const id of selectedForBulk) {
                                await apiRequest(`/delete-resource/${id}`, 'DELETE');
                              }
                              
                              await fetchResources();
                              setSelectedForBulk([]);
                              setShowBulkMenu(false);
                            } catch (err) {
                              alert('Failed to delete resources: ' + err.message);
                            }
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete selected
                      </button>
                    </div>
                  )}
                </div>
                
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Export</span>
                </button>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Resource</span>
                </button>
              </div>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-500">Loading resources...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">Error loading resources</p>
                <p className="text-sm">{error}</p>
                <button 
                  onClick={fetchResources}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && resources.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No resources found</p>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add your first resource
                </button>
              </div>
            )}

            {!loading && !error && resources.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map((resource) => (
                  <div key={resource.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                    <div 
                      className="aspect-video bg-gray-200 flex items-center justify-center cursor-pointer"
                      onClick={() => setSelectedResource(resource)}
                    >
                      {resource.image ? (
                        <img src={resource.image} alt={resource.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 text-sm">Image</span>
                      )}
                    </div>
                    
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => setSelectedResource(resource)}
                    >
                      <h3 className="font-semibold text-gray-900 mb-2">{resource.name}</h3>
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <MapPin className="w-4 h-4 mr-1" />
                        {resource.location}
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedForBulk(prev => 
                            prev.includes(resource.id) 
                              ? prev.filter(id => id !== resource.id)
                              : [...prev, resource.id]
                          );
                        }}
                        className={`w-full py-2 rounded-lg text-sm font-medium ${
                          selectedForBulk.includes(resource.id)
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {selectedForBulk.includes(resource.id) ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <AddResourceModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchResources}
      />
    </div>
  );
}

function ResourceDetail({ resource, onBack, onUpdate }) {
  const [activeTab, setActiveTab] = useState('details');

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'features', label: 'Features' },
    { id: 'limitations', label: 'Limitations' },
    { id: 'rates', label: 'Rates' }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar currentPath="/resources" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
            <div className="mb-6">
              <button onClick={onBack} className="text-blue-600 hover:text-blue-700 mb-2 text-sm">
                ← Back to Resources
              </button>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">{resource.name}</h1>
              <p className="text-sm text-gray-500">{resource.location}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <div className="flex">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'details' && <DetailsTab resource={resource} onUpdate={onUpdate} />}
                {activeTab === 'features' && <FeaturesTab resource={resource} />}
                {activeTab === 'limitations' && <LimitationsTab resource={resource} />}
                {activeTab === 'rates' && <RatesTab resource={resource} />}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function DetailsTab({ resource, onUpdate }) {
  const [formData, setFormData] = useState({
    name: resource.name || '',
    resourceKind: 'Meeting room',
    resourceType: resource.type || 'Free of Charge - CUHK InnoPort',
    category: resource.category || '',
    displayOnPortal: false,
    displayInCalendar: false,
    resourceDetails: resource.details?.resourceDetails || '',
    emailConfirmation: '',
    photo: resource.image || null
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await apiRequest(`/update-resource/${resource.id}`, 'PATCH', {
        name: formData.name,
        max_simultaneous_bookings: resource.limitations?.capacity || 20
      });
      
      alert('Resource updated successfully!');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Failed to update resource: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setFormData({
      name: resource.name || '',
      resourceKind: 'Meeting room',
      resourceType: resource.type || 'Free of Charge - CUHK InnoPort',
      category: resource.category || '',
      displayOnPortal: false,
      displayInCalendar: false,
      resourceDetails: resource.details?.resourceDetails || '',
      emailConfirmation: '',
      photo: resource.image || null
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resource name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resource kind</label>
          <select 
            value={formData.resourceKind}
            onChange={(e) => setFormData({ ...formData, resourceKind: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Meeting room</option>
            <option>Co-working space</option>
            <option>Event hall</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resource type</label>
          <select 
            value={formData.resourceType}
            onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>{resource.type}</option>
            <option>Free of Charge - CUHK InnoPort</option>
            <option>Paid - Premium</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Web portal and members app</h3>
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm text-gray-600">Display this resource on the web portal and the members App.</label>
          <label className="relative inline-block w-12 h-6 cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.displayOnPortal}
              onChange={(e) => setFormData({ ...formData, displayOnPortal: e.target.checked })}
              className="sr-only peer" 
            />
            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-6 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">Display this resource in the administration panel calendar.</label>
          <label className="relative inline-block w-12 h-6 cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.displayInCalendar}
              onChange={(e) => setFormData({ ...formData, displayInCalendar: e.target.checked })}
              className="sr-only peer" 
            />
            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-6 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resource details</label>
          <textarea
            value={formData.resourceDetails}
            onChange={(e) => setFormData({ ...formData, resourceDetails: e.target.value })}
            placeholder="Type something..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email confirmation details</label>
          <textarea
            placeholder="Type something"
            value={formData.emailConfirmation}
            onChange={(e) => setFormData({ ...formData, emailConfirmation: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
        <div className="flex items-start gap-4">
          <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
            {formData.photo ? (
              <img src={formData.photo} alt="Resource" className="w-full h-full object-cover rounded" />
            ) : (
              <span className="text-xs text-gray-400">Image</span>
            )}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span className="text-sm">Replace file</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">The file size limit is set at 10MB</p>
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

function FeaturesTab({ resource }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Features</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.features?.standing} className="w-4 h-4 text-blue-600" readOnly />
            <span className="text-sm">This resource provides a <strong>standing desk.</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600" />
            <span className="text-sm">This resource is in a <strong>quiet zone.</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.features?.soundproof} className="w-4 h-4 text-blue-600" readOnly />
            <span className="text-sm">This resource is a <strong>soundproof room.</strong></span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Amenities</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.amenities?.internet} className="w-4 h-4 text-blue-600" readOnly />
            <span className="text-sm">This resource provides access to the <strong>internet.</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.amenities?.projector} className="w-4 h-4 text-blue-600" readOnly />
            <span className="text-sm">This resource includes a <strong>projector.</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600" />
            <span className="text-sm">This resource has a <strong>desktop monitor.</strong></span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Security</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.security?.locked} className="w-4 h-4 text-blue-600" readOnly />
            <span className="text-sm">This resource can be <strong>locked securely.</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.security?.cctv} className="w-4 h-4 text-blue-600" readOnly />
            <span className="text-sm">This resource is recorded using <strong>CCTV</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600" />
            <span className="text-sm">This resource provides a <strong>voice recorder.</strong></span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
          Discard Changes
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Save
        </button>
      </div>
    </div>
  );
}

function LimitationsTab({ resource }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Resource Limitations</h3>
        <p className="text-sm text-gray-600">
          Configure availability schedules, booking durations, and access restrictions for this resource.
        </p>
      </div>
      
      <div className="p-4 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Capacity</h4>
        <p className="text-sm text-gray-600">
          Maximum simultaneous bookings: <strong>{resource.limitations?.capacity || 20}</strong>
        </p>
      </div>
    </div>
  );
}

function RatesTab({ resource }) {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      // Fetch all resources and find the current one
      const response = await apiRequest('/viewAllresources', 'GET');
      const allResources = response.data || response;
      
      // Find current resource by name or id
      const currentResource = allResources.find(r => 
        r.name === resource.name || r.id === resource.id
      );
      
      if (currentResource) {
        setRates(currentResource.rates || []);
      } else {
        setRates([]);
      }
    } catch (err) {
      console.error('Failed to fetch rates:', err);
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRate = async (rateName) => {
    if (!window.confirm('Are you sure you want to delete this rate?')) {
      return;
    }

    try {
      // Fetch all resources to get current resource data
      const response = await apiRequest('/viewAllresources', 'GET');
      const allResources = response.data || response;
      
      const currentResource = allResources.find(r => 
        r.name === resource.name || r.id === resource.id
      );
      
      if (!currentResource) {
        throw new Error('Resource not found');
      }
      
      // Remove the rate
      const updatedRates = (currentResource.rates || []).filter(r => r.price_name !== rateName);
      
      // Update resource with new rates array
      await apiRequest('/createResource', 'POST', {
        resource_name: currentResource.name,
        defined_timings: currentResource.defined_timings || [],
        max_duration: currentResource.max_duration || 120,
        min_duration: currentResource.min_duration || 30,
        duration_interval: currentResource.duration_interval || 15,
        start_date: currentResource.start_date || new Date().toISOString().split('T')[0],
        capacity: currentResource.capacity || 20,
        category: currentResource.category || 'general',
        rates: updatedRates
      });
      
      await fetchRates();
      setShowDropdown(null);
    } catch (err) {
      alert('Failed to delete rate: ' + err.message);
    }
  };

  const handleEditRate = (rate) => {
    setEditingRate(rate);
    setShowAddModal(true);
    setShowDropdown(null);
  };

  const formatRenewalType = (type) => {
    const typeMap = {
      'every hour': 'per hour',
      'every day': 'per day',
      'every week': 'per week',
      'every month': 'per month',
      'every use': 'per use'
    };
    return typeMap[type] || type;
  };

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
            onClick={() => {
              setEditingRate(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add rate</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading rates...</p>
        </div>
      ) : rates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">No rates found for this resource</p>
          <button 
            onClick={() => {
              setEditingRate(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add your first rate
          </button>
        </div>
      ) : (
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
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4" 
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{rate.price_name}</div>
                    {rate.description && (
                      <div className="text-sm text-gray-500">{rate.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="font-medium text-gray-900">
                      HK${typeof rate.price === 'number' ? rate.price.toFixed(2) : rate.price}
                    </div>
                    <div className="text-sm text-gray-500">{formatRenewalType(rate.renewal_type)}</div>
                  </td>
                  <td className="px-4 py-4 text-center relative">
                    <button 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(showDropdown === rate.price_name ? null : rate.price_name);
                      }}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {showDropdown === rate.price_name && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => handleEditRate(rate)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRate(rate.price_name)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          <button className="px-2 py-1 hover:bg-gray-100 rounded">‹</button>
          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded">1</span>
          <button className="px-2 py-1 hover:bg-gray-100 rounded">›</button>
        </div>
      </div>

      <AddRateModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingRate(null);
        }}
        onSuccess={fetchRates}
        resource={resource}
        editingRate={editingRate}
      />
    </div>
  );
}