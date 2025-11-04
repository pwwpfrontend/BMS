import { useState, useEffect, useRef } from 'react';
import { X, Globe, Clock, Plus, AlertCircle } from 'lucide-react';

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
  
  const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const todayOnly = new Date(hkNow.getFullYear(), hkNow.getMonth(), hkNow.getDate());
  
  if (selectedDateOnly < todayOnly) return true;
  if (selectedDateOnly > todayOnly) return false;
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  const nowInMinutes = hkNow.getHours() * 60 + hkNow.getMinutes();
  
  return timeInMinutes <= nowInMinutes;
}

// Format time for display (12-hour format)
const formatTime12Hour = (time24) => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Calculate duration between two times in minutes
const calculateDuration = (startTime, endTime) => {
  const [startHours, startMins] = startTime.split(':').map(Number);
  const [endHours, endMins] = endTime.split(':').map(Number);
  const startTotalMins = startHours * 60 + startMins;
  const endTotalMins = endHours * 60 + endMins;
  return endTotalMins - startTotalMins;
};

// Add minutes to a time string
const addMinutesToTime = (timeString, minutes) => {
  const [hours, mins] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

// Format duration display
const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Get timezone offset display
const getTimezoneOffset = (timezone) => {
  const offsets = {
    'Asia/Hong_Kong': 'UTC+8',
    'UTC': 'UTC',
    'America/New_York': 'UTC-5',
    'Europe/London': 'UTC+0',
    'Asia/Tokyo': 'UTC+9',
    'Australia/Sydney': 'UTC+10'
  };
  return offsets[timezone] || 'UTC';
};

// Time Picker Component with Availability
function TimePickerInline({ value, onChange, onClose, availableSlots = [], scheduleBlocks = [], selectedDate, startTime, interval = 15 }) {
  const getWeekdayForDate = () => {
    if (!selectedDate) return null;
    const date = new Date(selectedDate);
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  };

  const weekday = getWeekdayForDate();

  const getDayScheduleBlocks = () => {
    if (!weekday || !scheduleBlocks || scheduleBlocks.length === 0) return [];
    return scheduleBlocks.filter(block => block.weekday === weekday);
  };

  const dayBlocks = getDayScheduleBlocks();

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
        
        const isPast = isTimePast(selectedDate, timeStr);
        const isBeforeStartTime = startTime && timeStr <= startTime;
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

  const getAvailableHoursAndMinutes = () => {
    if (timeSlots.length === 0) {
      return { hours: [], minutes: [], availableByHourAndMinute: {} };
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

  const getHours12WithPeriods = () => {
    const result = { AM: [], PM: [] };
    
    availableHours24.forEach(h24 => {
      const period = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      result[period].push({ h24, h12 });
    });

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

  useEffect(() => {
    const [h] = value.split(':').map(Number);
    const [, m] = value.split(':').map(Number);
    
    setHour(h % 12 === 0 ? 12 : h % 12);
    setMinute(Math.round(m / interval) * interval);
    setPeriod(h >= 12 ? 'PM' : 'AM');
  }, [value, interval]);

  const hoursForPeriod = period === 'AM' ? hoursAM : hoursPM;
  
  const convertTo24Hour = (h12, p) => {
    let h24 = h12;
    if (p === 'PM' && h12 !== 12) h24 = h12 + 12;
    if (p === 'AM' && h12 === 12) h24 = 0;
    return h24;
  };

  const getMinutesForHour = () => {
    const h24 = convertTo24Hour(hour, period);
    
    if (availableByHourAndMinute[h24]) {
      return Array.from(availableByHourAndMinute[h24].minutes).sort((a, b) => a - b);
    }
    return [];
  };

  const minutesForHour = getMinutesForHour();

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

  useEffect(() => {
    const newMinutesForHour = getMinutesForHour();
    if (newMinutesForHour.length > 0 && !newMinutesForHour.includes(minute)) {
      setMinute(newMinutesForHour[0]);
    }
  }, [hour, period]);

  useEffect(() => {
    if (!startTime) return;
    
    const h24 = convertTo24Hour(hour, period);
    const currentTimeStr = `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const currentSlot = timeSlots.find(s => s.time === currentTimeStr);
    
    if (currentTimeStr <= startTime || !currentSlot || !currentSlot.available) {
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
  }, [startTime, timeSlots]);

  useEffect(() => {
    const scrollToCenter = (ref, items, selectedValue) => {
      if (!ref.current) return;
      const index = items.indexOf(selectedValue);
      if (index === -1) return;
      const itemHeight = 32; // h-8 = 32px
      const containerHeight = 128; // h-32 = 128px
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
    const itemHeight = 32; // h-8 = 32px
    const containerHeight = 128; // h-32 = 128px
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
      const itemHeight = 32; // h-8 = 32px
      const containerHeight = 128; // h-32 = 128px
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

  if (timeSlots.length === 0 || availableHours24.length === 0) {
    return (
      <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-3 mt-2 z-50">
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-gray-700 mb-1">No available time slots</p>
          <p className="text-[10px] text-gray-500">
            {weekday ? `Not available on ${weekday}s` : 'Select a different date'}
          </p>
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-200 mt-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-3 mt-2 z-50">
      <div className="flex justify-center gap-4 mb-2">
        <div className="w-12 text-center">
          <p className="text-[10px] font-semibold text-gray-500 uppercase">Hour</p>
        </div>
        <div className="w-12 text-center">
          <p className="text-[10px] font-semibold text-gray-500 uppercase">Min</p>
        </div>
        <div className="w-12 text-center">
          <p className="text-[10px] font-semibold text-gray-500 uppercase">AM/PM</p>
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-3">
        <div className="w-12 h-32 overflow-y-scroll border border-gray-200 rounded"
          ref={hourRef}
          onScroll={() => handleScroll(hourRef, hoursForPeriod, setHour)}
          style={{ scrollBehavior: 'smooth', scrollbarWidth: 'thin' }}
        >
          {hoursForPeriod.length === 0 ? (
            <div className="text-center py-2 text-[10px] text-gray-400">None</div>
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
                  className={`w-full h-8 flex items-center justify-center text-sm font-medium rounded transition-all ${
                    hour === h ? 'bg-blue-100 text-blue-600' : 
                    !hasAvailableSlots ? 'text-gray-300 cursor-not-allowed' :
                    'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {h.toString().padStart(2, '0')}
                </button>
              );
            })
          )}
        </div>

        <div className="w-12 h-32 overflow-y-scroll border border-gray-200 rounded"
          ref={minuteRef}
          onScroll={() => handleScroll(minuteRef, minutesForHour, setMinute)}
          style={{ scrollBehavior: 'smooth', scrollbarWidth: 'thin' }}
        >
          {minutesForHour.length === 0 ? (
            <div className="text-center py-2 text-[10px] text-gray-400">None</div>
          ) : (
            minutesForHour.map((m) => {
              const status = getTimeStatus(hour, m, period);
              
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleItemClick(minutesForHour, m, setMinute, minuteRef)}
                  disabled={status.isPast || status.isBooked}
                  className={`w-full h-8 flex items-center justify-center text-sm font-medium rounded transition-all ${
                    minute === m ? 'bg-blue-100 text-blue-600' : 
                    status.isPast ? 'text-gray-300 cursor-not-allowed' :
                    status.isBooked ? 'text-red-300 cursor-not-allowed' :
                    'text-gray-700 hover:bg-gray-50'
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

        <div className="w-12 h-32 overflow-y-scroll border border-gray-200 rounded"
          ref={periodRef}
          onScroll={() => handleScroll(periodRef, availablePeriods, setPeriod)}
          style={{ scrollBehavior: 'smooth', scrollbarWidth: 'thin' }}
        >
          {availablePeriods.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleItemClick(availablePeriods, p, setPeriod, periodRef)}
              className={`w-full h-8 flex items-center justify-center text-sm font-medium rounded transition-all ${
                period === p ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-600 justify-center flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-blue-100 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-white border border-gray-400 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-gray-200 rounded"></div>
          <span>Past</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-red-100 rounded"></div>
          <span className="line-through text-[9px]">Booked</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button 
          type="button" 
          onClick={onClose} 
          className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button 
          type="button" 
          onClick={handleConfirm} 
          disabled={(() => {
            const status = getTimeStatus(hour, minute, period);
            return status.isPast || status.isBooked || !status.available;
          })()}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export default function BookingSidePanel({ 
  isOpen, 
  onClose, 
  booking = null, 
  selectedDate = null,
  selectedTimeSlot = null,
  onSave,
  onDelete,
  onNewBooking
}) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_id: '',
    resource_id: '',
    service_id: '',
    location_id: 'g1PhBs8LucuZrpXXOVfwIdzXcFdpvwazyMupP9iH9e59ca39',
    start_time: '12:00',
    end_time: '13:00',
    date: new Date().toISOString().split('T')[0],
    all_day: false,
    notes: '',
    price: '0'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resources, setResources] = useState([]);
  const [locations, setLocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [activeTimePicker, setActiveTimePicker] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [validDates, setValidDates] = useState([]);
  const [resourceDetails, setResourceDetails] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [durationPresets, setDurationPresets] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (booking) {
      const startDate = new Date(booking.starts_at);
      const endDate = new Date(booking.ends_at);
      const startTime = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      
      setFormData({
        customer_name: booking.customer_name || booking.customer || '',
        customer_id: booking.customer_id || '',
        resource_id: booking.resource?.id || '',
        service_id: booking.service?.id || '',
        location_id: 'g1PhBs8LucuZrpXXOVfwIdzXcFdpvwazyMupP9iH9e59ca39',
        start_time: startTime,
        end_time: endTime,
        date: startDate.toISOString().split('T')[0],
        all_day: false,
        notes: booking.notes || booking.metadata?.notes || '',
        price: booking.price || '0'
      });
      
      const duration = calculateDuration(startTime, endTime);
      setSelectedDuration(duration);
    } else if (selectedDate || selectedTimeSlot) {
      let dateToUse = new Date();
      
      if (selectedDate) {
        dateToUse = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
      }
      
      const year = dateToUse.getFullYear();
      const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
      const day = String(dateToUse.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      const timeToUse = selectedTimeSlot || formData.start_time || '12:00';
      const defaultDuration = selectedDuration || 60;
      const endTime = addMinutesToTime(timeToUse, defaultDuration);
      
      setFormData(prev => ({
        ...prev,
        start_time: timeToUse,
        end_time: endTime,
        date: formattedDate
      }));
      
      if (!selectedDuration) {
        setSelectedDuration(defaultDuration);
      }
    }
  }, [booking, selectedTimeSlot, selectedDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      const locationsRes = await fetch(`${API_BASE_URL}/viewAllLocations`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        setLocations(locationsData.data || []);
      }
      
      setFormData(prev => ({ 
        ...prev, 
        location_id: 'g1PhBs8LucuZrpXXOVfwIdzXcFdpvwazyMupP9iH9e59ca39' 
      }));
      
      const resourcesRes = await fetch(`${API_BASE_URL}/viewAllresources`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json();
        setResources(resourcesData.data || []);
      }
      
      await loadCustomers();
      
    } catch (err) {
      setError('Failed to load form data');
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load customers - SAME AS AddBookingForm (ALL users, not just role users)
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
        setFormData(prev => ({ ...prev, service_id: '', price: '0' }));
        setServiceDetails(null);
        setScheduleBlocks([]);
        setValidDates([]);
        setResourceDetails(null);
        setDurationPresets([]);
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
            
            const rates = resource.metadata?.rates || [];
            if (rates.length > 0 && rates[0].price !== undefined) {
              const price = parseFloat(rates[0].price).toFixed(3);
              setFormData(prev => ({ ...prev, price }));
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
          
          // Generate duration presets based on service details
          const minDuration = service.min_duration ? parseDuration(service.min_duration) : 15;
          const maxDuration = service.max_duration ? parseDuration(service.max_duration) : 480;
          const interval = service.bookable_interval 
            ? parseDuration(service.bookable_interval) 
            : (service.duration_step ? parseDuration(service.duration_step) : 15);
          
          const presets = [];
          for (let duration = minDuration; duration <= maxDuration; duration += interval) {
            if (duration < 60) {
              presets.push({ label: `${duration} min`, value: duration });
            } else {
              const hours = Math.floor(duration / 60);
              const mins = duration % 60;
              presets.push({ 
                label: mins > 0 ? `${hours}h ${mins}m` : `${hours}h`, 
                value: duration 
              });
            }
            // Limit to 8 presets for UI
            if (presets.length >= 8) break;
          }
          
          setDurationPresets(presets);
          
          // Auto-adjust end time based on service duration
          if (service.duration) {
            const durationMinutes = parseDuration(service.duration);
            const endTime = addMinutesToTime(formData.start_time, durationMinutes);
            setFormData(prev => ({ ...prev, end_time: endTime }));
            setSelectedDuration(durationMinutes);
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
          calculateValidDates(blocks, scheduleData.recurring_schedule);
        }
        
      } catch (error) {
        console.error('Error loading resource data:', error);
      }
    };
    
    loadResourceData();
  }, [formData.resource_id, resources]);

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
        
        const selectedDate = new Date(formData.date);
        const weekday = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const dayBlocks = scheduleBlocks.filter(block => block.weekday === weekday);
        
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
            
            const isBooked = dayBookings.some(booking => {
              const bookingStart = new Date(booking.starts_at);
              const bookingEnd = new Date(booking.ends_at);
              
              const slotStartTime = new Date(formData.date + 'T' + timeStr + ':00+08:00');
              
              const slotDuration = serviceDetails?.duration 
                ? parseDuration(serviceDetails.duration) 
                : interval;
              const slotEndTime = new Date(slotStartTime.getTime() + slotDuration * 60 * 1000);
              
              const overlaps = slotStartTime < bookingEnd && slotEndTime > bookingStart;
              
              return overlaps;
            });
            
            slots.push({ time: timeStr, available: !isBooked });
          }
        });
        
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
    
    const currentTimeIsPast = isTimePast(formData.date, formData.start_time);
    const currentSlot = availableSlots.find(s => s.time === formData.start_time);
    const currentTimeUnavailable = !currentSlot || !currentSlot.available;
    
    if (currentTimeIsPast || currentTimeUnavailable) {
      const firstAvailable = availableSlots.find(slot => {
        return slot.available && !isTimePast(formData.date, slot.time);
      });
      
      if (firstAvailable) {
        setFormData(prev => {
          const newStartTime = firstAvailable.time;
          let newEndTime = prev.end_time;
          
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
    
    if (formData.end_time <= formData.start_time) {
      const firstAvailableAfterStart = availableSlots.find(slot => {
        return slot.time > formData.start_time && slot.available && !isTimePast(formData.date, slot.time);
      });
      
      if (firstAvailableAfterStart) {
        setFormData(prev => ({
          ...prev,
          end_time: firstAvailableAfterStart.time
        }));
      } else if (serviceDetails?.duration) {
        const durationMinutes = parseDuration(serviceDetails.duration);
        const calculatedEndTime = addMinutesToTime(formData.start_time, durationMinutes);
        setFormData(prev => ({
          ...prev,
          end_time: calculatedEndTime
        }));
      }
    }
  }, [formData.start_time, availableSlots, formData.date, serviceDetails]);

  const handleDurationPresetClick = (duration) => {
    setSelectedDuration(duration);
    const endTime = addMinutesToTime(formData.start_time, duration);
    setFormData(prev => ({ ...prev, end_time: endTime }));
  };

  const handleStartTimeChange = (startTime) => {
    setFormData(prev => ({ ...prev, start_time: startTime }));
    const endTime = addMinutesToTime(startTime, selectedDuration);
    setFormData(prev => ({ ...prev, end_time: endTime }));
  };

  const handleEndTimeChange = (endTime) => {
    setFormData(prev => ({ ...prev, end_time: endTime }));
    const duration = calculateDuration(formData.start_time, endTime);
    if (duration > 0) {
      setSelectedDuration(duration);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const selectedLocation = locations.find(loc => loc.id === formData.location_id) || {
        id: '8bb404de-500e-4615-8751-ab333e57ccda',
        name: 'CUHK InnoPort',
        time_zone: 'Asia/Hong_Kong'
      };
      const timezone = selectedLocation?.time_zone || 'Asia/Hong_Kong';
      
      const starts_at = `${formData.date}T${formData.start_time}:00+08:00`;
      const ends_at = `${formData.date}T${formData.end_time}:00+08:00`;
      
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      let customerName = selectedCustomer?.name || formData.customer_name.trim();
      
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
        price: formData.price || "0.000",
        customer_id: customerEmail,
        customer_name: customerName,
        metadata: {
          notes: formData.notes
        }
      };

      if (booking) {
        const response = await fetch(`${API_BASE_URL}/updateBooking/${booking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) throw new Error('Failed to update booking');
        
        setSuccess(true);
        setTimeout(() => {
          onSave && onSave();
          onClose();
        }, 1500);
      } else {
        const response = await fetch(`${API_BASE_URL}/createBookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create booking');
        }
        
        setSuccess(true);
        setTimeout(() => {
          onSave && onSave();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Failed to save booking');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!booking) return;
    
    if (confirm('Are you sure you want to delete this booking?')) {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/deleteBooking/${booking.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Failed to delete booking');
        
        onDelete && onDelete();
        onClose();
      } catch (err) {
        setError(err.message || 'Failed to delete booking');
      } finally {
        setLoading(false);
      }
    }
  };

  const selectedLocation = locations.find(loc => loc.id === formData.location_id) || {
    id: '8bb404de-500e-4615-8751-ab333e57ccda',
    name: 'CUHK InnoPort',
    time_zone: 'Asia/Hong_Kong'
  };
  const currentDuration = calculateDuration(formData.start_time, formData.end_time);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 bg-white shadow-xl flex flex-col z-40 border-l border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
          {booking ? 'Edit Booking' : 'Create Booking'}
        </h2>
        <div className="flex items-center gap-2">
          {booking && (
            <button
              onClick={() => onNewBooking && onNewBooking()}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="New booking"
              title="Create new booking"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{booking ? 'Booking updated successfully!' : 'Booking created successfully!'}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
              Customer
            </label>
            <select 
              value={formData.customer_id}
              onChange={(e) => {
                const customer = customers.find(c => c.id === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  customer_id: e.target.value,
                  customer_name: customer?.name || ''
                }));
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontFamily: 'Inter' }}
              required
            >
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.email && `(${customer.email})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
              Location
            </label>
            <select
              value={formData.location_id}
              onChange={(e) => setFormData(prev => ({ ...prev, location_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 cursor-not-allowed"
              style={{ fontFamily: 'Inter' }}
              required
              disabled
            >
              <option value="8bb404de-500e-4615-8751-ab333e57ccda">
                CUHK InnoPort
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
              Resource
            </label>
            <select
              value={formData.resource_id}
              onChange={(e) => setFormData(prev => ({ ...prev, resource_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontFamily: 'Inter' }}
              required
            >
              <option value="">Select Resource</option>
              {resources.map(resource => (
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

          {durationPresets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                Duration
              </label>
              <div className="flex gap-2 flex-wrap">
                {durationPresets.map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleDurationPresetClick(preset.value)}
                    className={`px-3 py-2 text-xs rounded-full border transition-colors ${
                      selectedDuration === preset.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    style={{ fontFamily: 'Inter' }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                {formatTime12Hour(formData.start_time)}
              </div>
              <div className="text-gray-400">→</div>
              <div className="flex items-center text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                {formatTime12Hour(formData.end_time)}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Globe className="w-4 h-4" />
                <span style={{ fontFamily: 'Inter' }}>
                  {getTimezoneOffset(selectedLocation?.time_zone || 'Asia/Hong_Kong')} {selectedLocation?.name || 'CUHK InnoPort'}
                </span>
              </div>
              <span className="text-gray-500" style={{ fontFamily: 'Inter' }}>
                {formatDuration(currentDuration)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontFamily: 'Inter' }}
              required
            />
            {formData.date && (
              <p className="text-xs text-gray-500 mt-1">
                {new Date(formData.date + 'T00:00:00').toLocaleDateString('en-GB', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                Start time {loadingSlots && <span className="text-xs text-gray-500">(Loading...)</span>}
              </label>
              <button
                type="button"
                onClick={() => setActiveTimePicker(activeTimePicker === 'start' ? null : 'start')}
                disabled={loadingSlots || !formData.resource_id || !formData.date}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-500 hover:bg-gray-50 text-left font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between disabled:opacity-50"
              >
                <span>{formatTime12Hour(formData.start_time)}</span>
                <Clock className="w-4 h-4 text-gray-400" />
              </button>
              {activeTimePicker === 'start' && (
                <div className="absolute left-0 right-0 z-50">
                  <TimePickerInline
                    value={formData.start_time}
                    onChange={(time) => {
                      handleStartTimeChange(time);
                      setActiveTimePicker(null);
                    }}
                    onClose={() => setActiveTimePicker(null)}
                    availableSlots={availableSlots}
                    scheduleBlocks={scheduleBlocks}
                    selectedDate={formData.date}
                    interval={serviceDetails?.bookable_interval ? parseDuration(serviceDetails.bookable_interval) : (serviceDetails?.duration_step ? parseDuration(serviceDetails.duration_step) : 15)}
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                End time
              </label>
              <button
                type="button"
                onClick={() => setActiveTimePicker(activeTimePicker === 'end' ? null : 'end')}
                disabled={loadingSlots || !formData.resource_id || !formData.date}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-500 hover:bg-gray-50 text-left font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between disabled:opacity-50"
              >
                <span>{formatTime12Hour(formData.end_time)}</span>
                <Clock className="w-4 h-4 text-gray-400" />
              </button>
              {activeTimePicker === 'end' && (
                <div className="absolute left-0 right-0 z-50">
                  <TimePickerInline
                    value={formData.end_time}
                    onChange={(time) => {
                      handleEndTimeChange(time);
                      setActiveTimePicker(null);
                    }}
                    onClose={() => setActiveTimePicker(null)}
                    availableSlots={availableSlots}
                    scheduleBlocks={scheduleBlocks}
                    selectedDate={formData.date}
                    startTime={formData.start_time}
                    interval={serviceDetails?.bookable_interval ? parseDuration(serviceDetails.bookable_interval) : (serviceDetails?.duration_step ? parseDuration(serviceDetails.duration_step) : 15)}
                  />
                </div>
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={formData.all_day}
              onChange={(e) => setFormData(prev => ({ ...prev, all_day: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="allDay" className="text-sm text-gray-700" style={{ fontFamily: 'Inter' }}>
              All day event
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
              Add note
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add booking notes..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontFamily: 'Inter' }}
              rows={3}
            />
          </div>
        </form>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
        {booking && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || success}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
            style={{ fontFamily: 'Inter' }}
          >
            Delete
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          disabled={loading || success}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          style={{ fontFamily: 'Inter' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={loading || success}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Inter' }}
        >
          {success ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </span>
          ) : loading ? (
            'Saving...'
          ) : (
            'Save'
          )}
        </button>
      </div>
    </div>
  );
}