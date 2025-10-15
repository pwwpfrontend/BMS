import React, { useState, useEffect } from 'react';
import { X, Globe, Clock, Plus } from 'lucide-react';
import { 
  formatTimeRange, 
  getUTCOffsetDisplay, 
  DURATION_PRESETS, 
  generateTimeSlots,
  timeStringToDateTime,
  calculateDurationMinutes,
  formatDurationFromMinutes,
  formatTimeInZone
} from '../utils/timezoneHelper';
import bookingAPI from '../services/bookingApi';

/**
 * BookingSidePanel - Right-side panel for creating/editing bookings
 * Matches Figma design with duration presets, timezone display, and form validation
 */
const BookingSidePanel = ({ 
  isOpen, 
  onClose, 
  booking = null, 
  selectedDate = null,
  selectedTimeSlot = null,
  onSave,
  onDelete,
  onNewBooking
}) => {
  // Form state
  const [formData, setFormData] = useState({
    customer: 'Olivia Chan',
    resource_id: '',
    service_id: '',
    location_id: '',
    start_time: '12:00',
    end_time: '12:15',
    date: selectedDate || new Date(),
    all_day: false,
    notes: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resources, setResources] = useState([]);
  const [services, setServices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [showSecondaryTime, setShowSecondaryTime] = useState(false);

  // Time slots for dropdowns
  const timeSlots = generateTimeSlots(0, 24, 15);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Set form data when booking or selected time changes
  useEffect(() => {
    if (booking) {
      // Edit mode
      const roomTz = booking.location?.time_zone || 'UTC';
      setFormData({
        customer: booking.customerName || 'Olivia Chan',
        resource_id: booking.resource?.id || '',
        service_id: booking.service?.id || '',
        location_id: booking.location?.id || '',
        start_time: formatTimeInZone(booking.starts_at, roomTz, 'HH:mm'),
        end_time: formatTimeInZone(booking.ends_at, roomTz, 'HH:mm'),
        date: new Date(booking.starts_at),
        all_day: false,
        notes: booking.notes || ''
      });
      
      const duration = calculateDurationMinutes(booking.starts_at, booking.ends_at);
      setSelectedDuration(duration);
    } else if (selectedTimeSlot) {
      // Create mode with selected time
      setFormData(prev => ({
        ...prev,
        start_time: selectedTimeSlot,
        date: selectedDate || new Date()
      }));
      
      // Auto-set end time based on default duration
      const defaultDuration = 15;
      const endTime = addMinutesToTime(selectedTimeSlot, defaultDuration);
      setFormData(prev => ({
        ...prev,
        end_time: endTime
      }));
      setSelectedDuration(defaultDuration);
    }
  }, [booking, selectedTimeSlot, selectedDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [resourcesRes, servicesRes, locationsRes] = await Promise.all([
        bookingAPI.getResources(),
        bookingAPI.getServices(),
        bookingAPI.getLocations()
      ]);
      
      setResources(resourcesRes.data || []);
      setServices(servicesRes.data || []);
      setLocations(locationsRes.data || []);
      
      // Set defaults if available
      if (resourcesRes.data?.length > 0 && !formData.resource_id) {
        setFormData(prev => ({ ...prev, resource_id: resourcesRes.data[0].id }));
      }
      if (servicesRes.data?.length > 0 && !formData.service_id) {
        setFormData(prev => ({ ...prev, service_id: servicesRes.data[0].id }));
      }
      if (locationsRes.data?.length > 0 && !formData.location_id) {
        setFormData(prev => ({ ...prev, location_id: locationsRes.data[0].id }));
      }
    } catch (err) {
      setError('Failed to load form data');
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addMinutesToTime = (timeString, minutes) => {
    const [hours, mins] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  const handleDurationPresetClick = (duration) => {
    setSelectedDuration(duration);
    const endTime = addMinutesToTime(formData.start_time, duration);
    setFormData(prev => ({ ...prev, end_time: endTime }));
  };

  const handleStartTimeChange = (startTime) => {
    setFormData(prev => ({ ...prev, start_time: startTime }));
    // Auto-update end time based on current duration
    const endTime = addMinutesToTime(startTime, selectedDuration);
    setFormData(prev => ({ ...prev, end_time: endTime }));
  };

  const handleEndTimeChange = (endTime) => {
    setFormData(prev => ({ ...prev, end_time: endTime }));
    // Update selected duration
    const [startHours, startMins] = formData.start_time.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);
    const startTotalMins = startHours * 60 + startMins;
    const endTotalMins = endHours * 60 + endMins;
    const duration = endTotalMins - startTotalMins;
    if (duration > 0) {
      setSelectedDuration(duration);
    }
  };

  const getCurrentTimezone = () => {
    const selectedLocation = locations.find(loc => loc.id === formData.location_id);
    return selectedLocation?.time_zone || 'UTC';
  };

  const getTimeDisplay = () => {
    const timezone = getCurrentTimezone();
    const startISO = timeStringToDateTime(formData.start_time, formData.date, timezone);
    const endISO = timeStringToDateTime(formData.end_time, formData.date, timezone);
    
    return formatTimeRange(startISO, endISO, timezone, showSecondaryTime);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const timezone = getCurrentTimezone();
      const startsAt = timeStringToDateTime(formData.start_time, formData.date, timezone);
      const endsAt = timeStringToDateTime(formData.end_time, formData.date, timezone);

      // Check availability before creating/updating (skip for existing booking updates)
      if (!booking) {
        try {
          const availabilityCheck = await bookingAPI.checkAvailability({
            resource_id: formData.resource_id,
            starts_at: startsAt,
            ends_at: endsAt
          });
          
          if (!availabilityCheck.available) {
            const conflicts = availabilityCheck.conflicts || [];
            const conflictMessage = conflicts.length > 0 
              ? `This time slot conflicts with ${conflicts.length} existing booking(s). Would you like to continue anyway?`
              : 'This time slot is not available. Would you like to continue anyway?';
            
            if (!confirm(conflictMessage)) {
              setLoading(false);
              return;
            }
          }
        } catch (availabilityError) {
          console.warn('Availability check failed, proceeding with booking:', availabilityError);
          // Continue with booking creation even if availability check fails
        }
      }

      const bookingData = {
        resource_id: formData.resource_id,
        service_id: formData.service_id,
        location_id: formData.location_id,
        starts_at: startsAt,
        ends_at: endsAt,
        metadata: {
          email: 'olivia@example.com', // This would come from customer selection
          user_name: formData.customer,
          notes: formData.notes
        },
        is_temporary: false
      };

      if (booking) {
        // Update existing booking
        await bookingAPI.updateBooking(booking.id, bookingData);
      } else {
        // Create new booking
        await bookingAPI.createBooking(bookingData);
      }

      onSave && onSave(bookingData);
      onClose();
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
        await bookingAPI.deleteBooking(booking.id);
        onDelete && onDelete(booking.id);
        onClose();
      } catch (err) {
        setError(err.message || 'Failed to delete booking');
      } finally {
        setLoading(false);
      }
    }
  };

  const timeDisplay = getTimeDisplay();
  const selectedLocation = locations.find(loc => loc.id === formData.location_id);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 bg-white shadow-xl flex flex-col z-40 border-l border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
          {booking ? 'Edit Booking' : 'Create Booking'}
        </h2>
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
      </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                Customer
              </label>
              <select 
                value={formData.customer}
                onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: 'Inter' }}
              >
                <option value="Olivia Chan">Olivia Chan</option>
                {/* Add more customers from API */}
              </select>
            </div>

            {/* Resource */}
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

            {/* Duration Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                Duration
              </label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_PRESETS.map(preset => (
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

            {/* Time Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                  {timeDisplay.primary.start}
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex items-center text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                  {timeDisplay.primary.end}
                </div>
              </div>
              
              {/* Timezone info */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Globe className="w-4 h-4" />
                  <span style={{ fontFamily: 'Inter' }}>
                    {getUTCOffsetDisplay(getCurrentTimezone())} {selectedLocation?.name || 'Unknown Location'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSecondaryTime(!showSecondaryTime)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                  style={{ fontFamily: 'Inter' }}
                >
                  {showSecondaryTime ? 'Hide' : 'Show'} viewer time
                </button>
              </div>

              {/* Secondary time display */}
              {showSecondaryTime && timeDisplay.secondary && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span style={{ fontFamily: 'Inter' }}>Your local:</span>
                    <span style={{ fontFamily: 'Inter' }}>
                      {timeDisplay.secondary.range}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                  Start Time
                </label>
                <select
                  value={formData.start_time}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ fontFamily: 'Inter' }}
                >
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                  End Time
                </label>
                <select
                  value={formData.end_time}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ fontFamily: 'Inter' }}
                >
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                Date
              </label>
              <input
                type="date"
                value={formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: new Date(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: 'Inter' }}
              />
            </div>

            {/* All Day Toggle */}
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

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                Add note
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Time meeting..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: 'Inter' }}
                rows={3}
              />
            </div>
          </form>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          {booking && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
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
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            style={{ fontFamily: 'Inter' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Inter' }}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
    </div>
  );
};

export default BookingSidePanel;