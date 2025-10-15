import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Building, Settings, User } from 'lucide-react';
import bookingAPI from '../services/bookingApi';

export default function AddBookingForm({ onClose, onBookingCreated }) {
  // Form state
  const [formData, setFormData] = useState({
    location_id: '', // Will be auto-set to Hong Kong
    resource_id: '',
    service_id: '',
    starts_at: '',
    ends_at: '',
    date: '',
    start_time: '09:00',
    end_time: '10:00',
    user_name: ''
  });
  
  // Options from API
  const [locations, setLocations] = useState([]);
  const [resources, setResources] = useState([]);
  const [services, setServices] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [hongKongLocation, setHongKongLocation] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  
  // Create new dialogs state
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [showCreateResource, setShowCreateResource] = useState(false);
  const [showCreateService, setShowCreateService] = useState(false);
  const [showScheduleInfo, setShowScheduleInfo] = useState(false);
  
  // Create new forms data
  const [newLocation, setNewLocation] = useState({ name: '', time_zone: 'Asia/Kolkata' });
  const [newResource, setNewResource] = useState({ name: '', max_simultaneous_bookings: 1 });
  const [newService, setNewService] = useState({ name: '', price: '', duration: 'PT1H' });
  
  // Create loading states
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoadingData(true);
        setError(''); // Clear any previous errors
        
        console.log('📋 Loading form data for Add Booking...');
        
        const [locationsRes, resourcesRes, servicesRes] = await Promise.all([
          bookingAPI.getLocations(),
          bookingAPI.getResources(),
          bookingAPI.getServices()
        ]);
        
        const locations = locationsRes.data || [];
        const resources = resourcesRes.data || [];
        const services = servicesRes.data || [];
        
        // Find Hong Kong location
        const hkLocation = locations.find(loc => 
          loc.name.toLowerCase().includes('hong kong') || 
          loc.time_zone === 'Asia/Hong_Kong' ||
          loc.name.toLowerCase().includes('hk')
        ) || locations[0]; // fallback to first location
        
        if (hkLocation) {
          setHongKongLocation(hkLocation);
          setFormData(prev => ({ ...prev, location_id: hkLocation.id }));
        }
        
        console.log(`✅ Form data loaded: Hong Kong location (${hkLocation?.name}), ${resources.length} resources, ${services.length} services`);
        
        setLocations(locations);
        setResources(resources);
        setServices(services);
        
      } catch (err) {
        const errorMessage = 'Failed to load form data. Please try again.';
        setError(errorMessage);
        console.error('❌ Error loading form data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadFormData();
  }, []);

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
  };

  // Format datetime for API (ISO 8601 with timezone)
  const formatDateTime = (date, time) => {
    if (!date || !time) return '';
    
    // Get timezone from selected location
    const selectedLocation = locations.find(loc => loc.id === formData.location_id);
    let timezone = '+05:30'; // Default fallback
    
    if (selectedLocation?.time_zone) {
      // Convert IANA timezone to offset
      const timezoneMap = {
        'Asia/Hong_Kong': '+08:00',
        'Asia/Kolkata': '+05:30',
        'Asia/Singapore': '+08:00',
        'America/New_York': '-05:00', // or -04:00 during DST
        'Europe/London': '+00:00', // or +01:00 during DST
      };
      timezone = timezoneMap[selectedLocation.time_zone] || '+05:30';
    }
    
    // Create proper ISO datetime string with timezone offset
    return `${date}T${time}:00${timezone}`;
  };

  // Validate form
  const validateForm = () => {
    if (!formData.user_name.trim()) return 'Please enter your name';
    if (!formData.location_id) return 'Please select a location';
    if (!formData.resource_id) return 'Please select a resource';
    if (!formData.service_id) return 'Please select a service';
    if (!formData.date) return 'Please select a date';
    if (!formData.start_time) return 'Please select start time';
    if (!formData.end_time) return 'Please select end time';
    
    // Validate time logic
    if (formData.start_time >= formData.end_time) {
      return 'End time must be after start time';
    }
    
    // Validate booking time is within reasonable hours (6 AM to 11 PM)
    const startHour = parseInt(formData.start_time.split(':')[0]);
    const endHour = parseInt(formData.end_time.split(':')[0]);
    
    if (startHour < 6 || endHour > 23) {
      return 'Please select a time between 6:00 AM and 11:00 PM';
    }
    
    if (startHour < 6 && endHour <= 6) {
      return 'Bookings before 6:00 AM are not available';
    }
    
    // Validate date is not in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return 'Cannot book in the past';
    }
    
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Format datetimes for API
      const starts_at = formatDateTime(formData.date, formData.start_time);
      const ends_at = formatDateTime(formData.date, formData.end_time);
      
      const bookingData = {
        location_id: formData.location_id,
        resource_id: formData.resource_id,
        service_id: formData.service_id,
        starts_at,
        ends_at,
        metadata: {
          user_name: formData.user_name.trim()
        }
      };
      
      console.log('Creating booking with data:', bookingData);
      
      // Check if user might be attempting to create a duplicate booking
      console.log('🔍 Checking for potential conflicts...');
      console.log(`📅 Booking details: ${formData.date} ${formData.start_time}-${formData.end_time}`);
      console.log(`🏭 Resource: ${resources.find(r => r.id === formData.resource_id)?.name}`);
      
      // Ensure service and resource are associated before creating booking
      try {
        await bookingAPI.associateServiceToResource(formData.service_id, formData.resource_id);
      } catch (associationError) {
        // Association might already exist or fail for other reasons
        console.warn('Association warning:', associationError);
      }
      
      // Step 1: Check existing schedules first
      console.log('🗺️ Checking existing schedules for resource...');
      console.log('🔍 Resource ID:', formData.resource_id);
      console.log('🔍 Location ID:', formData.location_id);
      console.log('🔍 Booking Date:', formData.date);
      console.log('🔍 Time:', formData.start_time, 'to', formData.end_time);
      
      let hasSchedule = false;
      try {
        const existingSchedules = await bookingAPI.getScheduleBlocks(formData.resource_id);
        const schedules = existingSchedules.data || [];
        const bookingDate = new Date(formData.date);
        
        // Check if there's a schedule for the booking date
        const dateSchedule = schedules.find(schedule => {
          const scheduleDate = new Date(schedule.starts_at);
          return scheduleDate.toDateString() === bookingDate.toDateString();
        });
        
        if (dateSchedule) {
          console.log('✅ Found existing schedule for booking date:', dateSchedule);
          hasSchedule = true;
        } else {
          console.log('⚠️ No schedule found for booking date, will create one');
        }
      } catch (scheduleCheckError) {
        console.log('ℹ️ Could not check existing schedules:', scheduleCheckError.message);
      }
      
      // Step 2: Create schedule block if needed
      if (!hasSchedule) {
        console.log('🗺️ Creating schedule block for booking date...');
        
        const timezone = '+08:00'; // Hong Kong timezone
        const bookingDate = formData.date;
        
        // Create schedule block that covers business hours (6 AM to 11 PM)
        const scheduleStart = `${bookingDate}T06:00:00${timezone}`;
        const scheduleEnd = `${bookingDate}T23:00:00${timezone}`;
        
        const scheduleBlockData = {
          location_id: formData.location_id,
          starts_at: scheduleStart,
          ends_at: scheduleEnd
        };
        
        console.log('📝 Creating schedule block:', scheduleBlockData);
        
        try {
          await bookingAPI.createScheduleBlock(formData.resource_id, scheduleBlockData);
          console.log('✅ Schedule block created successfully');
          hasSchedule = true;
        } catch (scheduleError) {
          console.error('❌ Schedule block creation error details:', scheduleError);
          if (scheduleError.message.includes('collides')) {
            console.log('✅ Schedule block collision - existing schedule found, perfect!');
            hasSchedule = true;
          } else {
            console.error('❌ Schedule block creation failed:', scheduleError.message);
            console.error('❌ Full error object:', scheduleError);
            // Continue anyway, might work with recurring schedule
          }
        }
      }
      
      // Step 3: Create recurring schedule if we still don't have a schedule
      if (!hasSchedule) {
        console.log('🔄 Creating recurring schedule as fallback...');
        
        const dayOfWeek = new Date(formData.date).getDay();
        const recurringScheduleData = {
          location_id: formData.location_id,
          day_of_week: dayOfWeek,
          starts_at_time: '06:00:00',
          ends_at_time: '23:00:00',
          is_active: true
        };
        
        console.log('🔄 Recurring schedule data:', recurringScheduleData);
        
        try {
          await bookingAPI.createRecurringSchedule(formData.resource_id, recurringScheduleData);
          console.log('✅ Recurring schedule created successfully');
          hasSchedule = true;
        } catch (recurringError) {
          console.error('❌ Recurring schedule error details:', recurringError);
          if (recurringError.message.includes('collides') || recurringError.message.includes('already exists')) {
            console.log('✅ Recurring schedule collision/exists - that\'s good!');
            hasSchedule = true;
          } else {
            console.error('❌ Recurring schedule creation failed:', recurringError.message);
            console.error('❌ Full recurring error object:', recurringError);
          }
        }
      }
      
      // Step 4: If still no schedule, try some alternative approaches
      if (!hasSchedule) {
        console.log('⚠️ No schedule found yet, trying alternative approaches...');
        
        // Try 1: Create a minimal schedule block
        try {
          console.log('🔄 Trying minimal schedule block...');
          const minimalScheduleData = {
            location_id: formData.location_id,
            starts_at: `${formData.date}T${formData.start_time}:00+08:00`,
            ends_at: `${formData.date}T${formData.end_time}:00+08:00`
          };
          
          await bookingAPI.createScheduleBlock(formData.resource_id, minimalScheduleData);
          console.log('✅ Minimal schedule block created!');
          hasSchedule = true;
        } catch (minimalError) {
          console.log('⚠️ Minimal schedule failed:', minimalError.message);
          
          // Try 2: Skip schedule creation and attempt booking directly
          console.log('🚀 Attempting direct booking without schedule creation...');
          try {
            const directResponse = await bookingAPI.createBooking(bookingData);
            console.log('✅ Direct booking succeeded!', directResponse);
            
            // If direct booking worked, complete the process
            localStorage.removeItem('bookings_cache_valid');
            localStorage.removeItem('bookings_cache');
            
            if (onBookingCreated) {
              onBookingCreated(directResponse);
            }
            
            onClose();
            return;
            
          } catch (directError) {
            console.error('❌ Direct booking also failed:', directError.message);
            console.error('❌ Full error details:', directError);
            
            // Show detailed error information
            throw new Error(`Unable to create booking or schedule. Error details: ${directError.message}. Please check the browser console for more details or try a different resource.`);
          }
        }
      }
      
      console.log('✅ Schedule confirmed available for booking');
      
      // Step 5: Wait a moment for schedules to be processed
      console.log('⏳ Waiting for schedule processing...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 6: Now try to create the booking
      console.log('🚀 Creating booking now...');
      
      let response;
      try {
        response = await bookingAPI.createBooking(bookingData);
        console.log('✅ Booking created successfully!');
      } catch (bookingError) {
        console.error('❌ Booking failed:', bookingError.message);
        
        // Check if this is a schedule collision error from earlier steps
        if (bookingError.message.includes('collides with one or more existing schedule blocks')) {
          // This error is actually from the schedule creation, but it means schedules exist!
          console.log('✅ Schedule collision detected - this means schedules exist!');
          console.log('🔄 Retrying booking since schedules are available...');
          
          // Try booking directly since schedules exist
          try {
            response = await bookingAPI.createBooking(bookingData);
            console.log('✅ Booking created after collision resolution!');
        } catch (retryError) {
            console.error('❌ Retry booking failed:', retryError.message);
            if (retryError.message.includes('does not match a valid bookable slot')) {
              throw new Error(`This time slot is not available. It may already be booked or the resource is not available at this time. Please select a different time.`);
            } else {
              throw new Error(`Booking failed: ${retryError.message}`);
            }
          }
        } else if (bookingError.message.includes('does not match a valid bookable slot')) {
          console.log('🔄 Trying with exact time slot...');
          
          const exactScheduleData = {
            location_id: formData.location_id,
            starts_at: starts_at,
            ends_at: ends_at
          };
          
          try {
            await bookingAPI.createScheduleBlock(formData.resource_id, exactScheduleData);
            console.log('✅ Exact schedule slot created');
          } catch (exactScheduleError) {
            if (exactScheduleError.message.includes('collides')) {
              console.log('✅ Exact schedule collision - slot exists, this is good!');
            } else {
              console.warn('⚠️ Exact schedule creation failed:', exactScheduleError.message);
            }
          }
          
          // Try booking one more time regardless of schedule creation result
          try {
            response = await bookingAPI.createBooking(bookingData);
            console.log('✅ Booking created on second attempt!');
          } catch (finalBookingError) {
            console.error('❌ Final booking attempt failed:', finalBookingError.message);
            
            // Provide specific error messages based on the failure
            if (finalBookingError.message.includes('does not match a valid bookable slot')) {
              throw new Error(`This time slot is not available. It may already be booked or outside the resource's available hours. Please select a different time.`);
            } else if (finalBookingError.message.includes('already exists') || finalBookingError.message.includes('conflict')) {
              throw new Error(`There is already a booking for this resource at this time. Please choose a different time or resource.`);
            } else {
              throw new Error(`Unable to create booking: ${finalBookingError.message}`);
            }
          }
        } else {
          throw bookingError;
        }
      }
      
      // Clear all cache to ensure fresh data load
      localStorage.removeItem('bookings_cache_valid');
      localStorage.removeItem('bookings_cache');
      
      // Notify parent component with the new booking
      if (onBookingCreated) {
        onBookingCreated(response);
      }
      
      // Show success message
      console.log('✅ Booking created successfully:', response);
      
      // Close form
      onClose();
      
    } catch (err) {
      console.error('Error creating booking:', err);
      
      // Check if this is a collision error that should be ignored
      if (err.message && err.message.includes('collides with one or more existing schedule blocks')) {
        console.log('✅ Collision error detected - schedules exist, trying direct booking...');
        
        // Try booking directly since schedules clearly exist
        try {
          setError('Schedules exist, attempting booking...');
          const response = await bookingAPI.createBooking(bookingData);
          console.log('✅ Direct booking successful after collision!');
          
          // Clear cache and complete booking
          localStorage.removeItem('bookings_cache_valid');
          localStorage.removeItem('bookings_cache');
          
          if (onBookingCreated) {
            onBookingCreated(response);
          }
          
          onClose();
          return; // Successfully completed
          
        } catch (directBookingError) {
          console.error('❌ Direct booking after collision failed:', directBookingError);
          
          // Provide user-friendly error messages
          if (directBookingError.message.includes('does not match a valid bookable slot')) {
            setError('This time slot is not available. It may already be booked by someone else. Please select a different time or check existing bookings.');
          } else if (directBookingError.message.includes('already exists') || directBookingError.message.includes('conflict')) {
            setError('There is already a booking for this resource at this time. Please choose a different time slot.');
          } else {
            setError(`Booking failed: ${directBookingError.message || 'Unable to create booking'}`);
          }
        }
      } else {
        setError(err.message || 'Failed to create booking. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate time options (15-minute intervals)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        times.push({ value: time, label: displayTime });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Helper function to check if two time ranges overlap
  const timeRangesOverlap = (start1, end1, start2, end2) => {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    return s1 < e2 && s2 < e1;
  };

  // Load available services for selected resource
  const loadAvailableServices = async (resourceId) => {
    if (!resourceId) {
      setAvailableServices(services);
      return;
    }

    try {
      // For now, show all services and auto-associate when booking is created
      // In the future, we can filter based on actual associations
      setAvailableServices(services);
    } catch (error) {
      console.error('Error loading available services:', error);
      setAvailableServices(services);
    }
  };

  // Handle resource change
  const handleResourceChange = (resourceId) => {
    handleChange('resource_id', resourceId);
    loadAvailableServices(resourceId);
    // Clear service selection when resource changes
    if (formData.service_id) {
      handleChange('service_id', '');
    }
  };

  // Update available services when services list changes
  useEffect(() => {
    loadAvailableServices(formData.resource_id);
  }, [services, formData.resource_id]);

  // Handle creating new location
  const handleCreateLocation = async () => {
    if (!newLocation.name.trim()) {
      setError('Location name is required');
      return;
    }

    try {
      setIsCreatingLocation(true);
      const response = await bookingAPI.createLocation(newLocation);
      
      // Add to locations list and select it
      setLocations(prev => [...prev, response]);
      setFormData(prev => ({ ...prev, location_id: response.id }));
      
      // Reset and close
      setNewLocation({ name: '', time_zone: 'Asia/Kolkata' });
      setShowCreateLocation(false);
      setError('');
      
    } catch (err) {
      setError('Failed to create location: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreatingLocation(false);
    }
  };

  // Handle creating new resource
  const handleCreateResource = async () => {
    if (!newResource.name.trim()) {
      setError('Resource name is required');
      return;
    }

    try {
      setIsCreatingResource(true);
      const response = await bookingAPI.createResource(newResource);
      
        // Create default schedule blocks for the new resource (next 7 days, 9 AM to 5 PM)
        try {
          const selectedLocation = locations.find(loc => loc.id === formData.location_id);
          const timezoneMap = {
            'Asia/Hong_Kong': '+08:00',
            'Asia/Kolkata': '+05:30',
            'Asia/Singapore': '+08:00',
          };
          const timezone = timezoneMap[selectedLocation?.time_zone] || '+05:30';
          
          // Create schedule blocks for the next 7 days
          const schedulePromises = [];
          for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Create schedule block with error handling for each day
            const createBlock = async () => {
              try {
                await bookingAPI.createScheduleBlock(response.id, {
                  location_id: formData.location_id,
                  starts_at: `${dateStr}T09:00:00${timezone}`,
                  ends_at: `${dateStr}T17:00:00${timezone}`
                });
              } catch (blockError) {
                if (!blockError.message.includes('collides')) {
                  console.warn(`Failed to create schedule block for ${dateStr}:`, blockError);
                }
              }
            };
            
            schedulePromises.push(createBlock());
          }
          
          // Wait for all schedule blocks to be created (or fail gracefully)
          await Promise.all(schedulePromises);
        } catch (scheduleError) {
          console.warn('Failed to create default schedule for resource:', scheduleError);
        }
      
      // Add to resources list and select it
      setResources(prev => [...prev, response]);
      setFormData(prev => ({ ...prev, resource_id: response.id }));
      
      // Load available services for the new resource
      loadAvailableServices(response.id);
      
      // Reset and close
      setNewResource({ name: '', max_simultaneous_bookings: 1 });
      setShowCreateResource(false);
      setError('');
      
    } catch (err) {
      setError('Failed to create resource: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreatingResource(false);
    }
  };

  // Handle creating new service
  const handleCreateService = async () => {
    if (!newService.name.trim() || !newService.price || !newService.duration) {
      setError('Service name, price, and duration are required');
      return;
    }

    try {
      setIsCreatingService(true);
      const serviceData = {
        ...newService,
        price: parseFloat(newService.price).toFixed(3)
      };
      
      const response = await bookingAPI.createService(serviceData);
      
      // If a resource is selected, associate the new service with it
      if (formData.resource_id) {
        try {
          await bookingAPI.associateServiceToResource(response.id, formData.resource_id);
        } catch (associationError) {
          console.warn('Failed to associate service with resource:', associationError);
          // Continue anyway - user can manually associate later
        }
      }
      
      // Add to services list and select it
      setServices(prev => [...prev, response]);
      setFormData(prev => ({ ...prev, service_id: response.id }));
      
      // Reset and close
      setNewService({ name: '', price: '', duration: 'PT1H' });
      setShowCreateService(false);
      setError('');
      
    } catch (err) {
      setError('Failed to create service: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreatingService(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading form data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
              Add New Booking
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close form"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            </div>
          )}

          {/* User Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              Your Name
            </label>
            <input
              type="text"
              value={formData.user_name}
              onChange={(e) => handleChange('user_name', e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontFamily: 'Inter' }}
              required
            />
          </div>

          {/* Location - Static Hong Kong */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600" style={{ fontFamily: 'Inter' }}>
              {hongKongLocation ? hongKongLocation.name : 'Hong Kong'}
            </div>
          </div>

          {/* Resource Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4" />
              Resource
            </label>
            <select
              value={formData.resource_id}
              onChange={(e) => {
                if (e.target.value === 'CREATE_NEW') {
                  setShowCreateResource(true);
                } else {
                  handleResourceChange(e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontFamily: 'Inter' }}
              required
            >
              <option value="">Select a resource</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} (Max: {resource.max_simultaneous_bookings})
                </option>
              ))}
              <option value="CREATE_NEW" className="font-medium text-blue-600">
                + Create New Resource
              </option>
            </select>
          </div>

          {/* Service Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Settings className="w-4 h-4" />
              Service
            </label>
            {formData.resource_id && (
              <div className="space-y-2 mb-2">
                <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  💡 Services will be automatically associated with the selected resource when booking is created
                </p>
                <p className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  📅 If the resource has no schedule, one will be created automatically (9 AM - 5 PM)
                </p>
              </div>
            )}
            <select
              value={formData.service_id}
              onChange={(e) => {
                if (e.target.value === 'CREATE_NEW') {
                  setShowCreateService(true);
                } else {
                  handleChange('service_id', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontFamily: 'Inter' }}
              required
            >
              <option value="">Select a service</option>
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - ${service.price}
                </option>
              ))}
              <option value="CREATE_NEW" className="font-medium text-blue-600">
                + Create New Service
              </option>
            </select>
          </div>

          {/* Date Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              Date
              {formData.location_id && (
                <span className="text-xs text-gray-500 ml-2">
                  ({locations.find(loc => loc.id === formData.location_id)?.time_zone || 'UTC'})
                </span>
              )}
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontFamily: 'Inter' }}
              required
            />
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4" />
                Start Time
              </label>
              <select
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: 'Inter' }}
                required
              >
                <option value="">Select start time</option>
                {timeOptions.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4" />
                End Time
              </label>
              <select
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: 'Inter' }}
                required
              >
                <option value="">Select end time</option>
                {timeOptions.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'Inter' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: '#184AC0', 
                fontFamily: 'Inter'
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </div>
              ) : (
                'Create Booking'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Create Location Dialog */}
      {showCreateLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Location</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateLocation(); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Zone
                </label>
                <input
                  type="text"
                  value={newLocation.time_zone}
                  onChange={(e) => setNewLocation({ ...newLocation, time_zone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Asia/Kolkata"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateLocation(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLocation || !newLocation.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingLocation ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Resource Dialog */}
      {showCreateResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Resource</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateResource(); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newResource.name}
                  onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <input
                  type="text"
                  value={newResource.type || ''}
                  onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Meeting Room, Equipment"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Simultaneous Bookings *
                </label>
                <input
                  type="number"
                  min="1"
                  value={newResource.max_simultaneous_bookings}
                  onChange={(e) => setNewResource({ ...newResource, max_simultaneous_bookings: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newResource.description || ''}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateResource(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingResource || !newResource.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingResource ? 'Creating...' : 'Create Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Service Dialog */}
      {showCreateService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Service</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateService(); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration *
                </label>
                <select
                  value={newService.duration}
                  onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="PT30M">30 minutes</option>
                  <option value="PT1H">1 hour</option>
                  <option value="PT1H30M">1.5 hours</option>
                  <option value="PT2H">2 hours</option>
                  <option value="PT3H">3 hours</option>
                  <option value="PT4H">4 hours</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newService.description || ''}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateService(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingService || !newService.name || !newService.price}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingService ? 'Creating...' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}