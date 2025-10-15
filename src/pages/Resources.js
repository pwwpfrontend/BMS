import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, SlidersHorizontal, Download, Menu, MapPin, Plus } from 'lucide-react';
import { apiRequest } from '../utils/api';

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
        
        // Reset form
        setFormData({
          name: '',
          max_simultaneous_bookings: 1
        });
        
        // Call success callback
        if (onSuccess) onSuccess();
        
        // Close modal
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
    const [activeTab, setActiveTab] = useState('details');
    const [selectedForBulk, setSelectedForBulk] = useState([]);
    const [showBulkMenu, setShowBulkMenu] = useState(false);
    const [resources, setResources] = useState([]); // Start with empty array
    const [loading, setLoading] = useState(true); // Add loading state
    const [error, setError] = useState(null); // Add error state
    const [showAddModal, setShowAddModal] = useState(false); 
  
    // Fetch resources on mount
    useEffect(() => {
      fetchResources();
    }, []);
  
    const fetchResources = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiRequest('/all-resources', 'GET');
        
        // Transform backend data to match frontend structure
        const transformedResources = response.data?.map(resource => ({
          id: resource.id,
          name: resource.name,
          location: 'CUHK InnoPort', // Default or fetch from location_id if available
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
    return <ResourceDetail resource={selectedResource} onBack={() => setSelectedResource(null)} />;
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
        // Delete each selected resource
        for (const id of selectedForBulk) {
          await apiRequest(`/delete-resource/${id}`, 'DELETE');
        }
        
        // Refresh the list
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
    <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
      <Plus className="w-4 h-4 inline mr-2" />
      Add your first resource
    </button>
  </div>
)}

{!loading && !error && resources.length > 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* existing grid code */}
  </div>
)}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => (
               // Find this section in the grid (around line 85-110)
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

function ResourceDetail({ resource, onBack }) {
  const [activeTab, setActiveTab] = useState('details');

  const tabs = [
    { id: 'details', label: 'Details', icon: Menu },
    { id: 'features', label: 'Features', icon: SlidersHorizontal },
    { id: 'limitations', label: 'Limitations', icon: SlidersHorizontal },
    { id: 'rates', label: 'Rates', icon: null }
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
                {activeTab === 'details' && <DetailsTab resource={resource} />}
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
            <div className="border border-gray-300 rounded-lg">
              {/* Toolbar */}
              <div className="flex items-center gap-1 p-2 border-b border-gray-300 bg-gray-50">
                <button className="p-2 hover:bg-gray-200 rounded" title="Bold">
                  <strong className="text-sm">B</strong>
                </button>
                <button className="p-2 hover:bg-gray-200 rounded italic" title="Italic">
                  <span className="text-sm">i</span>
                </button>
                <button className="p-2 hover:bg-gray-200 rounded underline" title="Underline">
                  <span className="text-sm">U</span>
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button className="p-2 hover:bg-gray-200 rounded text-sm" title="Align left">
                  ☰
                </button>
                <button className="p-2 hover:bg-gray-200 rounded text-sm" title="Align center">
                  ≡
                </button>
                <button className="p-2 hover:bg-gray-200 rounded text-sm" title="Bullet list">
                  •
                </button>
                <button className="p-2 hover:bg-gray-200 rounded text-sm" title="Link">
                  🔗
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button className="p-2 hover:bg-gray-200 rounded text-sm" title="Undo">
                  ↶
                </button>
                <button className="p-2 hover:bg-gray-200 rounded text-sm" title="Redo">
                  ↷
                </button>
              </div>
              {/* Editor content */}
              <div 
                contentEditable
                className="p-3 min-h-[100px] focus:outline-none"
                onBlur={(e) => setFormData({ ...formData, resourceDetails: e.currentTarget.innerHTML })}
                dangerouslySetInnerHTML={{
                  __html: formData.resourceDetails || '<div class="text-gray-400">Type something...</div>'
                }}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email confirmation details</label>
            <textarea
              placeholder="Type something"
              value={formData.emailConfirmation}
              onChange={(e) => setFormData({ ...formData, emailConfirmation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-[156px]"
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
            <input type="checkbox" checked={resource.details?.features?.standing} className="w-4 h-4 text-blue-600" />
            <span className="text-sm">This resource provides a <strong>standing desk.</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600" />
            <span className="text-sm">This resource is in a <strong>quiet zone.</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.features?.soundproof} className="w-4 h-4 text-blue-600" />
            <span className="text-sm">This resource is a <strong>soundproof room.</strong></span>
          </label>
          {[...Array(6)].map((_, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4 text-blue-600" />
              <span className="text-sm">This resource is in a <strong>quiet zone.</strong></span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Amenities</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.amenities?.internet} className="w-4 h-4 text-blue-600" />
            <span className="text-sm">This resource provides access to the <strong>internet.</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.amenities?.projector} className="w-4 h-4 text-blue-600" />
            <span className="text-sm">This resource includes a <strong>projector.</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600" />
            <span className="text-sm">This resource has a <strong>desktop monitor.</strong></span>
          </label>
          {[...Array(6)].map((_, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4 text-blue-600" />
              <span className="text-sm">This resource has a <strong>desktop monitor.</strong></span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Security</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.security?.locked} className="w-4 h-4 text-blue-600" />
            <span className="text-sm">This resource can be <strong>locked securely.</strong></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={resource.details?.security?.cctv} className="w-4 h-4 text-blue-600" />
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
    const [expandedSections, setExpandedSections] = useState({
      availableTimes: true,
      capacity: true,
      duration: true,
      customerTeams: true
    });
  
    const toggleSection = (section) => {
      setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    };
  
    return (
      <div className="space-y-4">
        {/* Available times and days */}
        <div className="border border-gray-200 rounded-lg">
          <button 
            onClick={() => toggleSection('availableTimes')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Available times and days</h3>
              <p className="text-sm text-gray-500">Set the times of the day and days of the week when this resource available.</p>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.availableTimes ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.availableTimes && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-2">Select custom dates</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Select custom dates"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-2">Start time</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Start time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-2">End time</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="End time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
  
        {/* Capacity */}
        <div className="border border-gray-200 rounded-lg">
          <button 
            onClick={() => toggleSection('capacity')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Capacity</h3>
              <p className="text-sm text-gray-500">This parameter let you set how many people can be accommodated in this resource</p>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.capacity ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.capacity && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={resource.limitations?.capacity || 20}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">persons</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <div className="relative inline-block w-11 h-6">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </div>
                      <span className="text-sm text-gray-600">Limit the number of guests in each booking based on the capacity.</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
  
        {/* Duration */}
        <div className="border border-gray-200 rounded-lg">
          <button 
            onClick={() => toggleSection('duration')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Duration</h3>
              <p className="text-sm text-gray-500">These parameters let you control how long or short bookings can be and the times they can start and end.</p>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.duration ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.duration && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value="MORNING (9AM - 1PM)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time:</label>
                  <div className="relative">
                    <input
                      type="text"
                      value="09:00 am"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time:</label>
                  <div className="relative">
                    <input
                      type="text"
                      value="13:00 pm"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mb-4">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-white bg-white">
                  <Plus className="w-4 h-4" />
                  Add Slot
                </button>
                <button className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 bg-white">
                  MORNING (9AM - 1PM)
                </button>
                <button className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 bg-white">
                  AFTERNOON (1PM - 6PM)
                </button>
                <button className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 bg-white">
                  FULL DAY (9AM - 6PM)
                </button>
              </div>
              
              <div className="flex justify-end">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
  
        {/* Customer and teams */}
        <div className="border border-gray-200 rounded-lg">
          <button 
            onClick={() => toggleSection('customerTeams')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Customer and teams</h3>
              <p className="text-sm text-gray-500">Set which types of members and teams can make bookings for this resource.</p>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.customerTeams ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.customerTeams && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">This Resource can be booked by:</label>
                  <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="booking" defaultChecked className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">All Customers</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="booking" className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Customers with active Plan</span>
                    </label>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm">
                      InnoPeers - CUHK InnoPort
                      <button className="text-gray-400 hover:text-gray-600">×</button>
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm">
                      InnoBuddies - CUHK
                      <button className="text-gray-400 hover:text-gray-600">×</button>
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Restrict the teams which can book this resource to:</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option>Members of any team</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

function RatesTab({ resource }) {
  const [selectedRate, setSelectedRate] = useState(null);

  if (selectedRate) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedRate(null)}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          ← Back to rates
        </button>
        
        <h2 className="text-xl font-semibold">{selectedRate.name}</h2>
        <p className="text-sm text-gray-500">
          Resources can have any number of rates based on the type of users booking it, the time of the day, the day of the week or the duration of the booking.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price name</label>
          <input
            type="text"
            value={selectedRate.name}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">This rate applies to the following resource types</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
            <span className="text-sm">{resource.type}</span>
            <button className="ml-auto text-gray-400 hover:text-gray-600">×</button>
          </div>
        </div>

        <div>
        <h3 className="font-semibold mb-2">Price</h3>
          <p className="text-sm text-gray-500 mb-4">Use this section to set the price to charge when resources of this type are booked.</p>
          
          <div className="flex items-center gap-4">
            <input
              type="text"
              value="HK$0.00"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>every hour</option>
              <option>every use</option>
              <option>per booking</option>
            </select>
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
          
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add rate</span>
          </button>
        </div>
      </div>

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
            {resource.rates?.map((rate, index) => (
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
                  <div className="font-medium text-gray-900">{rate.name}</div>
                  {rate.dateRange && (
                    <div className="text-sm text-gray-500">{rate.dateRange}</div>
                  )}
                  <div className="text-sm text-gray-500">{rate.type}</div>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="font-medium text-gray-900">{rate.price}</div>
                  <div className="text-sm text-gray-500">{rate.period}</div>
                </td>
                <td className="px-4 py-4 text-center">
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    •••
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
          <button className="px-2 py-1 hover:bg-gray-100 rounded">‹</button>
          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded">1</span>
          <button className="px-2 py-1 hover:bg-gray-100 rounded">›</button>
        </div>
      </div>
     
    </div>
    
  );
}