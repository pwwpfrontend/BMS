import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, SlidersHorizontal, Download, Menu, MapPin, Plus, Calendar, Clock, Save, X, Check, AlertCircle, Trash2, Edit, Eye, MoreVertical, Filter, Users, DollarSign, Upload, Link as LinkIcon, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Undo, Redo } from 'lucide-react';
import { apiRequest } from '../utils/api';
import imageApi from '../services/imageApi';

function DeleteConfirmModal({ isOpen, onClose, onConfirm, resourceName, resourceCount }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Delete {resourceCount > 1 ? `${resourceCount} Resources` : 'Resource'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {resourceCount > 1 
                ? `Are you sure you want to delete ${resourceCount} selected resources? This action cannot be undone.`
                : `Are you sure you want to delete "${resourceName}"? This action cannot be undone.`
              }
            </p>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete {resourceCount > 1 ? 'All' : 'Resource'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddResourceModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
      resource_name: '',
      category: '',
      photo_url: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (!formData.resource_name || !formData.category) {
        setError('Please fill in all required fields');
        return;
      }
  
      try {
        setIsSubmitting(true);
        setError(null);
        
        // Create resource with minimal required fields
        const resourceData = {
          resource_name: formData.resource_name,
          category: formData.category,
          defined_timings: [
            { weekday: "monday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "tuesday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "wednesday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "thursday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "friday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "saturday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "sunday", start_time: "09:00:00", end_time: "18:00:00" }
          ],
          max_duration: 120,
          min_duration: 30,
          duration_interval: 15,
          start_date: new Date().toISOString().split('T')[0],
          capacity: 10,
          photo_url: formData.photo_url,
          email_confirmation: false,
          rates: [],
          metadata: {
            capacity: 10,
            category: formData.category,
            photo_url: formData.photo_url,
            location_id: "hk_hong_kong_001", // Default Hong Kong location
            resource_details: {
              description: "",
              features: {
                standing: false,
                soundproof: false,
                quiet: false,
                air_conditioning: true,
                whiteboard: false,
                coffee_machine: false
              },
              amenities: {
                internet: true,
                projector: false,
                desktop: false,
                printer: false,
                scanner: false,
                phone: false
              },
              security: {
                locked: false,
                cctv: false,
                voiceRecorder: false,
                access_control: false,
                alarm_system: false,
                security_guard: false
              }
            },
            email_confirmation: false,
            rates: [],
            defined_timings: [
              { weekday: "monday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "tuesday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "wednesday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "thursday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "friday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "saturday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "sunday", start_time: "09:00:00", end_time: "18:00:00" }
            ]
          }
        };
        
        console.log('Creating resource with data:', resourceData);
        const response = await apiRequest('/createResource', 'POST', resourceData);
        console.log('Create resource response:', response);
        
        // Reset form
        setFormData({
          resource_name: '',
          category: '',
          photo_url: null
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
    
    const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          setError(null);
        // Upload the image and get the URL
        console.log('Uploading image:', file);
        const result = await imageApi.uploadImage(file);
        console.log('Upload result:', result);
        const imageUrl = result.url || result.imageUrl || result.image_url;
        console.log('Extracted image URL:', imageUrl);
        if (imageUrl) {
          setFormData({ ...formData, photo_url: imageUrl });
          console.log('Updated form data with photo_url:', imageUrl);
        } else {
          setError('Failed to get image URL from upload response');
        }
        } catch (err) {
          console.error('Image upload failed:', err);
          setError('Failed to upload image: ' + err.message);
        }
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
                value={formData.resource_name}
                onChange={(e) => setFormData({ ...formData, resource_name: e.target.value })}
                placeholder="e.g., Conference Room A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a category</option>
                <option value="meeting_room">Meeting Room</option>
                <option value="co_working_space">Co-Working Space</option>
                <option value="event_hall">Event Hall</option>
                <option value="office_space">Office Space</option>
                <option value="training_room">Training Room</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo Upload
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload a photo for this resource (optional)
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
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteResourceInfo, setDeleteResourceInfo] = useState({ name: '', count: 0 }); 
  
    // Fetch resources on mount
    useEffect(() => {
      fetchResources();
    }, []);
  
    const fetchResources = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiRequest('/viewAllresources', 'GET');
        
        // Transform backend data to match frontend structure
        const transformedResources = response.data?.map(resource => {
          // Debug logging
          console.log('Resource data:', resource);
          console.log('Photo URL from root:', resource.photo_url);
          console.log('Photo URL from metadata:', resource.metadata?.photo_url);
          
          const imageUrl = resource.photo_url || resource.metadata?.photo_url || null;
          console.log('Final image URL:', imageUrl);
          
          return {
          id: resource.id,
          name: resource.name,
          location: 'CUHK InnoPort', // Default or fetch from location_id if available
            image: imageUrl,
          type: 'Free of Charge - CUHK InnoPort',
          category: resource.metadata?.category || 'meeting_room',
          // Store original API data for updates
          originalData: resource,
          details: {
            resourceDetails: resource.metadata?.resource_details?.description || resource.metadata?.description || '',
            features: Array.isArray(resource.metadata?.resource_details?.features) ? {} : (resource.metadata?.resource_details?.features || {}),
            amenities: Array.isArray(resource.metadata?.resource_details?.amenities) ? {} : (resource.metadata?.resource_details?.amenities || {}),
            security: Array.isArray(resource.metadata?.resource_details?.security) ? {} : (resource.metadata?.resource_details?.security || {})
          },
          limitations: {
            capacity: resource.metadata?.capacity || 10,
            limitGuests: false,
            timeSlots: [],
            availableFor: 'All Customers',
            teams: [],
            restrictTeams: 'Members of any team'
          },
          rates: resource.metadata?.rates || [],
          // Store additional fields from API
          defined_timings: resource.defined_timings || [],
          max_duration: resource.max_duration || 120,
          min_duration: resource.min_duration || 30,
          duration_interval: resource.duration_interval || 15,
          start_date: resource.start_date || new Date().toISOString().split('T')[0],
          email_confirmation: resource.metadata?.email_confirmation || false
          };
        }) || [];
        
        setResources(transformedResources);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch resources:', err);
      } finally {
        setLoading(false);
      }
    };

    const handleDeleteClick = () => {
      if (selectedForBulk.length === 0) return;
      
      const resourceNames = selectedForBulk.map(id => {
        const resource = resources.find(r => r.id === id);
        return resource ? resource.name : 'Unknown';
      });
      
      setDeleteResourceInfo({
        name: resourceNames.length === 1 ? resourceNames[0] : '',
        count: selectedForBulk.length
      });
      setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
      try {
        console.log('Starting delete process for resources:', selectedForBulk);
        
        // Delete each selected resource
        for (const id of selectedForBulk) {
          console.log('Deleting resource with ID:', id);
          try {
            const response = await apiRequest(`/deleteResource/${id}`, 'DELETE');
            console.log('Delete response for', id, ':', response);
          } catch (deleteErr) {
            console.error('Failed to delete resource', id, ':', deleteErr);
            // Continue with other deletions even if one fails
          }
        }
        
        console.log('Delete process completed');
        
        // Refresh the list
        await fetchResources();
        setSelectedForBulk([]);
        setShowBulkMenu(false);
        setShowDeleteModal(false);
        
      } catch (err) {
        console.error('Delete error:', err);
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
              <p className="text-sm text-gray-500">
                {loading ? 'Loading resources...' : `${resources.length} resource${resources.length !== 1 ? 's' : ''} found`}
              </p>
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
      onClick={handleDeleteClick}
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
<div key={resource.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
  <div 
    className="aspect-video bg-gray-200 flex items-center justify-center cursor-pointer"
    onClick={() => setSelectedResource(resource)}
  >
    {resource.image ? (
      <img 
        src={resource.image} 
        alt={resource.name} 
        className="w-full h-full object-cover" 
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
    ) : null}
    <div className="flex flex-col items-center justify-center text-gray-400" style={{ display: resource.image ? 'none' : 'flex' }}>
        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="text-sm">No Image</span>
      </div>
  </div>
  
  <div 
    className="p-4 cursor-pointer"
    onClick={() => setSelectedResource(resource)}
  >
    <h3 className="font-semibold text-gray-900 mb-2">{resource.name}</h3>
    
    <div className="space-y-2 mb-4">
      <div className="flex items-center text-sm text-gray-500">
        <MapPin className="w-4 h-4 mr-1" />
        {resource.location}
      </div>
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
      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
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
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        resourceName={deleteResourceInfo.name}
        resourceCount={deleteResourceInfo.count}
      />
    </div>
  );
}

function ResourceDetail({ resource, onBack, onUpdate }) {
  const [activeTab, setActiveTab] = useState('details');
  const [currentResource, setCurrentResource] = useState(resource);

  // Refresh data when component mounts or resource changes
  useEffect(() => {
    if (resource && resource.id) {
      console.log('ResourceDetail: Component mounted or resource changed, refreshing data');
      refreshResourceData();
    }
  }, [resource.id]);

  const refreshResourceData = async () => {
    try {
      console.log('Refreshing resource data for:', currentResource.name);
      
      // Get the resource by name using Resource Management API
      let response;
      try {
        response = await apiRequest(`/viewResource/${encodeURIComponent(currentResource.name)}`, 'GET');
        console.log('Refreshed resource data by name:', response);
      } catch (nameError) {
        console.log('Failed to get by name, trying to get all resources:', nameError);
        // If getting by name fails, try getting all resources and find by ID
        const allResourcesResponse = await apiRequest('/viewAllresources', 'GET');
        const foundResource = allResourcesResponse.data?.find(r => r.id === currentResource.id);
        if (foundResource) {
          response = { data: [foundResource] };
          console.log('Found resource by ID:', response);
        } else {
          throw new Error('Resource not found');
        }
      }
      
      if (response.data && response.data.length > 0) {
        const updatedResource = response.data[0];
        console.log('Raw updated resource from API:', updatedResource);
        
        // Transform the data to match frontend structure
        const transformedResource = {
          id: updatedResource.id,
          name: updatedResource.name,
          location: 'CUHK InnoPort',
          image: updatedResource.photo_url || updatedResource.metadata?.photo_url || null,
          type: 'Free of Charge - CUHK InnoPort',
          category: updatedResource.metadata?.category || 'meeting_room',
          originalData: updatedResource,
          details: {
            resourceDetails: updatedResource.metadata?.resource_details?.description || updatedResource.metadata?.description || '',
            features: Array.isArray(updatedResource.metadata?.resource_details?.features) ? {} : (updatedResource.metadata?.resource_details?.features || {}),
            amenities: Array.isArray(updatedResource.metadata?.resource_details?.amenities) ? {} : (updatedResource.metadata?.resource_details?.amenities || {}),
            security: Array.isArray(updatedResource.metadata?.resource_details?.security) ? {} : (updatedResource.metadata?.resource_details?.security || {})
          },
          limitations: {
            capacity: updatedResource.metadata?.capacity || 10,
            limitGuests: false,
            timeSlots: [],
            availableFor: 'All Customers',
            teams: [],
            restrictTeams: 'Members of any team'
          },
          rates: updatedResource.metadata?.rates || [],
          defined_timings: updatedResource.defined_timings || [],
          max_duration: updatedResource.max_duration || 120,
          min_duration: updatedResource.min_duration || 30,
          duration_interval: updatedResource.duration_interval || 15,
          start_date: updatedResource.start_date || new Date().toISOString().split('T')[0],
          email_confirmation: updatedResource.metadata?.email_confirmation || false
        };
        
        setCurrentResource(transformedResource);
        console.log('Updated current resource:', transformedResource);
        
        // Also update the parent component's resource list
        if (onUpdate) {
          console.log('Calling parent onUpdate to refresh resource list');
          await onUpdate();
        }
      }
    } catch (err) {
      console.error('Error refreshing resource data:', err);
    }
  };


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
              <div className="flex items-center justify-between">
                <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">{currentResource.name}</h1>
              <p className="text-sm text-gray-500">{currentResource.location}</p>
                </div>
              </div>
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
                {activeTab === 'details' && <DetailsTab resource={currentResource} onUpdate={refreshResourceData} />}
                {activeTab === 'features' && <FeaturesTab resource={currentResource} onUpdate={refreshResourceData} />}
                {activeTab === 'limitations' && <LimitationsTab resource={currentResource} onUpdate={refreshResourceData} />}
                {activeTab === 'rates' && <RatesTab resource={currentResource} onUpdate={refreshResourceData} />}
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
      resource_name: resource.name || '',
      category: resource.category || '',
      resource_details: resource.details?.resourceDetails || '',
      email_confirmation: false,
      photo_url: resource.image || null
    });
  
    const [isSaving, setIsSaving] = useState(false);
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const editorRef = useRef(null);
    const mutationObserverRef = useRef(null);
  
    // Simple LTR enforcement on mount
    useEffect(() => {
      if (editorRef.current) {
        // Initial LTR enforcement only
        editorRef.current.setAttribute('dir', 'ltr');
        editorRef.current.style.direction = 'ltr';
        editorRef.current.style.textAlign = 'left';
      }
    }, []);
  
    const handleLinkClick = () => {
      setShowLinkDialog(true);
      setLinkUrl('');
    };
  
    const handleLinkSubmit = () => {
      if (linkUrl.trim()) {
        // Ensure we have a proper URL
        let url = linkUrl.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        // Create the link
        document.execCommand('createLink', false, url);
        
        // Force LTR direction after creating link
        setTimeout(() => {
          ensureLTRDirection();
        }, 100);
      }
      setShowLinkDialog(false);
      setLinkUrl('');
    };
  
    const handleUndo = () => {
      document.execCommand('undo');
    };
  
    const handleRedo = () => {
      document.execCommand('redo');
    };
  
    const ensureLTRDirection = () => {
      if (editorRef.current) {
        // Simple LTR enforcement - only on the editor itself
        editorRef.current.setAttribute('dir', 'ltr');
        editorRef.current.style.direction = 'ltr';
        editorRef.current.style.textAlign = 'left';
      }
    };
  
    const handleSave = async () => {
      try {
        setIsSaving(true);
        
        // Prepare resource data with ALL data in metadata only
        const resourceData = {
          name: formData.resource_name,
          metadata: {
            capacity: resource.limitations?.capacity || 10,
            category: formData.category,
            photo_url: formData.photo_url,
            location_id: "hk_hong_kong_001", // Default Hong Kong location
            resource_details: {
              description: formData.resource_details,
              features: resource.details?.features || {},
              amenities: resource.details?.amenities || {},
              security: resource.details?.security || {}
            },
            email_confirmation: formData.email_confirmation,
            rates: resource.rates || [],
            defined_timings: resource.defined_timings || [
              { weekday: "monday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "tuesday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "wednesday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "thursday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "friday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "saturday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "sunday", start_time: "09:00:00", end_time: "18:00:00" }
            ]
          }
        };
        
        let response;
        if (resource.id) {
          // Update existing resource using PUT API
          console.log('DetailsTab: Updating existing resource with ID:', resource.id);
          console.log('DetailsTab: Update data:', resourceData);
          response = await apiRequest(`/updateResource/${resource.id}`, 'PUT', resourceData);
          console.log('DetailsTab: Update response:', response);
        } else {
          // Create new resource
          console.log('DetailsTab: Creating new resource');
          console.log('DetailsTab: Create data:', resourceData);
          response = await apiRequest('/createResource', 'POST', resourceData);
          console.log('DetailsTab: Create response:', response);
        }
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = 'Resource updated successfully!';
        document.body.appendChild(successMessage);
        
        // Remove message after 3 seconds
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
          }
        }, 3000);
        
        // Refresh the resource list to show updated data
        if (onUpdate) {
          console.log('DetailsTab: Calling onUpdate to refresh data');
          await onUpdate();
        } else {
          console.log('DetailsTab: No onUpdate function provided');
        }
      } catch (err) {
        console.error('DetailsTab: Save error:', err);
        alert('Failed to update resource: ' + err.message);
      } finally {
        setIsSaving(false);
      }
    };
  
    const handleDiscard = () => {
      setFormData({
        resource_name: resource.name || '',
        category: resource.category || '',
        resource_details: resource.details?.resourceDetails || '',
        email_confirmation: false,
        photo_url: resource.image || null
      });
    };
  
    return (
      <div className="space-y-6">
        <style dangerouslySetInnerHTML={{
          __html: `
            [contenteditable]:empty:before {
              content: attr(data-placeholder);
              color: #9ca3af;
              pointer-events: none;
            }
            [contenteditable] {
              direction: ltr !important;
              text-align: left !important;
            }
            [contenteditable] p {
              margin: 0;
              direction: ltr !important;
              text-align: left !important;
            }
            [contenteditable] ul, [contenteditable] ol {
              margin: 0.5rem 0;
              padding-left: 1.5rem;
              direction: ltr !important;
            }
            [contenteditable] a {
              color: #3b82f6;
              text-decoration: underline;
            }
          `
        }} />
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
              <option value="co_working_space">Co-Working Space</option>
              <option value="event_hall">Event Hall</option>
              <option value="office_space">Office Space</option>
              <option value="training_room">Training Room</option>
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
  
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resource details</label>
            <div className="border border-gray-300 rounded-lg">
              {/* Toolbar */}
              <div className="flex items-center gap-1 p-2 border-b border-gray-300 bg-gray-50">
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded" 
                  title="Bold"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand('bold');
                    editorRef.current?.focus();
                  }}
                >
                  <strong className="text-sm">B</strong>
                </button>
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded italic" 
                  title="Italic"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand('italic');
                    editorRef.current?.focus();
                  }}
                >
                  <span className="text-sm">i</span>
                </button>
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded underline" 
                  title="Underline"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand('underline');
                    editorRef.current?.focus();
                  }}
                >
                  <span className="text-sm">U</span>
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded text-sm" 
                  title="Align left"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand('justifyLeft');
                    editorRef.current?.focus();
                  }}
                >
                  ☰
                </button>
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded text-sm" 
                  title="Align center"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand('justifyCenter');
                    editorRef.current?.focus();
                  }}
                >
                  ≡
                </button>
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded text-sm" 
                  title="Align right"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand('justifyRight');
                    editorRef.current?.focus();
                  }}
                >
                  ☰
                </button>
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded text-sm" 
                  title="Bullet list"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand('insertUnorderedList');
                    editorRef.current?.focus();
                  }}
                >
                  •
                </button>
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded text-sm" 
                  title="Numbered list"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand('insertOrderedList');
                    editorRef.current?.focus();
                  }}
                >
                  1.
                </button>
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded text-sm" 
                  title="Link"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleLinkClick}
                >
                  🔗
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded text-sm" 
                  title="Undo"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleUndo}
                >
                  ↶
                </button>
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded text-sm" 
                  title="Redo"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleRedo}
                >
                  ↷
                </button>
              </div>
              {/* Editor content */}
              <div
                ref={editorRef}
                contentEditable
                dangerouslySetInnerHTML={{ 
                  __html: formData.resource_details || '<p><br></p>' 
                }}
                onInput={(e) => {
                  const content = e.target.innerHTML;
                  setFormData({ ...formData, resource_details: content });
                }}
                onFocus={(e) => {
                  if (e.target.innerHTML === '<p><br></p>' || e.target.innerHTML === '') {
                    e.target.innerHTML = '';
                  }
                }}
                onBlur={(e) => {
                  if (e.target.innerHTML === '' || e.target.innerHTML === '<br>') {
                    e.target.innerHTML = '<p><br></p>';
                  }
                }}
                className="w-full p-3 min-h-[100px] focus:outline-none border-0 resize-none"
                style={{ 
                  minHeight: '100px',
                  lineHeight: '1.5',
                  direction: 'ltr',
                  textAlign: 'left',
                  unicodeBidi: 'bidi-override'
                }}
                data-placeholder="Enter resource details..."
                dir="ltr"
                spellCheck="false"
              />
            </div>
          </div>
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
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  try {
                    console.log('DetailsTab: Uploading image:', file);
                    // Upload the image and get the URL
                    const result = await imageApi.uploadImage(file);
                    console.log('DetailsTab: Upload result:', result);
                    const imageUrl = result.url || result.imageUrl || result.image_url;
                    console.log('DetailsTab: Extracted image URL:', imageUrl);
                    if (imageUrl) {
                      setFormData({ ...formData, photo_url: imageUrl });
                      console.log('DetailsTab: Updated form data with photo_url:', imageUrl);
                    } else {
                      console.error('DetailsTab: Failed to get image URL from upload response');
                    }
                  } catch (err) {
                    console.error('DetailsTab: Image upload failed:', err);
                    alert('Failed to upload image: ' + err.message);
                  }
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
            />
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
        
        {/* Link Dialog Modal */}
        {showLinkDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Link</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLinkSubmit();
                      } else if (e.key === 'Escape') {
                        setShowLinkDialog(false);
                        setLinkUrl('');
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowLinkDialog(false);
                      setLinkUrl('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLinkSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Add Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

function FeaturesTab({ resource, onUpdate }) {
  // Debug logging to see what data we're receiving
  console.log('FeaturesTab: Resource data received:', resource);
  console.log('FeaturesTab: Resource details:', resource.details);
  console.log('FeaturesTab: Features data:', resource.details?.features);
  console.log('FeaturesTab: Amenities data:', resource.details?.amenities);
  console.log('FeaturesTab: Security data:', resource.details?.security);

  // State for dynamic features management
  const [features, setFeatures] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [security, setSecurity] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  // Initialize data from resource
  useEffect(() => {
    console.log('FeaturesTab: Resource prop changed, updating features state');
    console.log('FeaturesTab: Full resource object:', resource);
    console.log('FeaturesTab: Resource details:', resource.details);
    console.log('FeaturesTab: Features from resource:', resource.details?.features);
    console.log('FeaturesTab: Features type:', typeof resource.details?.features);
    console.log('FeaturesTab: Features is array:', Array.isArray(resource.details?.features));
    console.log('FeaturesTab: Amenities from resource:', resource.details?.amenities);
    console.log('FeaturesTab: Security from resource:', resource.details?.security);
    
    // Convert object to array format for dynamic management
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

    console.log('FeaturesTab: Converted features array:', featuresArray);
    console.log('FeaturesTab: Converted amenities array:', amenitiesArray);
    console.log('FeaturesTab: Converted security array:', securityArray);

    setFeatures(featuresArray);
    setAmenities(amenitiesArray);
    setSecurity(securityArray);
  }, [resource.details?.features, resource.details?.amenities, resource.details?.security]);

  // Handle toggling individual items
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

  // Handle adding new item
  const handleAddItem = (category) => {
    setEditingCategory(category);
    setEditingItem(null);
    setNewItemName('');
    setNewItemDescription('');
    setShowAddModal(true);
  };

  // Handle editing existing item
  const handleEditItem = (category, item) => {
    setEditingCategory(category);
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemDescription(item.description || '');
    setShowAddModal(true);
  };

  // Handle saving new/edited item
  const handleSaveItem = () => {
    if (!newItemName.trim()) return;

    const newItem = {
      id: editingItem ? editingItem.id : newItemName.toLowerCase().replace(/\s+/g, '_'),
      name: newItemName.trim(),
      enabled: editingItem ? editingItem.enabled : false,
      description: newItemDescription.trim() || getDescriptiveText(editingCategory, {
        id: editingItem ? editingItem.id : newItemName.toLowerCase().replace(/\s+/g, '_'),
        name: newItemName.trim()
      })
    };

    if (editingCategory === 'features') {
      if (editingItem) {
        setFeatures(prev => prev.map(item => item.id === editingItem.id ? newItem : item));
      } else {
        setFeatures(prev => [...prev, newItem]);
      }
    } else if (editingCategory === 'amenities') {
      if (editingItem) {
        setAmenities(prev => prev.map(item => item.id === editingItem.id ? newItem : item));
      } else {
        setAmenities(prev => [...prev, newItem]);
      }
    } else if (editingCategory === 'security') {
      if (editingItem) {
        setSecurity(prev => prev.map(item => item.id === editingItem.id ? newItem : item));
      } else {
        setSecurity(prev => [...prev, newItem]);
      }
    }

    setShowAddModal(false);
    setEditingItem(null);
    setEditingCategory('');
    setNewItemName('');
    setNewItemDescription('');
  };

  // Handle deleting item
  const handleDeleteItem = (category, itemId) => {
    if (category === 'features') {
      setFeatures(prev => prev.filter(item => item.id !== itemId));
    } else if (category === 'amenities') {
      setAmenities(prev => prev.filter(item => item.id !== itemId));
    } else if (category === 'security') {
      setSecurity(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      console.log('Saving features:', features);
      console.log('Saving amenities:', amenities);
      console.log('Saving security:', security);
      
      // Convert array format back to object format for API
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

      console.log('Converted features data for API:', featuresData);
      console.log('Converted amenities data for API:', amenitiesData);
      console.log('Converted security data for API:', securityData);

      const resourceData = {
        name: resource.name,
        metadata: {
          capacity: resource.limitations?.capacity || 10,
          category: resource.category || 'meeting_room',
          photo_url: resource.image || null,
          location_id: "hk_hong_kong_001",
          resource_details: {
            description: resource.details?.resourceDetails || '',
            features: featuresData,
            amenities: amenitiesData,
            security: securityData
          },
          email_confirmation: resource.details?.emailConfirmation || false,
          rates: resource.rates || [],
          defined_timings: resource.defined_timings || [
            { weekday: "monday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "tuesday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "wednesday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "thursday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "friday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "saturday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "sunday", start_time: "09:00:00", end_time: "18:00:00" }
          ]
        }
      };
      
      console.log('Sending resource data:', resourceData);

      const response = await apiRequest(`/updateResource/${resource.id}`, 'PUT', resourceData);
      
      if (response.message === 'Resource updated successfully') {
        console.log('Features updated successfully');
        onUpdate(); // Refresh the resource data
      } else {
        console.error('Failed to update features:', response.message);
      }
    } catch (error) {
      console.error('Error updating features:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to get descriptive text for each item
  const getDescriptiveText = (category, item) => {
    // If item has a custom description, use it
    if (item.description) {
      return item.description;
    }
    
    const descriptions = {
      features: {
        standing: "This resource provides a <strong>standing desk.</strong>",
        soundproof: "This resource is a <strong>soundproof room.</strong>",
        quiet: "This resource is in a <strong>quiet zone.</strong>",
        air_conditioning: "This resource has <strong>air conditioning.</strong>",
        whiteboard: "This resource includes a <strong>whiteboard.</strong>",
        coffee_machine: "This resource provides a <strong>coffee machine.</strong>"
      },
      amenities: {
        internet: "This resource provides access to the <strong>internet.</strong>",
        projector: "This resource includes a <strong>projector.</strong>",
        desktop: "This resource has a <strong>desktop monitor.</strong>",
        printer: "This resource includes a <strong>printer.</strong>",
        scanner: "This resource provides a <strong>scanner.</strong>",
        phone: "This resource has a <strong>phone.</strong>"
      },
      security: {
        locked: "This resource can be <strong>locked securely.</strong>",
        cctv: "This resource is recorded using <strong>CCTV</strong>",
        voiceRecorder: "This resource provides a <strong>voice recorder.</strong>",
        access_control: "This resource has <strong>access control.</strong>",
        alarm_system: "This resource includes an <strong>alarm system.</strong>",
        security_guard: "This resource has <strong>security guard</strong> monitoring."
      }
    };
    
    return descriptions[category]?.[item.id] || `This resource has <strong>${item.name.toLowerCase()}.</strong>`;
  };

  // Component to render a category section with old design
  const CategorySection = ({ title, items, category, onToggle, onAdd, onEdit, onDelete }) => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={() => onAdd(category)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Add new item"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {items.length === 0 ? (
          <div className="col-span-3 text-center py-8">
            <p className="text-gray-500 text-sm italic">No {title.toLowerCase()} added yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="relative group">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={item.enabled}
                  onChange={(e) => onToggle(category, item.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600" 
                />
                <span 
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: getDescriptiveText(category, item) }}
                />
              </label>
              
              {/* Edit and Delete buttons - only show on hover */}
              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1">
                  <button
                    onClick={() => onEdit(category, item)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit item"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(category, item.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete item"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Features Section */}
      <CategorySection
        title="Features"
        items={features}
        category="features"
        onToggle={handleItemToggle}
        onAdd={handleAddItem}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
      />

      {/* Amenities Section */}
      <CategorySection
        title="Amenities"
        items={amenities}
        category="amenities"
        onToggle={handleItemToggle}
        onAdd={handleAddItem}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
      />

      {/* Security Section */}
      <CategorySection
        title="Security"
        items={security}
        category="security"
        onToggle={handleItemToggle}
        onAdd={handleAddItem}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
      />

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit' : 'Add'} {editingCategory.charAt(0).toUpperCase() + editingCategory.slice(1)} Item
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter item name (e.g., Air Conditioning)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descriptive Text
                </label>
                <textarea
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter descriptive text (e.g., This resource has air conditioning.)"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use &lt;strong&gt; tags around important words for bold formatting
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingItem ? 'Update' : 'Add'} Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function LimitationsTab({ resource, onUpdate }) {
    const [expandedSections, setExpandedSections] = useState({
      availableTimes: false,
      capacity: false,
      duration: false,
      customerTeams: false
    });

    // Original grid-based availability system
    const [availabilityGrid, setAvailabilityGrid] = useState(() => {
      // Initialize with default times or from resource data
      const grid = Array.from({ length: 24 }, () => Array(7).fill(false));
      
      // If resource has defined_timings, populate the grid
      if (resource.defined_timings && resource.defined_timings.length > 0) {
        resource.defined_timings.forEach(timing => {
          const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(timing.weekday);
          if (dayIndex !== -1) {
            const startHour = parseInt(timing.start_time.split(':')[0]);
            const endHour = parseInt(timing.end_time.split(':')[0]);
            for (let h = startHour; h < endHour; h++) {
              grid[h][dayIndex] = true;
            }
          }
        });
      } else {
        // Default to 9-18 for Monday to Friday
      for (let d = 0; d < 5; d++) {
        for (let h = 9; h <= 18; h++) {
          grid[h][d] = true;
        }
      }
      }
      
      return grid;
    });

    // Schedule Management API Integration
    const [scheduleData, setScheduleData] = useState({});
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [scheduleError, setScheduleError] = useState(null);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Load schedule data using Schedule Management APIs
    useEffect(() => {
      const loadScheduleData = async () => {
        try {
          setScheduleLoading(true);
          setScheduleError(null);
          
          // Get schedule blocks using the API endpoint
          let scheduleBlocksResponse;
          try {
            scheduleBlocksResponse = await apiRequest(`/getAllResourceScheduleBlocks/${encodeURIComponent(resource.name)}`, 'GET');
          } catch (scheduleError) {
            console.log('Failed to load schedule blocks, falling back to resource data:', scheduleError);
            scheduleBlocksResponse = null;
          }
          
          const scheduleData = {};
          const newGrid = Array.from({ length: 24 }, () => Array(7).fill(false));
          
          // Process schedule blocks from API response
          if (scheduleBlocksResponse && scheduleBlocksResponse.schedule_blocks_by_weekday) {
            const scheduleBlocksByWeekday = scheduleBlocksResponse.schedule_blocks_by_weekday;
            
            // Process each weekday's schedule block
            weekdays.forEach(weekday => {
              const block = scheduleBlocksByWeekday[weekday];
              if (block && block.start_time && block.end_time) {
                scheduleData[weekday] = {
                  start_time: block.start_time,
                  end_time: block.end_time,
                  id: block.id
                };
                
                const dayIndex = weekdays.indexOf(weekday);
                const startHour = parseInt(block.start_time.split(':')[0]);
                const endHour = parseInt(block.end_time.split(':')[0]);
                
                // Mark hours as available in the grid
                for (let h = startHour; h < endHour; h++) {
                  newGrid[h][dayIndex] = true;
                }
              }
            });
            
            setScheduleData(scheduleData);
            setAvailabilityGrid(newGrid);
          } else {
            // Fallback: Get resource data using the Resource Management API
            let response;
            try {
              response = await apiRequest(`/viewResource/${encodeURIComponent(resource.name)}`, 'GET');
              console.log('Resource data loaded:', response);
            } catch (resourceError) {
              console.error('Failed to load resource data:', resourceError);
              throw resourceError;
            }
            
            // Load schedule from defined_timings in resource data
            const resourceData = response.data && response.data[0] ? response.data[0] : response;
            console.log('Loading schedule from defined_timings:', resourceData.defined_timings);
            
            if (resourceData.defined_timings && resourceData.defined_timings.length > 0) {
              resourceData.defined_timings.forEach(timing => {
                const dayIndex = weekdays.indexOf(timing.weekday);
                if (dayIndex !== -1) {
                  scheduleData[timing.weekday] = {
                    start_time: timing.start_time,
                    end_time: timing.end_time
                  };
                  
                  const startHour = parseInt(timing.start_time.split(':')[0]);
                  const endHour = parseInt(timing.end_time.split(':')[0]);
                  for (let h = startHour; h < endHour; h++) {
                    newGrid[h][dayIndex] = true;
                  }
                  console.log(`Loaded schedule from defined_timings for ${timing.weekday}: ${timing.start_time} - ${timing.end_time}`);
                }
              });
              
              setScheduleData(scheduleData);
              setAvailabilityGrid(newGrid);
              console.log('Updated availability grid from defined_timings:', newGrid);
            } else {
              console.log('No schedule data found, initializing with default');
              // Initialize with default schedule if no data
              const defaultSchedule = {};
              weekdays.forEach(day => {
                defaultSchedule[day] = { start_time: '09:00:00', end_time: '17:00:00' };
              });
              setScheduleData(defaultSchedule);
              
              // Also update the grid with default schedule
              const newGrid = Array.from({ length: 24 }, () => Array(7).fill(false));
              for (let d = 0; d < 5; d++) { // Monday to Friday
                for (let h = 9; h <= 17; h++) { // 9 AM to 5 PM
                  newGrid[h][d] = true;
                }
              }
              setAvailabilityGrid(newGrid);
            }
          }
        } catch (err) {
          console.error('Error loading schedule data:', err);
          setScheduleError('Failed to load schedule data');
          
          // Initialize with default schedule on error
          const defaultSchedule = {};
          weekdays.forEach(day => {
            defaultSchedule[day] = { start_time: '09:00:00', end_time: '17:00:00' };
          });
          setScheduleData(defaultSchedule);
          
          // Also update the grid with default schedule
          const newGrid = Array.from({ length: 24 }, () => Array(7).fill(false));
          for (let d = 0; d < 5; d++) { // Monday to Friday
            for (let h = 9; h <= 17; h++) { // 9 AM to 5 PM
              newGrid[h][d] = true;
            }
          }
          setAvailabilityGrid(newGrid);
        } finally {
          setScheduleLoading(false);
        }
      };

      loadScheduleData();
    }, [resource.name]);

    const [durationState, setDurationState] = useState({
      max_duration: resource.max_duration || 120,
      min_duration: resource.min_duration || 30,
      duration_interval: resource.duration_interval || 15
    });

    // Grid interaction state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
  
    // Grid interaction functions
    const toggleCell = (hourIndex, dayIndex) => {
      setAvailabilityGrid(prev => {
        const next = prev.map(row => row.slice());
        next[hourIndex][dayIndex] = !next[hourIndex][dayIndex];
        return next;
      });
    };

    const handleMouseDown = (hourIndex, dayIndex) => {
      setIsDragging(true);
      // Store the original state before toggling
      const originalState = availabilityGrid[hourIndex][dayIndex];
      setDragStart({ hour: hourIndex, day: dayIndex, originalState });
      toggleCell(hourIndex, dayIndex);
    };

    const handleMouseEnter = (hourIndex, dayIndex) => {
      if (isDragging && dragStart) {
        const startHour = Math.min(dragStart.hour, hourIndex);
        const endHour = Math.max(dragStart.hour, hourIndex);
        const startDay = Math.min(dragStart.day, dayIndex);
        const endDay = Math.max(dragStart.day, dayIndex);
        
        setAvailabilityGrid(prev => {
          const next = prev.map(row => row.slice());
          // Use the original state to determine if we're selecting or deselecting
          const targetValue = !dragStart.originalState;
          
          for (let h = startHour; h <= endHour; h++) {
            for (let d = startDay; d <= endDay; d++) {
              next[h][d] = targetValue;
            }
          }
          return next;
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
    };

    const applyPreset = (preset) => {
      setAvailabilityGrid(prev => {
        const next = Array.from({ length: 24 }, () => Array(7).fill(false));
        const setRange = (dayIdx, startHour, endHour) => {
          for (let h = startHour; h <= endHour; h++) next[h][dayIdx] = true;
        };
        if (preset === 'monfri') {
          for (let d = 0; d < 5; d++) setRange(d, 9, 18); // 09:00-18:00 Mon-Fri (inclusive)
        } else if (preset === 'everyday') {
          for (let d = 0; d < 7; d++) setRange(d, 9, 18);
        }
        return next;
      });
    };

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Convert grid to schedule data for API
    const convertGridToScheduleData = () => {
      const scheduleData = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      days.forEach((day, dayIndex) => {
        let startHour = null;
        let endHour = null;
        
        for (let hour = 0; hour < 24; hour++) {
          if (availabilityGrid[hour][dayIndex] && startHour === null) {
            startHour = hour;
          } else if (!availabilityGrid[hour][dayIndex] && startHour !== null && endHour === null) {
            endHour = hour;
            break;
          }
        }
        
        if (startHour !== null) {
          if (endHour === null) {
            endHour = 24; // If it goes to the end of the day
          }
          
          scheduleData[day] = {
            start_time: `${startHour.toString().padStart(2, '0')}:00:00`,
            end_time: `${endHour.toString().padStart(2, '0')}:00:00`
          };
        } else {
          // No availability for this day
          scheduleData[day] = {
            start_time: '',
            end_time: ''
          };
        }
      });
      
      return scheduleData;
    };

    // Save schedule using Schedule Management APIs
    const handleSaveSchedule = async () => {
      try {
        setIsSavingSchedule(true);
        setScheduleError(null);

        // Convert grid to schedule data
        const scheduleData = convertGridToScheduleData();
        console.log('Converted schedule data:', scheduleData);

        // Update each weekday's schedule block using the new API endpoint
        const updatePromises = [];
        
        weekdays.forEach((weekday) => {
          const daySchedule = scheduleData[weekday];
          if (daySchedule && daySchedule.start_time && daySchedule.end_time) {
            const updateData = {
              start_time: daySchedule.start_time,
              end_time: daySchedule.end_time
            };
            
            console.log(`Updating schedule block for ${weekday}:`, updateData);
            
            const updatePromise = apiRequest(
              `/updateScheduleBlock/${encodeURIComponent(resource.name)}/${weekday}`, 
              'PATCH', 
              updateData
            ).then(response => {
              console.log(`Schedule block updated for ${weekday}:`, response);
              return response;
            }).catch(error => {
              console.error(`Failed to update schedule block for ${weekday}:`, error);
              throw error;
            });
            
            updatePromises.push(updatePromise);
          }
        });

        // Wait for all schedule block updates to complete
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          console.log('All schedule blocks updated successfully');
        }

        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = 'Schedule updated successfully!';
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
          }
        }, 3000);

        // Refresh the schedule data
        if (onUpdate) {
          console.log('ScheduleTab: Calling onUpdate to refresh data');
          await onUpdate();
        }

      } catch (err) {
        console.error('Error saving schedule:', err);
        setScheduleError('Failed to save schedule: ' + err.message);
      } finally {
        setIsSavingSchedule(false);
      }
    };


    const handleSaveLimitations = async () => {
      try {
        // Prepare resource data with ALL data in metadata only
        const resourceData = {
          name: resource.name,
          metadata: {
            capacity: resource.limitations?.capacity || 10,
            category: resource.category,
            photo_url: resource.image,
            location_id: "hk_hong_kong_001", // Default Hong Kong location
            resource_details: {
              description: resource.details?.resourceDetails || '',
              features: resource.details?.features || {},
              amenities: resource.details?.amenities || {},
              security: resource.details?.security || {}
            },
            email_confirmation: resource.email_confirmation || false,
            rates: resource.rates || [],
            defined_timings: resource.defined_timings || [
              { weekday: "monday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "tuesday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "wednesday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "thursday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "friday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "saturday", start_time: "09:00:00", end_time: "18:00:00" },
              { weekday: "sunday", start_time: "09:00:00", end_time: "18:00:00" }
            ]
          }
        };
        
        let response;
        if (resource.id) {
          // Update existing resource using PUT API
          console.log('LimitationsTab: Updating existing resource with ID:', resource.id);
          console.log('LimitationsTab: Update data:', resourceData);
          response = await apiRequest(`/updateResource/${resource.id}`, 'PUT', resourceData);
          console.log('LimitationsTab: Update response:', response);
        } else {
          // Create new resource
          console.log('LimitationsTab: Creating new resource');
          response = await apiRequest('/createResource', 'POST', resourceData);
          console.log('LimitationsTab: Create response:', response);
        }
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = 'Limitations updated successfully!';
        document.body.appendChild(successMessage);
        
        // Remove message after 3 seconds
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
          }
        }, 3000);
        
        // Refresh the resource data
        if (onUpdate) {
          console.log('LimitationsTab: Calling onUpdate to refresh data');
          await onUpdate();
        }
      } catch (err) {
        console.error('LimitationsTab: Save error:', err);
        alert('Failed to update limitations: ' + err.message);
      }
    };

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
              <p className="text-sm text-gray-500">Set the times of the day and days of the week when this resource is available.</p>
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
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => applyPreset('monfri')} className="px-3 py-1.5 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50">Mon–Fri</button>
                <button onClick={() => applyPreset('everyday')} className="px-3 py-1.5 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50">Every day</button>
                
                <button
                  onClick={handleSaveSchedule}
                  disabled={isSavingSchedule}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
                >
                  <Save className="w-4 h-4" />
                  {isSavingSchedule ? 'Saving...' : 'Save Schedule'}
                </button>
                </div>

              {scheduleError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                    <p className="text-sm text-red-700">{scheduleError}</p>
                  </div>
                </div>
              )}
                
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-md bg-white">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-14 px-2 py-2 text-xs font-medium text-gray-600 text-left">Time</th>
                      {days.map((d) => (
                        <th key={d} className="px-2 py-2 text-xs font-medium text-gray-600 text-center">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {hours.map((h, rowIdx) => (
                      <tr key={h} className="border-t border-gray-100">
                        <td className="px-2 py-1 text-xs text-gray-500">{h}:00</td>
                        {days.map((_, colIdx) => {
                          const active = availabilityGrid[rowIdx][colIdx];
                          return (
                            <td key={`${rowIdx}-${colIdx}`} className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                                onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                                className={`w-20 h-10 rounded border transition-colors relative ${
                                  active 
                                    ? 'bg-blue-500 border-blue-600 hover:bg-blue-600' 
                                    : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
                                }`}
                                aria-label={`Toggle ${days[colIdx]} ${h}:00`}
                              >
                                {(() => {
                                  // Check if this is the first selected cell in this column
                                  const isFirstInColumn = active && (rowIdx === 0 || !availabilityGrid[rowIdx - 1][colIdx]);
                                  if (isFirstInColumn) {
                                    // Find the last selected hour in this column
                                    let lastSelectedHour = rowIdx;
                                    for (let checkHour = rowIdx + 1; checkHour < 24; checkHour++) {
                                      if (availabilityGrid[checkHour][colIdx]) {
                                        lastSelectedHour = checkHour;
                                      } else {
                                        break;
                                      }
                                    }
                                    // Only show time range if there's more than one hour selected or if it's a single hour
                                    const startTime = `${rowIdx.toString().padStart(2, '0')}:00`;
                                    const endTime = `${lastSelectedHour.toString().padStart(2, '0')}:00`;
                                    return (
                                      <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium leading-tight">
                                        {startTime}-{endTime}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                  
              <div className="flex justify-end mt-4">
                <button 
                  onClick={handleSaveLimitations}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
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
              <p className="text-sm text-gray-500">Control how long or short bookings can be and the times they can start and end.</p>
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
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-900">Maximum duration (minutes)</div>
                        <input
                          type="number"
                    value={durationState.max_duration}
                    onChange={(e) => setDurationState(prev => ({ ...prev, max_duration: parseInt(e.target.value) || 120 }))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
        </div>
  
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-900">Minimum duration (minutes)</div>
                        <input
                          type="number"
                    value={durationState.min_duration}
                    onChange={(e) => setDurationState(prev => ({ ...prev, min_duration: parseInt(e.target.value) || 30 }))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                  </div>
                  
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-900">Duration interval (minutes)</div>
                        <input
                          type="number"
                    value={durationState.duration_interval}
                    onChange={(e) => setDurationState(prev => ({ ...prev, duration_interval: parseInt(e.target.value) || 15 }))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                        </div>
                
                <div className="flex justify-end">
                              <button
                    onClick={handleSaveLimitations}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Save
                              </button>
                </div>
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
                      value={resource.limitations?.capacity || 10}
                      onChange={(e) => {
                        // Update the resource capacity locally
                        const newCapacity = parseInt(e.target.value) || 10;
                        // Update the resource object in the parent component
                        // This will be saved when the user clicks Save
                        if (resource.limitations) {
                          resource.limitations.capacity = newCapacity;
                        } else {
                          resource.limitations = { capacity: newCapacity };
                        }
                        console.log('Updated capacity to:', newCapacity);
                      }}
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
                <button 
                  onClick={handleSaveLimitations}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
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

function RatesTab({ resource, onUpdate }) {
  const [rates, setRates] = useState(resource.rates || []);
  const [selectedRate, setSelectedRate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveRates = async () => {
    try {
      setIsSaving(true);
      
      // Prepare resource data with ALL data in metadata only
      const resourceData = {
        name: resource.name,
        metadata: {
          capacity: resource.limitations?.capacity || 10,
          category: resource.category,
          photo_url: resource.image,
          location_id: "hk_hong_kong_001", // Default Hong Kong location
          resource_details: {
            description: resource.details?.resourceDetails || '',
            features: resource.details?.features || {},
            amenities: resource.details?.amenities || {},
            security: resource.details?.security || {}
          },
          email_confirmation: resource.email_confirmation || false,
          rates: rates,
          defined_timings: resource.defined_timings || [
            { weekday: "monday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "tuesday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "wednesday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "thursday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "friday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "saturday", start_time: "09:00:00", end_time: "18:00:00" },
            { weekday: "sunday", start_time: "09:00:00", end_time: "18:00:00" }
          ]
        }
      };
      
      let response;
      if (resource.id) {
        // Update existing resource using PUT API
        console.log('RatesTab: Updating existing resource with ID:', resource.id);
        console.log('RatesTab: Update data:', resourceData);
        response = await apiRequest(`/updateResource/${resource.id}`, 'PUT', resourceData);
        console.log('RatesTab: Update response:', response);
      } else {
        // Create new resource
        console.log('RatesTab: Creating new resource');
        response = await apiRequest('/createResource', 'POST', resourceData);
        console.log('RatesTab: Create response:', response);
      }
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = 'Rates updated successfully!';
      document.body.appendChild(successMessage);
      
      // Remove message after 3 seconds
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.parentNode.removeChild(successMessage);
        }
      }, 3000);
      
      // Refresh the resource data
      if (onUpdate) {
        console.log('RatesTab: Calling onUpdate to refresh data');
        await onUpdate();
      }
    } catch (err) {
      console.error('RatesTab: Save error:', err);
      alert('Failed to update rates: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const addNewRate = () => {
    const newRate = {
      price_name: '',
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
            value={selectedRate.price_name}
            onChange={(e) => {
              const updatedRate = { ...selectedRate, price_name: e.target.value };
              const index = rates.findIndex(rate => rate === selectedRate);
              if (index !== -1) {
                updateRate(index, updatedRate);
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
              const index = rates.findIndex(rate => rate === selectedRate);
              if (index !== -1) {
                updateRate(index, updatedRate);
                setSelectedRate(updatedRate);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
          />
        </div>

        <div>
        <h3 className="font-semibold mb-2">Price</h3>
          <p className="text-sm text-gray-500 mb-4">Use this section to set the price to charge when resources of this type are booked.</p>
          
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={selectedRate.price}
              onChange={(e) => {
                const updatedRate = { ...selectedRate, price: parseFloat(e.target.value) || 0 };
                const index = rates.findIndex(rate => rate === selectedRate);
                if (index !== -1) {
                  updateRate(index, updatedRate);
                  setSelectedRate(updatedRate);
                }
              }}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
            <select 
              value={selectedRate.renewal_type}
              onChange={(e) => {
                const updatedRate = { ...selectedRate, renewal_type: e.target.value };
                const index = rates.findIndex(rate => rate === selectedRate);
                if (index !== -1) {
                  updateRate(index, updatedRate);
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

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button 
            onClick={() => setSelectedRate(null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Back to rates
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
                <td className="px-4 py-4 text-center">
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRate(index);
                    }}
                  >
                    ×
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
     
    </div>
    
  );
}