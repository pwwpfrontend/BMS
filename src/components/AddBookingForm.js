import { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, MapPin, Building, Settings, User, Upload } from 'lucide-react';
import bookingAPI from '../services/bookingApi';
import imageAPI from '../services/imageApi';
import customerAPI from '../services/customerApi';

// Inline Time Picker Component with Availability Check
function TimePickerInline({ value, onChange, onClose, availableTimeSlots = [] }) {
  const [hour, setHour] = useState(() => {
    const [h, m] = value.split(':').map(Number);
    return h % 12 === 0 ? 12 : h % 12;
  });
  const [minute, setMinute] = useState(() => {
    const [h, m] = value.split(':').map(Number);
    return Math.round(m / 15) * 15;
  });
  const [period, setPeriod] = useState(() => {
    const [h, m] = value.split(':').map(Number);
    return h >= 12 ? 'PM' : 'AM';
  });

  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const periodRef = useRef(null);

  const hours = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
  const minutes = [0, 15, 30, 45];
  const periods = ['AM', 'PM'];

  // Check if a time slot is available
  const isTimeAvailable = (h, m, p) => {
    if (availableTimeSlots.length === 0) return true;
    
    let h24 = h;
    if (p === 'PM' && h !== 12) h24 += 12;
    if (p === 'AM' && h === 12) h24 = 0;
    
    const timeStr = `${h24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    return availableTimeSlots.includes(timeStr);
  };

  // Scroll to center on mount
  useEffect(() => {
    const scrollToCenter = (ref, items, selectedValue) => {
      if (!ref.current) return;
      const index = items.indexOf(selectedValue);
      const itemHeight = 44;
      const containerHeight = 176;
      const centerOffset = (containerHeight - itemHeight) / 2;
      ref.current.scrollTop = index * itemHeight - centerOffset;
    };

    setTimeout(() => {
      scrollToCenter(hourRef, hours, hour);
      scrollToCenter(minuteRef, minutes, minute);
      scrollToCenter(periodRef, periods, period);
    }, 0);
  }, []);

  const handleScroll = (ref, items, setter) => {
    if (!ref.current) return;
    const itemHeight = 44;
    const containerHeight = 176;
    const centerOffset = (containerHeight - itemHeight) / 2;
    const scrollTop = ref.current.scrollTop;
    const index = Math.round((scrollTop + centerOffset) / itemHeight);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    setter(items[clamped]);
  };

  const handleItemClick = (items, value, setter, ref) => {
    setter(value);
    if (ref.current) {
      const index = items.indexOf(value);
      const itemHeight = 44;
      const containerHeight = 176;
      const centerOffset = (containerHeight - itemHeight) / 2;
      ref.current.scrollTop = index * itemHeight - centerOffset;
    }
  };

  const handleConfirm = () => {
    if (!isTimeAvailable(hour, minute, period)) {
      alert('This time slot is not available. Please select another time.');
      return;
    }

    let h24 = hour;
    if (period === 'PM' && hour !== 12) h24 += 12;
    if (period === 'AM' && hour === 12) h24 = 0;

    const timeStr = `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(timeStr);
    onClose();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 mt-2">
      {/* Labels Row */}
      <div className="flex justify-center gap-16 mb-4">
        <div className="w-16 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hour</p>
        </div>
        <div className="w-16 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Minute</p>
        </div>
        <div className="w-16 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Period</p>
        </div>
      </div>

      {/* Time Picker Grid */}
      <div className="flex justify-center gap-16 mb-6">
        {/* Hour Column */}
        <div className="w-16 h-44 overflow-y-scroll"
          ref={hourRef}
          onScroll={() => handleScroll(hourRef, hours, setHour)}
          style={{
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`
            div[data-hour-ref]::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {hours.map((h) => {
            const isAvailable = isTimeAvailable(h, minute, period);
            return (
              <button
                key={h}
                type="button"
                onClick={() => {
                  if (isAvailable) {
                    handleItemClick(hours, h, setHour, hourRef);
                  }
                }}
                disabled={!isAvailable}
                className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all duration-150 ${
                  hour === h
                    ? 'bg-blue-100 text-blue-600'
                    : isAvailable
                    ? 'text-gray-400 hover:text-gray-500'
                    : 'text-gray-200 cursor-not-allowed'
                }`}
              >
                {h.toString().padStart(2, '0')}
              </button>
            );
          })}
        </div>

        {/* Minute Column */}
        <div className="w-16 h-44 overflow-y-scroll"
          ref={minuteRef}
          onScroll={() => handleScroll(minuteRef, minutes, setMinute)}
          style={{
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {minutes.map((m) => {
            const isAvailable = isTimeAvailable(hour, m, period);
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (isAvailable) {
                    handleItemClick(minutes, m, setMinute, minuteRef);
                  }
                }}
                disabled={!isAvailable}
                className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all duration-150 ${
                  minute === m
                    ? 'bg-blue-100 text-blue-600'
                    : isAvailable
                    ? 'text-gray-400 hover:text-gray-500'
                    : 'text-gray-200 cursor-not-allowed'
                }`}
              >
                {m.toString().padStart(2, '0')}
              </button>
            );
          })}
        </div>

        {/* Period Column */}
        <div className="w-16 h-44 overflow-y-scroll"
          ref={periodRef}
          onScroll={() => handleScroll(periodRef, periods, setPeriod)}
          style={{
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {periods.map((p) => {
            const isAvailable = isTimeAvailable(hour, minute, p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  if (isAvailable) {
                    handleItemClick(periods, p, setPeriod, periodRef);
                  }
                }}
                disabled={!isAvailable}
                className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all duration-150 ${
                  period === p
                    ? 'bg-blue-100 text-blue-600'
                    : isAvailable
                    ? 'text-gray-400 hover:text-gray-500'
                    : 'text-gray-200 cursor-not-allowed'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          style={{ fontFamily: 'Inter' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isTimeAvailable(hour, minute, period)}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Inter' }}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export default function AddBookingForm({ onClose, onBookingCreated }) {
  const [formData, setFormData] = useState({
    location_id: '',
    resource_id: '',
    service_id: '',
    starts_at: '',
    ends_at: '',
    date: '',
    start_time: '09:00',
    end_time: '10:00',
    customer_id: '',
    customer_name: ''
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [locations, setLocations] = useState([]);
  const [resources, setResources] = useState([]);
  const [services, setServices] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [hongKongLocation, setHongKongLocation] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [activeTimePicker, setActiveTimePicker] = useState(null);
  
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [showCreateResource, setShowCreateResource] = useState(false);
  const [showCreateService, setShowCreateService] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  
  const [newLocation, setNewLocation] = useState({ name: '', time_zone: 'Asia/Kolkata' });
  const [newResource, setNewResource] = useState({ name: '', max_simultaneous_bookings: 1 });
  const [newService, setNewService] = useState({ 
    name: '', 
    price: 0, 
    duration: 'PT1H', 
    bookable_interval: 'PT15M' 
  });
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });
  
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  
  // Image handling functions
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };
  
  const handleImageUpload = async () => {
    if (!imageFile) return null;
    
    try {
      setUploadingImage(true);
      const result = await imageAPI.uploadImage(imageFile);
      return result.url || result.imageUrl || result.image_url; // Handle different response formats
    } catch (error) {
      console.error('Image upload failed:', error);
      setError('Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Customer management functions
  const loadCustomers = async () => {
    try {
      console.log('👥 Loading customers...');
      const response = await customerAPI.getCustomers();
      setCustomers(response.data || []);
      console.log(`✅ Loaded ${response.data?.length || 0} customers`);
    } catch (error) {
      console.error('Error loading customers:', error);
      // Fallback to empty array
      setCustomers([]);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    
    if (!newCustomer.name.trim()) {
      setError('Customer name is required');
      return;
    }

    try {
      setIsCreatingCustomer(true);
      
      const customerData = {
        name: newCustomer.name.trim(),
        email: newCustomer.email.trim(),
        phone: newCustomer.phone.trim()
      };

      // Create customer via API
      const customer = await customerAPI.createCustomer(customerData);

      // Add to customers list
      setCustomers(prev => [...prev, customer]);
      
      // Select the new customer
      setFormData(prev => ({
        ...prev,
        customer_id: customer.id,
        customer_name: customer.name
      }));

      // Reset form and close modal
      setNewCustomer({ name: '', email: '', phone: '' });
      setShowCreateCustomer(false);
      
      console.log('✅ Customer created successfully:', customer);
      
    } catch (error) {
      setError('Failed to create customer. Please try again.');
      console.error('Error creating customer:', error);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoadingData(true);
        setError('');
        
        console.log('📋 Loading form data for Add Booking...');
        
        const [locationsRes, resourcesRes, servicesRes] = await Promise.all([
          bookingAPI.getLocations(),
          bookingAPI.getResources(),
          bookingAPI.getServices()
        ]);
        
        // Load customers
        await loadCustomers();
        
        const locations = locationsRes.data || [];
        const resources = resourcesRes.data || [];
        const services = servicesRes.data || [];
        
        // Use specific Hong Kong location ID from API testing
        const HONG_KONG_LOCATION_ID = '7aa01d57-aacf-480e-9065-d48d46ffb365';
        const hkLocation = locations.find(loc => loc.id === HONG_KONG_LOCATION_ID) ||
                          locations.find(loc => loc.name.toLowerCase().includes('hong kong')) ||
                          locations[0];
        
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

  useEffect(() => {
    const loadAvailableTimeSlots = async () => {
      if (!formData.resource_id || !formData.date) {
        setAvailableTimeSlots([]);
        return;
      }

      try {
        console.log('📅 Loading available time slots...');
        const bookingsRes = await bookingAPI.getAllBookings();
        const bookings = bookingsRes.data || [];
        const selectedDate = formData.date;

        const dateBookings = bookings.filter(booking => {
          const bookingDate = booking.starts_at.split('T')[0];
          return booking.resource_id === formData.resource_id && bookingDate === selectedDate;
        });

        const allSlots = [];
        for (let hour = 6; hour < 24; hour++) {
          for (let minute = 0; minute < 60; minute += 15) {
            allSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
          }
        }

        const bookedSlots = new Set();
        dateBookings.forEach(booking => {
          const startTime = booking.starts_at.split('T')[1].substring(0, 5);
          const endTime = booking.ends_at.split('T')[1].substring(0, 5);
          
          let current = startTime;
          while (current <= endTime) {
            bookedSlots.add(current);
            const [h, m] = current.split(':').map(Number);
            const nextMinute = m + 15;
            if (nextMinute < 60) {
              current = `${h.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
            } else {
              current = `${(h + 1).toString().padStart(2, '0')}:00`;
            }
          }
        });

        const availableSlots = allSlots.filter(slot => !bookedSlots.has(slot));
        setAvailableTimeSlots(availableSlots);
        console.log(`✅ Available slots loaded: ${availableSlots.length} slots available`);

      } catch (err) {
        console.error('❌ Error loading available time slots:', err);
        setAvailableTimeSlots([]);
      }
    };

    loadAvailableTimeSlots();
  }, [formData.resource_id, formData.date]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const convertTo12Hour = (time24) => {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const formatDateTime = (date, time) => {
    if (!date || !time) return '';
    
    const selectedLocation = locations.find(loc => loc.id === formData.location_id);
    let timezone = '+05:30';
    
    if (selectedLocation?.time_zone) {
      const timezoneMap = {
        'Asia/Hong_Kong': '+08:00',
        'Asia/Kolkata': '+05:30',
        'Asia/Singapore': '+08:00',
        'America/New_York': '-05:00',
        'Europe/London': '+00:00',
      };
      timezone = timezoneMap[selectedLocation.time_zone] || '+05:30';
    }
    
    return `${date}T${time}:00${timezone}`;
  };

  const validateForm = () => {
    if (!formData.customer_id && !formData.customer_name.trim()) return 'Please select or create a customer';
    if (!formData.location_id) return 'Please select a location';
    if (!formData.resource_id) return 'Please select a resource';
    if (!formData.service_id) return 'Please select a service';
    if (!formData.date) return 'Please select a date';
    if (!formData.start_time) return 'Please select start time';
    if (!formData.end_time) return 'Please select end time';
    
    if (formData.start_time >= formData.end_time) {
      return 'End time must be after start time';
    }
    
    const startHour = parseInt(formData.start_time.split(':')[0]);
    const endHour = parseInt(formData.end_time.split(':')[0]);
    
    if (startHour < 6 || endHour > 23) {
      return 'Please select a time between 6:00 AM and 11:00 PM';
    }
    
    if (startHour < 6 && endHour <= 6) {
      return 'Bookings before 6:00 AM are not available';
    }
    
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return 'Cannot book in the past';
    }
    
    return null;
  };

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
      
      // Upload image first if provided
      let imageUrl = null;
      if (imageFile) {
        console.log('📷 Uploading image...');
        imageUrl = await handleImageUpload();
        if (!imageUrl) {
          // Image upload failed, but error is already set
          return;
        }
        console.log('✅ Image uploaded:', imageUrl);
      }
      
      const starts_at = formatDateTime(formData.date, formData.start_time);
      const ends_at = formatDateTime(formData.date, formData.end_time);
      
      // Get customer info
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      const customerName = selectedCustomer?.name || formData.customer_name.trim();
      
      const bookingData = {
        location_id: formData.location_id,
        resource_id: formData.resource_id,
        service_id: formData.service_id,
        starts_at,
        ends_at,
        metadata: {
          user_name: customerName,
          customer_id: formData.customer_id,
          customer_email: selectedCustomer?.email,
          customer_phone: selectedCustomer?.phone,
          ...(imageUrl && { image_url: imageUrl })
        }
      };
      
      console.log('Creating booking with data:', bookingData);
      
      console.log('🔍 Checking for potential conflicts...');
      console.log(`📅 Booking details: ${formData.date} ${formData.start_time}-${formData.end_time}`);
      console.log(`🏭 Resource: ${resources.find(r => r.id === formData.resource_id)?.name}`);
      
      try {
        await bookingAPI.associateServiceToResource(formData.service_id, formData.resource_id);
      } catch (associationError) {
        console.warn('Association warning:', associationError);
      }
      
      console.log('🗺️ Checking existing schedules for resource...');
      
      let hasSchedule = false;
      let existingSchedules = [];
      
      try {
        const schedulesResponse = await bookingAPI.getScheduleBlocks(formData.resource_id);
        existingSchedules = schedulesResponse.data || [];
        console.log(`📋 Found ${existingSchedules.length} existing schedule blocks`);
        
        const bookingDate = new Date(formData.date);
        const dateSchedule = existingSchedules.find(schedule => {
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
        // Assume no schedules exist
        hasSchedule = false;
      }
      
      // AGGRESSIVE SCHEDULE CREATION - Always create if no schedules exist
      if (existingSchedules.length === 0) {
        console.log('🚨 ZERO schedule blocks found - creating comprehensive schedule immediately!');
        
        const selectedLocation = locations.find(loc => loc.id === formData.location_id);
        const timezoneMap = {
          'Asia/Hong_Kong': '+08:00',
          'Asia/Kolkata': '+05:30', 
          'Asia/Singapore': '+08:00',
          'America/New_York': '-05:00'
        };
        const timezone = timezoneMap[selectedLocation?.time_zone] || '+08:00';
        
        // Create schedules for the next 30 days
        const today = new Date();
        const schedulesToCreate = [];
        
        for (let i = 0; i < 30; i++) {
          const scheduleDate = new Date(today);
          scheduleDate.setDate(today.getDate() + i);
          const dateStr = scheduleDate.toISOString().split('T')[0];
          
          schedulesToCreate.push({
            location_id: formData.location_id,
            starts_at: `${dateStr}T06:00:00${timezone}`,
            ends_at: `${dateStr}T23:00:00${timezone}`
          });
        }
        
        console.log(`🔄 Creating ${schedulesToCreate.length} schedule blocks...`);
        
        // Create schedules one by one
        let successCount = 0;
        for (const scheduleData of schedulesToCreate) {
          try {
            await bookingAPI.createScheduleBlock(formData.resource_id, scheduleData);
            successCount++;
            console.log(`✅ Created schedule ${successCount}/${schedulesToCreate.length}`);
          } catch (createError) {
            if (createError.message.includes('collides')) {
              successCount++;
              console.log(`✅ Schedule ${successCount}/${schedulesToCreate.length} already exists`);
            } else {
              console.warn(`⚠️ Failed to create schedule for ${scheduleData.starts_at}:`, createError.message);
            }
          }
        }
        
        console.log(`🎉 Schedule creation complete: ${successCount}/${schedulesToCreate.length} successful`);
        hasSchedule = successCount > 0;
        
        // Wait for processing
        console.log('⏳ Waiting for schedule processing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      if (!hasSchedule) {
        console.log('🗺️ Creating schedule block for booking date...');
        
        const timezone = '+08:00';
        const bookingDate = formData.date;
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
          }
        }
      }
      
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
        
        try {
          await bookingAPI.createRecurringSchedule(formData.resource_id, recurringScheduleData);
          console.log('✅ Recurring schedule created successfully');
          hasSchedule = true;
        } catch (recurringError) {
          console.error('❌ Recurring schedule error details:', recurringError);
          if (recurringError.message.includes('collides') || recurringError.message.includes('already exists')) {
            console.log('✅ Recurring schedule collision/exists - that\'s good!');
            hasSchedule = true;
          }
        }
      }
      
      console.log('⏳ Waiting for schedule processing...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('🚀 Creating booking now...');
      
      let response;
      try {
        response = await bookingAPI.createBooking(bookingData);
        console.log('✅ Booking created successfully!');
      } catch (bookingError) {
        console.error('❌ Booking failed:', bookingError.message);
        
        // Handle "resource does not have an open schedule" error
        if (bookingError.message.includes('does not have an open schedule')) {
        console.log('🔧 Resource has no schedule, creating comprehensive schedule...');
          
          try {
            // Get the selected location for proper timezone
            const selectedLocation = locations.find(loc => loc.id === formData.location_id);
            console.log('🗺 Location details:', selectedLocation);
            
            // Determine timezone based on location
            const timezoneMap = {
              'Asia/Hong_Kong': '+08:00',
              'Asia/Kolkata': '+05:30', 
              'Asia/Singapore': '+08:00',
              'America/New_York': '-05:00'
            };
            const timezone = timezoneMap[selectedLocation?.time_zone] || '+08:00';
            console.log(`⏰ Using timezone: ${timezone} for location: ${selectedLocation?.name}`);
            
            const bookingDate = new Date(formData.date);
            
            // First, try creating a schedule for just the booking date
            const dateStr = bookingDate.toISOString().split('T')[0];
            const primarySchedule = {
              location_id: formData.location_id,
              starts_at: `${dateStr}T06:00:00${timezone}`,
              ends_at: `${dateStr}T23:00:00${timezone}`
            };
            
            console.log('🗺 Creating primary schedule:', primarySchedule);
            
            try {
              await bookingAPI.createScheduleBlock(formData.resource_id, primarySchedule);
              console.log(`✅ Created primary schedule for ${dateStr}`);
            } catch (primaryScheduleErr) {
              if (!primaryScheduleErr.message.includes('collides')) {
                console.warn('Primary schedule creation warning:', primaryScheduleErr.message);
              } else {
                console.log('✅ Primary schedule already exists (collision)');
              }
            }
            
            // Then create additional days for better UX
            const additionalDays = [];
            for (let i = 1; i <= 7; i++) {
              const futureDate = new Date(bookingDate);
              futureDate.setDate(bookingDate.getDate() + i);
              const futureDateStr = futureDate.toISOString().split('T')[0];
              
              additionalDays.push({
                location_id: formData.location_id,
                starts_at: `${futureDateStr}T06:00:00${timezone}`,
                ends_at: `${futureDateStr}T23:00:00${timezone}`
              });
            }
            
            // Create additional schedules (don't wait for these)
            additionalDays.forEach(async (scheduleData) => {
              try {
                await bookingAPI.createScheduleBlock(formData.resource_id, scheduleData);
                console.log(`✅ Created additional schedule for ${scheduleData.starts_at.split('T')[0]}`);
              } catch (additionalErr) {
                // Ignore errors for additional days
                console.log(`⚠️ Additional schedule existed: ${scheduleData.starts_at.split('T')[0]}`);
              }
            });
            
            // Wait briefly for schedule processing
            console.log('⏳ Waiting for schedule processing...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Try booking again
            console.log('🚀 Retrying booking after creating schedules...');
            console.log('📋 Booking data for retry:', bookingData);
            console.log(`🗺 Resource: ${resources.find(r => r.id === formData.resource_id)?.name}`);
            console.log(`📅 Date/Time: ${formData.date} ${formData.start_time}-${formData.end_time}`);
            
            response = await bookingAPI.createBooking(bookingData);
            console.log('✅ Booking created successfully after schedule creation!');
            
          } catch (scheduleFixError) {
            console.error('❌ Failed to create schedules and booking:', scheduleFixError);
            
            // Last resort: try with a different approach
            if (scheduleFixError.message && scheduleFixError.message.includes('does not have an open schedule')) {
              console.log('🆘 Last resort: Trying with current time as schedule...');
              
              try {
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                
                // Create a wide schedule for today
                await bookingAPI.createScheduleBlock(formData.resource_id, {
                  location_id: formData.location_id,
                  starts_at: `${todayStr}T00:00:00${timezone}`,
                  ends_at: `${todayStr}T23:59:59${timezone}`
                });
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                response = await bookingAPI.createBooking(bookingData);
                console.log('✅ Booking created with last resort schedule!');
                
              } catch (lastResortError) {
                console.error('❌ Last resort failed:', lastResortError);
                
                const resourceName = resources.find(r => r.id === formData.resource_id)?.name || 'the selected resource';
                throw new Error(`🚨 Unable to create booking for ${resourceName}. \n\nThe resource doesn't have an available schedule for the selected date and time. \n\nPlease try:\n• Selecting a different resource\n• Choosing a different date/time\n• Contacting an administrator to set up the resource schedule\n\nError details: ${scheduleFixError.message}`);
              }
            } else {
              throw new Error(`Booking failed: ${scheduleFixError.message}`);
            }
          }
        } else if (bookingError.message.includes('collides with one or more existing schedule blocks')) {
          console.log('✅ Schedule collision detected - this means schedules exist!');
          
          try {
            response = await bookingAPI.createBooking(bookingData);
            console.log('✅ Booking created after collision resolution!');
          } catch (retryError) {
            if (retryError.message.includes('does not match a valid bookable slot')) {
              throw new Error('This time slot is not available. It may already be booked or the resource is not available at this time. Please select a different time.');
            } else {
              throw new Error(`Booking failed: ${retryError.message}`);
            }
          }
        } else if (bookingError.message.includes('does not match a valid bookable slot')) {
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
            }
          }
          
          try {
            response = await bookingAPI.createBooking(bookingData);
            console.log('✅ Booking created on second attempt!');
          } catch (finalBookingError) {
            if (finalBookingError.message.includes('does not match a valid bookable slot')) {
              throw new Error('This time slot is not available. It may already be booked or outside the resource\'s available hours. Please select a different time.');
            } else if (finalBookingError.message.includes('already exists') || finalBookingError.message.includes('conflict')) {
              throw new Error('There is already a booking for this resource at this time. Please choose a different time or resource.');
            } else {
              throw new Error(`Unable to create booking: ${finalBookingError.message}`);
            }
          }
        } else {
          throw bookingError;
        }
      }
      
      localStorage.removeItem('bookings_cache_valid');
      localStorage.removeItem('bookings_cache');
      
      if (onBookingCreated) {
        onBookingCreated(response);
      }
      
      console.log('✅ Booking created successfully:', response);
      onClose();
      
    } catch (err) {
      console.error('Error creating booking:', err);
      
      if (err.message && err.message.includes('collides with one or more existing schedule blocks')) {
        console.log('✅ Collision error detected - schedules exist, trying direct booking...');
        
        try {
          setError('Schedules exist, attempting booking...');
          const selectedCustomer = customers.find(c => c.id === formData.customer_id);
          const customerName = selectedCustomer?.name || formData.customer_name.trim();
          
          const bookingData = {
            location_id: formData.location_id,
            resource_id: formData.resource_id,
            service_id: formData.service_id,
            starts_at: formatDateTime(formData.date, formData.start_time),
            ends_at: formatDateTime(formData.date, formData.end_time),
            metadata: { 
              user_name: customerName,
              customer_id: formData.customer_id,
              customer_email: selectedCustomer?.email,
              customer_phone: selectedCustomer?.phone,
              ...(imageUrl && { image_url: imageUrl })
            }
          };
          
          const response = await bookingAPI.createBooking(bookingData);
          console.log('✅ Direct booking successful after collision!');
          
          localStorage.removeItem('bookings_cache_valid');
          localStorage.removeItem('bookings_cache');
          
          if (onBookingCreated) {
            onBookingCreated(response);
          }
          
          onClose();
          return;
          
        } catch (directBookingError) {
          console.error('❌ Direct booking after collision failed:', directBookingError);
          
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

  const handleResourceChange = (resourceId) => {
    handleChange('resource_id', resourceId);
    loadAvailableServices(resourceId);
    if (formData.service_id) {
      handleChange('service_id', '');
    }
  };

  const loadAvailableServices = async (resourceId) => {
    if (!resourceId) {
      setAvailableServices(services);
      return;
    }

    try {
      setAvailableServices(services);
    } catch (error) {
      console.error('Error loading available services:', error);
      setAvailableServices(services);
    }
  };

  useEffect(() => {
    loadAvailableServices(formData.resource_id);
  }, [services, formData.resource_id]);

  const handleCreateLocation = async () => {
    if (!newLocation.name.trim()) {
      setError('Location name is required');
      return;
    }

    try {
      setIsCreatingLocation(true);
      const response = await bookingAPI.createLocation(newLocation);
      
      setLocations(prev => [...prev, response]);
      setFormData(prev => ({ ...prev, location_id: response.id }));
      
      setNewLocation({ name: '', time_zone: 'Asia/Kolkata' });
      setShowCreateLocation(false);
      setError('');
      
    } catch (err) {
      setError('Failed to create location: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreatingLocation(false);
    }
  };

  const handleCreateResource = async () => {
    if (!newResource.name.trim()) {
      setError('Resource name is required');
      return;
    }

    try {
      setIsCreatingResource(true);
      const response = await bookingAPI.createResource(newResource);
      
      try {
        const selectedLocation = locations.find(loc => loc.id === formData.location_id);
        const timezoneMap = {
          'Asia/Hong_Kong': '+08:00',
          'Asia/Kolkata': '+05:30',
          'Asia/Singapore': '+08:00',
        };
        const timezone = timezoneMap[selectedLocation?.time_zone] || '+05:30';
        
        const schedulePromises = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
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
        
        await Promise.all(schedulePromises);
      } catch (scheduleError) {
        console.warn('Failed to create default schedule for resource:', scheduleError);
      }
      
      setResources(prev => [...prev, response]);
      setFormData(prev => ({ ...prev, resource_id: response.id }));
      
      loadAvailableServices(response.id);
      
      setNewResource({ name: '', max_simultaneous_bookings: 1 });
      setShowCreateResource(false);
      setError('');
      
    } catch (err) {
      setError('Failed to create resource: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreatingResource(false);
    }
  };

  const handleCreateService = async () => {
    if (!newService.name.trim() || !newService.price || !newService.duration) {
      setError('Service name, price, and duration are required');
      return;
    }

    try {
      setIsCreatingService(true);
      const serviceData = {
        ...newService,
        price: parseFloat(newService.price) || 0
      };
      
      const response = await bookingAPI.createService(serviceData);
      
      if (formData.resource_id) {
        try {
          await bookingAPI.associateServiceToResource(response.id, formData.resource_id);
        } catch (associationError) {
          console.warn('Failed to associate service with resource:', associationError);
        }
      }
      
      setServices(prev => [...prev, response]);
      setFormData(prev => ({ ...prev, service_id: response.id }));
      
      setNewService({ name: '', price: 0, duration: 'PT1H', bookable_interval: 'PT15M' });
      setShowCreateService(false);
      setError('');
      
    } catch (err) {
      setError('Failed to create service: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreatingService(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeTimePicker && !e.target.closest('[data-time-picker]')) {
        setActiveTimePicker(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeTimePicker]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ fontFamily: 'Inter' }}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Add New Booking</h2>
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
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              Customer
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => {
                if (e.target.value === 'CREATE_NEW') {
                  setShowCreateCustomer(true);
                } else {
                  const selectedCustomer = customers.find(c => c.id === e.target.value);
                  handleChange('customer_id', e.target.value);
                  handleChange('customer_name', selectedCustomer?.name || '');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.email && `(${customer.email})`}
                </option>
              ))}
              <option value="CREATE_NEW" className="font-medium text-blue-600">
                + Add New Customer
              </option>
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Upload className="w-4 h-4" />
              Upload Image (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <div className="text-center py-4">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload an image</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                  </div>
                </label>
              )}
            </div>
            {uploadingImage && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Uploading image...
              </div>
            )}
          </div>

          {/* Location - Static Hong Kong */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Time */}
            <div data-time-picker className="relative">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Start time</label>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setActiveTimePicker(activeTimePicker === 'start' ? null : 'start')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-50 transition-colors text-left font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                >
                  <span>{convertTo12Hour(formData.start_time)}</span>
                  <Clock className="w-5 h-5 text-gray-400" />
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  Show time picker
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-700"></div>
                </div>
              </div>
              {activeTimePicker === 'start' && (
                <TimePickerInline
                  value={formData.start_time}
                  onChange={(time) => {
                    handleChange('start_time', time);
                    setActiveTimePicker(null);
                  }}
                  onClose={() => setActiveTimePicker(null)}
                  availableTimeSlots={availableTimeSlots}
                />
              )}
            </div>

            {/* End Time */}
            <div data-time-picker className="relative">
              <label className="text-sm font-medium text-gray-700 mb-2 block">End time</label>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setActiveTimePicker(activeTimePicker === 'end' ? null : 'end')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-50 transition-colors text-left font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                >
                  <span>{convertTo12Hour(formData.end_time)}</span>
                  <Clock className="w-5 h-5 text-gray-400" />
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  Show time picker
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-700"></div>
                </div>
              </div>
              {activeTimePicker === 'end' && (
                <TimePickerInline
                  value={formData.end_time}
                  onChange={(time) => {
                    handleChange('end_time', time);
                    setActiveTimePicker(null);
                  }}
                  onClose={() => setActiveTimePicker(null)}
                  availableTimeSlots={availableTimeSlots}
                />
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#184AC0' }}
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
        </div>
      </div>

      {/* Create Location Dialog */}
      {showCreateLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Location</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateLocation(); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newResource.name}
                  onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <input
                  type="text"
                  value={newResource.type || ''}
                  onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Meeting Room, Equipment"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Simultaneous Bookings *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
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

      {/* Create Customer Dialog */}
      {showCreateCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Customer</h3>
            <form onSubmit={handleCreateCustomer}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="Enter customer name"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateCustomer(false);
                    setNewCustomer({ name: '', email: '', phone: '' });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCustomer || !newCustomer.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingCustomer ? 'Adding...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}