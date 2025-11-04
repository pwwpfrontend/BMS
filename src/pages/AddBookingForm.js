import { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, MapPin, Building, User, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

// Parse ISO duration to minutes
function parseDuration(duration) {
  if (!duration) return 60;
  const match = duration.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return 60;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  return hours * 60 + minutes;
}

// Get current Hong Kong time
function getHongKongTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
}

// Check if a time is in the past relative to HK time
function isTimePast(dateString, timeString) {
  const selectedDate = new Date(dateString);
  const hkNow = getHongKongTime();
  
  // If selected date is before today, it's in the past
  const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const todayOnly = new Date(hkNow.getFullYear(), hkNow.getMonth(), hkNow.getDate());
  
  if (selectedDateOnly < todayOnly) return true;
  if (selectedDateOnly > todayOnly) return false;
  
  // Same day - check time
  const [hours, minutes] = timeString.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  const nowInMinutes = hkNow.getHours() * 60 + hkNow.getMinutes();
  
  return timeInMinutes <= nowInMinutes;
}

// Time Picker Component with Availability
function TimePickerInline({ value, onChange, onClose, availableSlots = [], scheduleBlocks = [], selectedDate, startTime, minDuration = 15, maxDuration = 480, interval = 15 }) {
    // Get the weekday for the selected date
  const getWeekdayForDate = () => {
    if (!selectedDate) return null;
    const date = new Date(selectedDate);
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  };

  const weekday = getWeekdayForDate();

  // Get schedule blocks for the selected weekday
  const getDayScheduleBlocks = () => {
    if (!weekday || !scheduleBlocks || scheduleBlocks.length === 0) return [];
    return scheduleBlocks.filter(block => block.weekday === weekday);
  };

  const dayBlocks = getDayScheduleBlocks();

  // Generate all possible time slots based on schedule blocks
  const generateTimeSlotsFromSchedule = () => {
    if (dayBlocks.length === 0) return [];
    
    const slots = [];
    dayBlocks.forEach(block => {
      const [startHour, startMin] = block.start_time.split(':').map(Number);
      const [endHour, endMin] = block.end_time.split(':').map(Number);
      const blockStart = startHour * 60 + startMin;
      const blockEnd = endHour * 60 + endMin;
      
      for (let time = blockStart; time < blockEnd; time += interval) {
        const hour = Math.floor(time / 60);
        const minute = time % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
       // Check if this time is in the past
const isPast = isTimePast(selectedDate, timeStr);

// If startTime is provided (for end time picker), filter out times <= startTime
const isBeforeStartTime = startTime && timeStr <= startTime;

// Check if this slot is booked
const slot = availableSlots.find(s => s.time === timeStr);
const isAvailable = slot ? slot.available : true;
        
slots.push({ 
  time: timeStr, 
  available: isAvailable && !isPast && !isBeforeStartTime,
  isPast: isPast || isBeforeStartTime,
  isBooked: slot ? !slot.available : false
});
      }
    });
    
    return slots;
  };

  const timeSlots = generateTimeSlotsFromSchedule();

  // Get unique hours and minutes from time slots
  const getAvailableHoursAndMinutes = () => {
    if (timeSlots.length === 0) {
      return {
        hours: [],
        minutes: [],
        availableByHourAndMinute: {}
      };
    }

    const hoursSet = new Set();
    const minutesSet = new Set();
    const availableByHourAndMinute = {};

    timeSlots.forEach(slot => {
      const [h, m] = slot.time.split(':').map(Number);
      hoursSet.add(h);
      minutesSet.add(m);
      
      if (!availableByHourAndMinute[h]) {
        availableByHourAndMinute[h] = { minutes: new Set(), slots: [] };
      }
      availableByHourAndMinute[h].minutes.add(m);
      availableByHourAndMinute[h].slots.push(slot);
    });

    return {
      hours: Array.from(hoursSet).sort((a, b) => a - b),
      minutes: Array.from(minutesSet).sort((a, b) => a - b),
      availableByHourAndMinute
    };
  };

  const { hours: availableHours24, minutes: availableMinutes, availableByHourAndMinute } = getAvailableHoursAndMinutes();

  // Convert 24h to 12h format with periods
  const getHours12WithPeriods = () => {
    const result = { AM: [], PM: [] };
    
    availableHours24.forEach(h24 => {
      const period = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      result[period].push({ h24, h12 });
    });

    // Sort correctly: 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
    const sortHours = (hours) => {
      return hours.sort((a, b) => {
        if (a.h12 === 12) return -1;
        if (b.h12 === 12) return 1;
        return a.h12 - b.h12;
      });
    };

    const sortedAM = sortHours(result.AM);
    const sortedPM = sortHours(result.PM);

    return {
      AM: sortedAM.map(h => h.h12),
      PM: sortedPM.map(h => h.h12),
      availablePeriods: []
        .concat(result.AM.length > 0 ? ['AM'] : [])
        .concat(result.PM.length > 0 ? ['PM'] : [])
    };
  };

  const { AM: hoursAM, PM: hoursPM, availablePeriods } = getHours12WithPeriods();

  const [hour, setHour] = useState(() => {
    const [h] = value.split(':').map(Number);
    return h % 12 === 0 ? 12 : h % 12;
  });
  const [minute, setMinute] = useState(() => {
    const [, m] = value.split(':').map(Number);
    return Math.round(m / interval) * interval;
  });
  const [period, setPeriod] = useState(() => {
    const [h] = value.split(':').map(Number);
    return h >= 12 ? 'PM' : 'AM';
  });

  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const periodRef = useRef(null);

  // Update internal state when value prop changes
  useEffect(() => {
    const [h] = value.split(':').map(Number);
    const [, m] = value.split(':').map(Number);
    
    setHour(h % 12 === 0 ? 12 : h % 12);
    setMinute(Math.round(m / interval) * interval);
    setPeriod(h >= 12 ? 'PM' : 'AM');
  }, [value, interval]);

  // Get hours for current period
  const hoursForPeriod = period === 'AM' ? hoursAM : hoursPM;
  
  // Convert 12h hour + period to 24h hour
  const convertTo24Hour = (h12, p) => {
    let h24 = h12;
    if (p === 'PM' && h12 !== 12) h24 = h12 + 12;
    if (p === 'AM' && h12 === 12) h24 = 0;
    return h24;
  };

  // Get minutes available for the selected hour
  const getMinutesForHour = () => {
    const h24 = convertTo24Hour(hour, period);
    
    if (availableByHourAndMinute[h24]) {
      return Array.from(availableByHourAndMinute[h24].minutes).sort((a, b) => a - b);
    }
    return [];
  };

  const minutesForHour = getMinutesForHour();

  // Check if a specific time is available, past, or booked
  const getTimeStatus = (h, m, p) => {
    const h24 = convertTo24Hour(h, p);
    const timeStr = `${h24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    const slot = timeSlots.find(s => s.time === timeStr);
    
    return {
      available: slot ? slot.available : false,
      isPast: slot ? slot.isPast : false,
      isBooked: slot ? slot.isBooked : false
    };
  };

  // Update minutes when hour or period changes
  useEffect(() => {
    const newMinutesForHour = getMinutesForHour();
    if (newMinutesForHour.length > 0 && !newMinutesForHour.includes(minute)) {
      setMinute(newMinutesForHour[0]);
    }
  }, [hour, period]);

  // Update minutes when hour or period changes
useEffect(() => {
  const newMinutesForHour = getMinutesForHour();
  if (newMinutesForHour.length > 0 && !newMinutesForHour.includes(minute)) {
    setMinute(newMinutesForHour[0]);
  }
}, [hour, period]);

// AUTO-SELECT FIRST AVAILABLE TIME FOR END TIME PICKER
useEffect(() => {
  // Only run for end time picker (when startTime is provided)
  if (!startTime) return;
  
  // Check if current selected time is valid
  const h24 = convertTo24Hour(hour, period);
  const currentTimeStr = `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const currentSlot = timeSlots.find(s => s.time === currentTimeStr);
  
  // If current time is before start time or unavailable, find first available time
  if (currentTimeStr <= startTime || !currentSlot || !currentSlot.available) {
    // Find first available time after startTime
    const firstAvailableAfterStart = timeSlots.find(slot => {
      return slot.time > startTime && slot.available;
    });
    
    if (firstAvailableAfterStart) {
      const [newH, newM] = firstAvailableAfterStart.time.split(':').map(Number);
      const newH12 = newH % 12 === 0 ? 12 : newH % 12;
      const newPeriod = newH >= 12 ? 'PM' : 'AM';
      
      setHour(newH12);
      setMinute(newM);
      setPeriod(newPeriod);
    }
  }
}, [startTime, timeSlots]); // Run when startTime or timeSlots change

  useEffect(() => {
    const scrollToCenter = (ref, items, selectedValue) => {
      if (!ref.current) return;
      const index = items.indexOf(selectedValue);
      if (index === -1) return;
      const itemHeight = 44;
      const containerHeight = 176;
      const centerOffset = (containerHeight - itemHeight) / 2;
      ref.current.scrollTop = index * itemHeight - centerOffset;
    };

    setTimeout(() => {
      scrollToCenter(hourRef, hoursForPeriod, hour);
      scrollToCenter(minuteRef, minutesForHour, minute);
      scrollToCenter(periodRef, availablePeriods, period);
    }, 0);
  }, [period, hour, minute]);

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
    const status = getTimeStatus(hour, minute, period);
    
    if (status.isPast) {
      alert('Cannot book a time in the past.');
      return;
    }
    
    if (status.isBooked) {
      alert('This time slot is already booked. Please select another time.');
      return;
    }
    
    if (!status.available) {
      alert('This time slot is not available. Please select another time.');
      return;
    }

    const h24 = convertTo24Hour(hour, period);
    const timeStr = `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(timeStr);
    onClose();
  };

  // Show message if no available slots
  if (timeSlots.length === 0 || availableHours24.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 mt-2">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No available time slots for this date</p>
          <p className="text-xs text-gray-500 mt-1">
            {weekday ? `This resource is not available on ${weekday}s` : 'Please select a different date'}
          </p>
        </div>
        <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 mt-2">
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

      <div className="flex justify-center gap-16 mb-6">
        <div className="w-16 h-44 overflow-y-scroll"
          ref={hourRef}
          onScroll={() => handleScroll(hourRef, hoursForPeriod, setHour)}
          style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none' }}
        >
          {hoursForPeriod.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-400">No hours</div>
          ) : (
            hoursForPeriod.map((h) => {
              const h24 = convertTo24Hour(h, period);
              const hourData = availableByHourAndMinute[h24];
              const hasAvailableSlots = hourData && hourData.slots.some(s => s.available);
              
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleItemClick(hoursForPeriod, h, setHour, hourRef)}
                  disabled={!hasAvailableSlots}
                  className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all ${
                    hour === h ? 'bg-blue-100 text-blue-600' : 
                    !hasAvailableSlots ? 'text-gray-300 cursor-not-allowed' :
                    'text-gray-400 hover:text-gray-500'
                  }`}
                >
                  {h.toString().padStart(2, '0')}
                </button>
              );
            })
          )}
        </div>

        <div className="w-16 h-44 overflow-y-scroll"
          ref={minuteRef}
          onScroll={() => handleScroll(minuteRef, minutesForHour, setMinute)}
          style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none' }}
        >
          {minutesForHour.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-400">No minutes</div>
          ) : (
            minutesForHour.map((m) => {
              const status = getTimeStatus(hour, m, period);
              
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleItemClick(minutesForHour, m, setMinute, minuteRef)}
                  disabled={status.isPast || status.isBooked}
                  className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all relative ${
                    minute === m ? 'bg-blue-100 text-blue-600' : 
                    status.isPast ? 'text-gray-300 cursor-not-allowed' :
                    status.isBooked ? 'text-red-300 cursor-not-allowed' :
                    'text-gray-400 hover:text-gray-500'
                  }`}
                >
                  <span className={status.isBooked ? 'line-through' : ''}>
                    {m.toString().padStart(2, '0')}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="w-16 h-44 overflow-y-scroll"
          ref={periodRef}
          onScroll={() => handleScroll(periodRef, availablePeriods, setPeriod)}
          style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none' }}
        >
          {availablePeriods.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleItemClick(availablePeriods, p, setPeriod, periodRef)}
              className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all ${
                period === p ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
          <span>Past</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
          <span className="line-through">Booked</span>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
          Cancel
        </button>
        <button 
          type="button" 
          onClick={handleConfirm} 
          disabled={(() => {
            const status = getTimeStatus(hour, minute, period);
            return status.isPast || status.isBooked || !status.available;
          })()}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export default function AddBookingForm({ onClose, onBookingCreated }) {
  const [formData, setFormData] = useState({
    location_id: 'g1PhBs8LucuZrpXXOVfwIdzXcFdpvwazyMupP9iH9e59ca39', // CUHK InnoPort (default, locked)
    resource_id: '',
    service_id: '',
    starts_at: '',
    ends_at: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    customer_id: '',
    customer_name: '',
    price: '0.000'
  });
  
  const [locations, setLocations] = useState([]);
  const [resources, setResources] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [validDates, setValidDates] = useState([]);
  const [resourceDetails, setResourceDetails] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const [activeTimePicker, setActiveTimePicker] = useState(null);

  // Load initial data
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoadingData(true);
        setError('');
        
        // Fetch locations
        try {
          const locationsRes = await fetch(`${API_BASE_URL}/viewAllLocations`, {
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!locationsRes.ok) {
            console.error('Failed to fetch locations:', locationsRes.status);
          } else {
            const locationsData = await locationsRes.json();
            const locationsList = Array.isArray(locationsData) ? locationsData : (locationsData.data || []);
            setLocations(locationsList);
          }
        } catch (locErr) {
          console.error('Error fetching locations:', locErr);
        }
        
        // Fetch resources
        try {
          const resourcesRes = await fetch(`${API_BASE_URL}/viewAllresources`, {
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!resourcesRes.ok) {
            throw new Error(`Failed to fetch resources: ${resourcesRes.status}`);
          }
          
          const resourcesData = await resourcesRes.json();
          const resourcesList = Array.isArray(resourcesData) 
            ? resourcesData 
            : (resourcesData.data || []);
          
          setResources(resourcesList);
        } catch (resErr) {
          console.error('Error fetching resources:', resErr);
          throw new Error(`Could not load resources: ${resErr.message}`);
        }
        
        // Load customers
        try {
          await loadCustomers();
        } catch (custErr) {
          console.error('Error loading customers:', custErr);
        }
        
      } catch (err) {
        const errorMessage = err.message || 'Failed to load form data. Please try again.';
        setError(errorMessage);
        console.error('Error loading form data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadFormData();
  }, []);

  // Load customers from Auth0
const loadCustomers = async () => {
  try {
    const config = {
      domain: "bms-optimus.us.auth0.com",
      audience: "https://bms-optimus.us.auth0.com/api/v2/",
      clientId: "x3UIh4PsAjdW1Y0uTmjDUk5VIA36iQ12",
      clientSecret: "xYfZ6lk_kJoLy73sgh3jAY_4U4bMnwm58EjN97Ozw-JcsQTs36JpA2UM4C2xVn-r",
      userRoleId: "rol_FdjheKGmIFxzp6hR"
    };

    const tokenResp = await fetch(`https://${config.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        audience: config.audience,
        grant_type: 'client_credentials',
        scope: 'read:users read:roles'
      })
    });
    
    if (!tokenResp.ok) return;
    
    const { access_token } = await tokenResp.json();
    
    // Fetch ALL users instead of just role users
    const allUsersResp = await fetch(`${config.audience}users`, {
      headers: { 
        Authorization: `Bearer ${access_token}`, 
        'Content-Type': 'application/json' 
      }
    });
    
    if (!allUsersResp.ok) return;
    
    const allUsers = await allUsersResp.json();
    
    // Map all users with proper username extraction
    const customersData = allUsers.map(user => ({
      id: user.user_id,
      name: user.user_metadata?.username || user.username || user.email?.split('@')[0] || 'User',
      email: user.email,
    }));
    
    setCustomers(customersData);
  } catch (error) {
    console.error('Error loading customers:', error);
  }
};

  // Fetch resource details, service ID, and schedule when resource changes
  useEffect(() => {
    const loadResourceData = async () => {
      if (!formData.resource_id) {
        setFormData(prev => ({ ...prev, service_id: '', price: '0.000' }));
        setServiceDetails(null);
        setScheduleBlocks([]);
        setValidDates([]);
        setResourceDetails(null);
        return;
      }
      
      try {
        const selectedResource = resources.find(r => r.id === formData.resource_id);
        if (!selectedResource) return;
        
        // Fetch resource details to get price
        const resourceRes = await fetch(
          `${API_BASE_URL}/viewResource/${encodeURIComponent(selectedResource.name)}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        if (resourceRes.ok) {
          const resourceData = await resourceRes.json();
          const resource = resourceData.data && resourceData.data[0] ? resourceData.data[0] : null;
          
          if (resource) {
            setResourceDetails(resource);
            
            // Extract price from rates
            const rates = resource.metadata?.rates || [];
            if (rates.length > 0 && rates[0].price !== undefined) {
              const price = parseFloat(rates[0].price).toFixed(3);
              setFormData(prev => ({ ...prev, price }));
              console.log('Set price from resource:', price);
            }
          }
        }
        
        // Get service ID for this resource
        const serviceIdRes = await fetch(`${API_BASE_URL}/getServiceIdbyResourceId`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource_id: formData.resource_id })
        });
        
        if (!serviceIdRes.ok) {
          console.error('Failed to get service ID:', serviceIdRes.status);
          throw new Error('Failed to get service ID');
        }
        
        const serviceId = await serviceIdRes.text();
        setFormData(prev => ({ ...prev, service_id: serviceId }));
        
        // Get service details
        const serviceRes = await fetch(`${API_BASE_URL}/getService/${serviceId}`, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (serviceRes.ok) {
          const service = await serviceRes.json();
          setServiceDetails(service);
          
          // Auto-adjust end time based on service duration
          if (service.duration) {
            const durationMinutes = parseDuration(service.duration);
            const endTime = addMinutesToTime(formData.start_time, durationMinutes);
            setFormData(prev => ({ ...prev, end_time: endTime }));
          }
        }
        
        // Get resource schedule blocks
        const scheduleRes = await fetch(
          `${API_BASE_URL}/getResourceScheduleInfo/${encodeURIComponent(selectedResource.name)}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        if (scheduleRes.ok) {
          const scheduleData = await scheduleRes.json();
          const blocks = scheduleData.schedule_blocks || [];
          
          setScheduleBlocks(blocks);
          console.log('Schedule blocks:', blocks);
          
          // Calculate valid dates based on schedule blocks
          calculateValidDates(blocks, scheduleData.recurring_schedule);
        }
        
      } catch (error) {
        console.error('Error loading resource data:', error);
      }
    };
    
    loadResourceData();
  }, [formData.resource_id, resources]);

  // Calculate valid dates based on schedule blocks
  const calculateValidDates = (blocks, recurringSchedule) => {
    if (!blocks || blocks.length === 0) {
      setValidDates([]);
      return;
    }

    const startDate = recurringSchedule?.start_date 
      ? new Date(recurringSchedule.start_date) 
      : new Date();
    const endDate = recurringSchedule?.end_date 
      ? new Date(recurringSchedule.end_date) 
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const validDays = new Set(blocks.map(block => block.weekday.toLowerCase()));
    const dates = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (validDays.has(dayName)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
      }
    }
    
    setValidDates(dates);
  };

  // Load available time slots when resource or date changes
  useEffect(() => {
    const loadAvailableSlots = async () => {
      if (!formData.resource_id || !formData.date || !formData.service_id) {
        setAvailableSlots([]);
        return;
      }

      try {
        setLoadingSlots(true);
        
        // Get all bookings for this resource on this date
        const bookingsRes = await fetch(
          `${API_BASE_URL}/viewFilteredBookings?resource_id=${formData.resource_id}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        const bookingsData = await bookingsRes.json();
        const dayBookings = (bookingsData.data || []).filter(booking => {
          if (!booking.starts_at) return false;
          const bookingDate = new Date(booking.starts_at).toISOString().split('T')[0];
          return bookingDate === formData.date && !booking.is_canceled;
        });
        
        console.log('Day bookings:', dayBookings);
        
        // Get schedule blocks for this weekday
        const selectedDate = new Date(formData.date);
        const weekday = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const dayBlocks = scheduleBlocks.filter(block => block.weekday === weekday);
        
        // Generate time slots based on service interval
        const interval = serviceDetails?.bookable_interval 
          ? parseDuration(serviceDetails.bookable_interval) 
          : (serviceDetails?.duration_step ? parseDuration(serviceDetails.duration_step) : 15);
        
        const slots = [];
        dayBlocks.forEach(block => {
          const [startHour, startMin] = block.start_time.split(':').map(Number);
          const [endHour, endMin] = block.end_time.split(':').map(Number);
          const blockStart = startHour * 60 + startMin;
          const blockEnd = endHour * 60 + endMin;
          
          for (let time = blockStart; time < blockEnd; time += interval) {
            const hour = Math.floor(time / 60);
            const minute = time % 60;
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Check if this slot overlaps with any booking
            // A slot is booked if it starts during an existing booking OR if a booking starts during this slot
            const isBooked = dayBookings.some(booking => {
              // Parse booking times (they come with timezone)
              const bookingStart = new Date(booking.starts_at);
              const bookingEnd = new Date(booking.ends_at);
              
              // Create slot time in the same timezone format
              const slotStartTime = new Date(formData.date + 'T' + timeStr + ':00+08:00');
              
              // Get service duration to calculate slot end time
              const slotDuration = serviceDetails?.duration 
                ? parseDuration(serviceDetails.duration) 
                : interval;
              const slotEndTime = new Date(slotStartTime.getTime() + slotDuration * 60 * 1000);
              
              // Check for any overlap: slot overlaps with booking if:
              // 1. Slot starts before booking ends AND slot ends after booking starts
              const overlaps = slotStartTime < bookingEnd && slotEndTime > bookingStart;
              
              if (overlaps) {
                console.log(`Slot ${timeStr} overlaps with booking ${booking.starts_at} - ${booking.ends_at}`);
              }
              
              return overlaps;
            });
            
            slots.push({ time: timeStr, available: !isBooked });
          }
        });
        
        console.log('Generated slots with availability:', slots);
        setAvailableSlots(slots);
        
      } catch (error) {
        console.error('Error loading available slots:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    loadAvailableSlots();
  }, [formData.resource_id, formData.date, formData.service_id, scheduleBlocks, serviceDetails]);

  // Auto-select first available time slot if current selection is invalid
  useEffect(() => {
    if (availableSlots.length === 0 || !formData.date) return;
    
    // Check if current start time is in the past or unavailable
    const currentTimeIsPast = isTimePast(formData.date, formData.start_time);
    const currentSlot = availableSlots.find(s => s.time === formData.start_time);
    const currentTimeUnavailable = !currentSlot || !currentSlot.available;
    
    if (currentTimeIsPast || currentTimeUnavailable) {
      // Find first available slot that's not in the past
      const firstAvailable = availableSlots.find(slot => {
        return slot.available && !isTimePast(formData.date, slot.time);
      });
      
      if (firstAvailable) {
        console.log('Auto-selecting first available time:', firstAvailable.time);
        setFormData(prev => {
          const newStartTime = firstAvailable.time;
          let newEndTime = prev.end_time;
          
          // Also update end time based on duration
          if (serviceDetails?.duration) {
            const durationMinutes = parseDuration(serviceDetails.duration);
            newEndTime = addMinutesToTime(newStartTime, durationMinutes);
          }
          
          return {
            ...prev,
            start_time: newStartTime,
            end_time: newEndTime
          };
        });
      }
    }
  }, [availableSlots, formData.date, serviceDetails]);

  // AUTO-UPDATE END TIME WHEN START TIME CHANGES
  useEffect(() => {
    if (availableSlots.length === 0 || !formData.date) return;
    
    // Check if end time is before or equal to start time
    if (formData.end_time <= formData.start_time) {
      // Find first available slot after start time
      const firstAvailableAfterStart = availableSlots.find(slot => {
        return slot.time > formData.start_time && slot.available && !isTimePast(formData.date, slot.time);
      });
      
      if (firstAvailableAfterStart) {
        console.log('Auto-updating end time to:', firstAvailableAfterStart.time);
        setFormData(prev => ({
          ...prev,
          end_time: firstAvailableAfterStart.time
        }));
      } else if (serviceDetails?.duration) {
        // Fallback: use duration-based calculation
        const durationMinutes = parseDuration(serviceDetails.duration);
        const calculatedEndTime = addMinutesToTime(formData.start_time, durationMinutes);
        setFormData(prev => ({
          ...prev,
          end_time: calculatedEndTime
        }));
      }
    }
  }, [formData.start_time, availableSlots, formData.date, serviceDetails]);

  

  const addMinutesToTime = (timeString, minutes) => {
    const [hours, mins] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

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

  const validateForm = () => {
    if (!formData.customer_id && !formData.customer_name.trim()) {
      return 'Please select or enter a customer';
    }
    if (!formData.location_id) return 'Please select a location';
    if (!formData.resource_id) return 'Please select a resource';
    if (!formData.date) return 'Please select a date';
    if (!formData.start_time) return 'Please select start time';
    if (!formData.end_time) return 'Please select end time';
    
    if (formData.start_time >= formData.end_time) {
      return 'End time must be after start time';
    }
    
    // Check if selected date is valid
    if (validDates.length > 0 && !validDates.includes(formData.date)) {
      return 'Selected date is not available for this resource';
    }
    
    // Check if start time is available
    const startSlot = availableSlots.find(s => s.time === formData.start_time);
    if (startSlot && !startSlot.available) {
      return 'Selected start time is not available';
    }
    
    // Check if time is in the past
    if (isTimePast(formData.date, formData.start_time)) {
      return 'Cannot book a time in the past';
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
      
      const selectedLocation = locations.find(loc => loc.id === formData.location_id);
      const timezone = selectedLocation?.time_zone || 'Asia/Hong_Kong';
      
      // Format datetime with timezone
      const starts_at = `${formData.date}T${formData.start_time}:00${getTimezoneOffset(timezone)}`;
      const ends_at = `${formData.date}T${formData.end_time}:00${getTimezoneOffset(timezone)}`;
      
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      let customerName = selectedCustomer?.name || formData.customer_name.trim();
      
      // If customerName is an email, convert it to a name format
      if (customerName.includes('@')) {
        customerName = customerName.split('@')[0]
          .replace(/\./g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
      
      const customerEmail = selectedCustomer?.email || formData.customer_name.trim();
      
      const bookingData = {
        resource_id: formData.resource_id,
        service_id: formData.service_id,
        location_id: formData.location_id,
        starts_at,
        ends_at,
        price: formData.price,
        customer_id: customerEmail,
        customer_name: customerName
      };
      
      console.log('Creating booking:', bookingData);
      
      const response = await fetch(`${API_BASE_URL}/createBookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }
      
      if (onBookingCreated) {
        onBookingCreated();
      }
      
    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTimezoneOffset = (timezone) => {
    const offsets = {
      'Asia/Hong_Kong': '+08:00',
      'UTC': '+00:00',
      'America/New_York': '-05:00',
      'Europe/London': '+00:00'
    };
    return offsets[timezone] || '+00:00';
  };

  const isDateDisabled = (dateString) => {
    if (validDates.length === 0) return false;
    return !validDates.includes(dateString);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ fontFamily: 'Inter' }}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Add New Booking</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close form">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              Customer *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => {
                const selectedCustomer = customers.find(c => c.id === e.target.value);
                handleChange('customer_id', e.target.value);
                handleChange('customer_name', selectedCustomer?.name || '');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.email && `(${customer.email})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              Location *
            </label>
            <div className="relative">
              <input
                type="text"
                value="CUHK InnoPort"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                readOnly
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4" />
              Resource *
            </label>
            <select
              value={formData.resource_id}
              onChange={(e) => handleChange('resource_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a resource</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </div>

          {serviceDetails && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <strong>Service:</strong> {serviceDetails.name}
                {serviceDetails.duration && (
                  <span className="ml-2">• Duration: {serviceDetails.duration}</span>
                )}
                {formData.price && formData.price !== '0.000' && (
                  <span className="ml-2">• Price: ${formData.price}</span>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            {validDates.length > 0 && isDateDisabled(formData.date) && (
              <p className="text-xs text-red-600 mt-1">This date is not available for the selected resource</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-time-picker className="relative">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Start time * {loadingSlots && <span className="text-xs text-gray-500">(Loading...)</span>}
              </label>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setActiveTimePicker(activeTimePicker === 'start' ? null : 'start')}
                  disabled={loadingSlots || !formData.resource_id || !formData.date}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-50 text-left font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between disabled:opacity-50"
                >
                  <span>{convertTo12Hour(formData.start_time)}</span>
                  <Clock className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              {activeTimePicker === 'start' && (
                <TimePickerInline
                  value={formData.start_time}
                  onChange={(time) => {
                    handleChange('start_time', time);
                    if (serviceDetails?.duration) {
                      const durationMinutes = parseDuration(serviceDetails.duration);
                      const endTime = addMinutesToTime(time, durationMinutes);
                      handleChange('end_time', endTime);
                    }
                    setActiveTimePicker(null);
                  }}
                  onClose={() => setActiveTimePicker(null)}
                  availableSlots={availableSlots}
                  scheduleBlocks={scheduleBlocks}
                  selectedDate={formData.date}
                  minDuration={serviceDetails?.min_duration ? parseDuration(serviceDetails.min_duration) : 15}
                  maxDuration={serviceDetails?.max_duration ? parseDuration(serviceDetails.max_duration) : 480}
                  interval={serviceDetails?.bookable_interval ? parseDuration(serviceDetails.bookable_interval) : (serviceDetails?.duration_step ? parseDuration(serviceDetails.duration_step) : 15)}
                />
              )}
            </div>

            <div data-time-picker className="relative">
              <label className="text-sm font-medium text-gray-700 mb-2 block">End time *</label>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setActiveTimePicker(activeTimePicker === 'end' ? null : 'end')}
                  disabled={loadingSlots || !formData.resource_id || !formData.date}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-50 text-left font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between disabled:opacity-50"
                >
                  <span>{convertTo12Hour(formData.end_time)}</span>
                  <Clock className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              {activeTimePicker === 'end' && (
                <TimePickerInline
                  value={formData.end_time}
                  onChange={(time) => {
                    handleChange('end_time', time);
                    setActiveTimePicker(null);
                  }}
                  onClose={() => setActiveTimePicker(null)}
                  availableSlots={availableSlots}
                  scheduleBlocks={scheduleBlocks}
                  selectedDate={formData.date}
                  startTime={formData.start_time} 
                  minDuration={serviceDetails?.min_duration ? parseDuration(serviceDetails.min_duration) : 15}
                  maxDuration={serviceDetails?.max_duration ? parseDuration(serviceDetails.max_duration) : 480}
                  interval={serviceDetails?.bookable_interval ? parseDuration(serviceDetails.bookable_interval) : (serviceDetails?.duration_step ? parseDuration(serviceDetails.duration_step) : 15)}
                />
              )}
            </div>
          </div>

          {availableSlots.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                {availableSlots.filter(s => s.available && !isTimePast(formData.date, s.time)).length} time slots available on this date
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || loadingSlots}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
    </div>
  );
}