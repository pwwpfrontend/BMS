import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, SlidersHorizontal, Download, Menu, MapPin, Plus, Calendar, Clock, Save, X, Check, AlertCircle, Trash2, Edit, Eye, MoreVertical, Filter, Users, DollarSign, Upload, Link as LinkIcon, ChevronLeft, ChevronRight, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Undo, Redo } from 'lucide-react';
import imageApi from '../services/imageApi';

// Import the tab components
import DetailsTab from './DetailsTab';
import FeaturesTab from './FeaturesTab';
import LimitationsTab from './LimitationsTab';
import RatesTab from './RatesTab';

// Base URL for API calls
const BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

// API Request Function
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



// Delete Confirmation Modal
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
// 3-Step Add Resource Modal with Photo Upload
function AddResourceModal({ isOpen, onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    resource_name: '',
    category: 'meeting_room',
    capacity: 10,
    start_date: getTodayDate(),
    photo_url: '',
    description: '',
    defined_timings: [
      { weekday: 'monday', start_time: '09:00:00', end_time: '18:00:00', enabled: true },
      { weekday: 'tuesday', start_time: '09:00:00', end_time: '18:00:00', enabled: true },
      { weekday: 'wednesday', start_time: '09:00:00', end_time: '18:00:00', enabled: true },
      { weekday: 'thursday', start_time: '09:00:00', end_time: '18:00:00', enabled: true },
      { weekday: 'friday', start_time: '09:00:00', end_time: '18:00:00', enabled: true },
      { weekday: 'saturday', start_time: '09:00:00', end_time: '18:00:00', enabled: false },
      { weekday: 'sunday', start_time: '09:00:00', end_time: '18:00:00', enabled: false }
    ],
    max_duration: { value: 10, unit: 'hours' },
    min_duration: { value: 1, unit: 'hours' },
    duration_interval: { value: 15, unit: 'minutes' },
    email_confirmation: true,
    rates: [],
    resource_plans: []
  });

  const [availablePlans] = useState([
    { plan_name: 'Innobuddies' },
    { plan_name: 'InnoPeers' },
    { plan_name: 'Enterprise' },
    { plan_name: 'Standard' }
  ]);

  const categoryOptions = [
    { value: 'meeting_room', label: 'Meeting Room' },
    { value: 'conference_room', label: 'Conference Room' },
    { value: 'workspace', label: 'Workspace' },
    { value: 'desk', label: 'Desk' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'other', label: 'Other' }
  ];

  if (!isOpen) return null;

  const handleNext = () => {
    setError(null);
    
    if (currentStep === 1) {
      if (!formData.resource_name.trim()) {
        setError('Resource name is required');
        return;
      }
      if (!formData.category) {
        setError('Category is required');
        return;
      }
    }
    
    if (currentStep === 2) {
      const enabledTimings = formData.defined_timings.filter(t => t.enabled);
      if (enabledTimings.length === 0) {
        setError('Please enable at least one day');
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateTiming = (index, field, value) => {
    const newTimings = [...formData.defined_timings];
    newTimings[index] = { ...newTimings[index], [field]: value };
    setFormData(prev => ({ ...prev, defined_timings: newTimings }));
  };

  const addRate = () => {
    const newRate = {
      price_name: 'New Rate',
      description: '',
      price: 0,
      renewal_type: 'every hour'
    };
    setFormData(prev => ({
      ...prev,
      rates: [...prev.rates, newRate]
    }));
  };

  const updateRate = (index, field, value) => {
    const newRates = [...formData.rates];
    newRates[index] = { ...newRates[index], [field]: value };
    setFormData(prev => ({ ...prev, rates: newRates }));
  };

  const removeRate = (index) => {
    setFormData(prev => ({
      ...prev,
      rates: prev.rates.filter((_, i) => i !== index)
    }));
  };

  const togglePlan = (planName) => {
    const exists = formData.resource_plans.find(p => p.plan_name === planName);
    if (exists) {
      setFormData(prev => ({
        ...prev,
        resource_plans: prev.resource_plans.filter(p => p.plan_name !== planName)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        resource_plans: [...prev.resource_plans, { plan_name: planName }]
      }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploadingImage(true);
        setError(null);
        console.log('Uploading image:', file);
        const result = await imageApi.uploadImage(file);
        console.log('Upload result:', result);
        const imageUrl = result.url || result.imageUrl || result.image_url;
        console.log('Extracted image URL:', imageUrl);
        if (imageUrl) {
          updateFormData('photo_url', imageUrl);
          console.log('Updated form data with photo_url:', imageUrl);
        } else {
          setError('Failed to get image URL from upload response');
        }
      } catch (err) {
        console.error('Image upload failed:', err);
        setError('Failed to upload image: ' + err.message);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
  
      // Format the timings correctly - ensure HH:MM:SS format
      const enabledTimings = formData.defined_timings
        .filter(t => t.enabled)
        .map(({ enabled, ...rest }) => ({
          ...rest,
          start_time: rest.start_time.length === 5 ? `${rest.start_time}:00` : rest.start_time,
          end_time: rest.end_time.length === 5 ? `${rest.end_time}:00` : rest.end_time
        }));
  
      // Helper to convert hours/minutes to ISO 8601 duration strings
      const convertToISO = (value, unit) => {
        if (unit === 'hours') return `PT${value}H`;
        if (unit === 'minutes') return `PT${value}M`;
        if (unit === 'days') return `PT${value * 24}H`;
        return `PT${value}M`;
      };
  
      const requestBody = {
        defined_timings: enabledTimings,
        max_duration: convertToISO(formData.max_duration.value, formData.max_duration.unit),
        min_duration: convertToISO(formData.min_duration.value, formData.min_duration.unit),
        duration_interval: convertToISO(formData.duration_interval.value, formData.duration_interval.unit),
        resource_name: formData.resource_name,
        start_date: formData.start_date,
        photo_url: formData.photo_url || 'https://example.com/default-resource.jpg',
        capacity: parseInt(formData.capacity) || 10,
        resource_details: {
          description: formData.description || 'No description provided'
        },
        email_confirmation: formData.email_confirmation,
        resource_plans: formData.resource_plans,
        category: formData.category,
        location_id: 'g1PhBs8LucuZrpXXOVfwIdzXcFdpvwazyMupP9iH9e59ca39',
        rates: formData.rates.map(rate => ({
          price_name: rate.price_name,
          description: rate.description,
          price: parseInt(rate.price) || 0, 
          renewal_type: rate.renewal_type
        }))
      };
  
      console.log('Creating resource with data:', requestBody);
  
      const response = await apiRequest('/createResource', 'POST', requestBody);
      console.log('Resource created successfully:', response);
  
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-[#79C485] text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = 'Resource created successfully!';
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.parentNode.removeChild(successMessage);
        }
      }, 3000);

      // Reset form
      setFormData({
        resource_name: '',
        category: 'meeting_room',
        capacity: 10,
        start_date: getTodayDate(),
        photo_url: '',
        description: '',
        defined_timings: [
          { weekday: 'monday', start_time: '09:00:00', end_time: '18:00:00', enabled: true },
          { weekday: 'tuesday', start_time: '09:00:00', end_time: '18:00:00', enabled: true },
          { weekday: 'wednesday', start_time: '09:00:00', end_time: '18:00:00', enabled: true },
          { weekday: 'thursday', start_time: '09:00:00', end_time: '18:00:00', enabled: true },
          { weekday: 'friday', start_time: '09:00:00', end_time: '18:00:00', enabled: true },
          { weekday: 'saturday', start_time: '09:00:00', end_time: '18:00:00', enabled: false },
          { weekday: 'sunday', start_time: '09:00:00', end_time: '18:00:00', enabled: false }
        ],
        max_duration: { value: 10, unit: 'hours' },
        min_duration: { value: 1, unit: 'hours' },
        duration_interval: { value: 15, unit: 'minutes' },
        email_confirmation: true,
        rates: [],
        resource_plans: []
      });
  
      setCurrentStep(1);
      
      // Close modal and refresh
      onClose();
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error('Error creating resource:', err);
      setError(err.message || 'Failed to create resource');
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const handleClose = () => {
    setCurrentStep(1);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add New Resource</h2>
            <p className="text-sm text-gray-500 mt-1">Step {currentStep} of 3</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              Basic Info
            </span>
            <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              Availability
            </span>
            <span className={`text-sm font-medium ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              Pricing & Plans
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.resource_name}
                  onChange={(e) => updateFormData('resource_name', e.target.value)}
                  placeholder="e.g., Conference Room A"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => updateFormData('category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => updateFormData('capacity', e.target.value)}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available From
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => updateFormData('start_date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo Upload
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a photo for this resource (optional)
                </p>
                
                {uploadingImage && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Uploading image...</span>
                  </div>
                )}
                
                {formData.photo_url && !uploadingImage && (
                  <div className="mt-2">
                    <img 
                      src={formData.photo_url} 
                      alt="Preview" 
                      className="w-32 h-20 object-cover rounded border border-gray-300"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe the resource..."
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Operating Hours</h3>
                <div className="space-y-3">
                  {formData.defined_timings.map((timing, index) => (
                    <div key={timing.weekday} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        checked={timing.enabled}
                        onChange={(e) => updateTiming(index, 'enabled', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="w-24 font-medium capitalize">{timing.weekday}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={timing.start_time}
                          onChange={(e) => updateTiming(index, 'start_time', e.target.value)}
                          disabled={!timing.enabled}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={timing.end_time}
                          onChange={(e) => updateTiming(index, 'end_time', e.target.value)}
                          disabled={!timing.enabled}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Duration Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Duration
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.max_duration.value}
                        onChange={(e) => updateFormData('max_duration', {
                          ...formData.max_duration,
                          value: parseInt(e.target.value) || 0
                        })}
                        min="1"
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={formData.max_duration.unit}
                        onChange={(e) => updateFormData('max_duration', {
                          ...formData.max_duration,
                          unit: e.target.value
                        })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Duration
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.min_duration.value}
                        onChange={(e) => updateFormData('min_duration', {
                          ...formData.min_duration,
                          value: parseInt(e.target.value) || 0
                        })}
                        min="1"
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={formData.min_duration.unit}
                        onChange={(e) => updateFormData('min_duration', {
                          ...formData.min_duration,
                          unit: e.target.value
                        })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration Interval (Booking Time Slots)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.duration_interval.value}
                        onChange={(e) => updateFormData('duration_interval', {
                          ...formData.duration_interval,
                          value: parseInt(e.target.value) || 0
                        })}
                        min="1"
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={formData.duration_interval.unit}
                        onChange={(e) => updateFormData('duration_interval', {
                          ...formData.duration_interval,
                          unit: e.target.value
                        })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Pricing Rates</h3>
                  <button
                    onClick={addRate}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Rate
                  </button>
                </div>

                {formData.rates.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No rates added yet</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add Rate" to create pricing</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.rates.map((rate, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Rate Name
                            </label>
                            <input
                              type="text"
                              value={rate.price_name}
                              onChange={(e) => updateRate(index, 'price_name', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Renewal Type
                            </label>
                            <select
                              value={rate.renewal_type}
                              onChange={(e) => updateRate(index, 'renewal_type', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="every hour">Every Hour</option>
                              <option value="every day">Every Day</option>
                              <option value="every week">Every Week</option>
                              <option value="every month">Every Month</option>
                              <option value="every use">Every Use</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={rate.description}
                            onChange={(e) => updateRate(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <label className="block text-xs font-medium text-gray-700">
                              Price
                            </label>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                value={rate.price}
                                onChange={(e) => updateRate(index, 'price', parseInt(e.target.value) || 0)}
                                min="0"
                                step="1"
                                className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => removeRate(index)}
                            className="text-red-600 hover:text-red-700 p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Plans</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select which plans can access this resource
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {availablePlans.map(plan => (
                    <label
                      key={plan.plan_name}
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.resource_plans.find(p => p.plan_name === plan.plan_name)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!formData.resource_plans.find(p => p.plan_name === plan.plan_name)}
                        onChange={() => togglePlan(plan.plan_name)}
                        className="w-4 h-4"
                      />
                      <span className="font-medium">{plan.plan_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.email_confirmation}
                    onChange={(e) => updateFormData('email_confirmation', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="font-medium">Email Confirmation</span>
                    <p className="text-sm text-gray-500">Send confirmation emails for bookings</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Resource
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ResourceDetail Component with all tabs
function ResourceDetail({ resource, onBack, onUpdate }) {
  const [activeTab, setActiveTab] = useState('details');
  const [currentResource, setCurrentResource] = useState(resource);

  useEffect(() => {
    if (resource && resource.id) {
      console.log('ResourceDetail: Component mounted or resource changed, refreshing data');
      refreshResourceData();
    }
  }, [resource.id]);

  const refreshResourceData = async () => {
    try {
      console.log('Refreshing resource data for:', currentResource.name);
      
      const response = await apiRequest('/viewAllresources', 'GET');
      const foundResource = response.data?.find(r => r.id === currentResource.id);
      
      if (foundResource) {
        console.log('Raw updated resource from API:', foundResource);
        
        const metadata = foundResource.metadata || {};
        const imageUrl = foundResource.metadata?.photo_url || null;
        
        const transformedResource = {
          id: foundResource.id,
          name: foundResource.name,
          location: 'CUHK InnoPort',
          image: imageUrl,
          type: 'Free of Charge - CUHK InnoPort',
          category: metadata.category || 'meeting_room',
          originalData: foundResource,
          details: {
            resourceDetails: metadata.resource_details?.description || '',
            features: metadata.resource_details?.features || {},
            amenities: metadata.resource_details?.amenities || {},
            security: metadata.resource_details?.security || {}
          },
          limitations: {
            capacity: metadata.capacity || 10,
            limitGuests: false,
            timeSlots: [],
            availableFor: 'All Customers',
            teams: [],
            restrictTeams: 'Members of any team'
          },
          rates: metadata.rates || [],
          defined_timings: foundResource.defined_timings || [],
          max_duration: foundResource.max_duration || 'PT10H',
          min_duration: foundResource.min_duration || 'PT1H',
          duration_interval: foundResource.duration_interval || 'PT15M',
          start_date: foundResource.start_date || new Date().toISOString().split('T')[0],
          email_confirmation: metadata.email_confirmation || false
        };
        
        setCurrentResource(transformedResource);
        console.log('Updated current resource:', transformedResource);
        
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
// Main Resources Component
export default function Resources() {
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedForBulk, setSelectedForBulk] = useState([]);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false); 
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteResourceInfo, setDeleteResourceInfo] = useState({ name: '', count: 0 }); 

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiRequest('/viewAllresources', 'GET');
      
      const transformedResources = response.data?.map(resource => {
        const metadata = resource.metadata || {};
        const imageUrl = resource.metadata?.photo_url || null;
        
        return {
          id: resource.id,
          name: resource.name,
          location: 'CUHK InnoPort',
          image: imageUrl,
          type: 'Free of Charge - CUHK InnoPort',
          category: metadata.category || 'meeting_room',
          originalData: resource,
          details: {
            resourceDetails: metadata.resource_details?.description || '',
            features: metadata.resource_details?.features || {},
            amenities: metadata.resource_details?.amenities || {},
            security: metadata.resource_details?.security || {}
          },
          limitations: {
            capacity: metadata.capacity || 10,
            limitGuests: false,
            timeSlots: [],
            availableFor: 'All Customers',
            teams: [],
            restrictTeams: 'Members of any team'
          },
          rates: metadata.rates || [],
          defined_timings: resource.defined_timings || [],
          max_duration: resource.max_duration || 'PT10H',
          min_duration: resource.min_duration || 'PT1H',
          duration_interval: resource.duration_interval || 'PT15M',
          start_date: resource.start_date || new Date().toISOString().split('T')[0],
          email_confirmation: metadata.email_confirmation || false
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
      
      for (const id of selectedForBulk) {
        console.log('Deleting resource with ID:', id);
        try {
          const response = await apiRequest(`/deleteResource/${id}`, 'DELETE');
          console.log('Delete response for', id, ':', response);
        } catch (deleteErr) {
          console.error('Failed to delete resource', id, ':', deleteErr);
        }
      }
      
      console.log('Delete process completed');
      
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
            )}
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