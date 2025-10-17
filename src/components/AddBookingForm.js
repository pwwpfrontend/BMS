import { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, MapPin, Building, Settings, User } from 'lucide-react';

// Inline Time Picker Component
function TimePickerInline({ value, onChange, onClose }) {
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

  // Scroll selected item to center on mount
  useEffect(() => {
    const scrollToCenter = (ref, items, selectedValue) => {
      if (!ref.current) return;
      const index = items.indexOf(selectedValue);
      const itemHeight = 44; // h-11 = 44px
      const containerHeight = 176; // h-44 = 176px
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

      {/* Time Picker Grid - All columns same height */}
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
          {hours.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => handleItemClick(hours, h, setHour, hourRef)}
              className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all duration-150 ${
                hour === h
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              {h.toString().padStart(2, '0')}
            </button>
          ))}
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
          {minutes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleItemClick(minutes, m, setMinute, minuteRef)}
              className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all duration-150 ${
                minute === m
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              {m.toString().padStart(2, '0')}
            </button>
          ))}
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
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleItemClick(periods, p, setPeriod, periodRef)}
              className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all duration-150 ${
                period === p
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              {p}
            </button>
          ))}
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
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
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
    location_id: 'HK',
    resource_id: '',
    service_id: '',
    date: '',
    start_time: '09:00',
    end_time: '10:00',
    user_name: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTimePicker, setActiveTimePicker] = useState(null); // 'start' or 'end'

  const resources = [
    { id: 'R1', name: 'Conference Room A', max_simultaneous_bookings: 5 },
    { id: 'R2', name: 'Meeting Room B', max_simultaneous_bookings: 3 },
  ];

  const services = [
    { id: 'S1', name: 'Standard Meeting', price: '50.00' },
    { id: 'S2', name: 'Premium Consultation', price: '150.00' },
  ];

  const hongKongLocation = { id: 'HK', name: 'Hong Kong', time_zone: 'Asia/Hong_Kong' };

  const convertTo12Hour = (time24) => {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.user_name.trim()) return 'Please enter your name';
    if (!formData.resource_id) return 'Please select a resource';
    if (!formData.service_id) return 'Please select a service';
    if (!formData.date) return 'Please select a date';
    if (!formData.start_time) return 'Please select start time';
    if (!formData.end_time) return 'Please select end time';

    if (formData.start_time >= formData.end_time) {
      return 'End time must be after start time';
    }

    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('Creating booking:', formData);

      if (onBookingCreated) {
        onBookingCreated(formData);
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Close time picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeTimePicker && !e.target.closest('[data-time-picker]')) {
        setActiveTimePicker(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeTimePicker]);

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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </div>

          {/* Location - Static Hong Kong */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
              {hongKongLocation.name}
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
              onChange={(e) => handleChange('resource_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            >
              <option value="">Select a resource</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} (Max: {resource.max_simultaneous_bookings})
                </option>
              ))}
            </select>
          </div>

          {/* Service Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Settings className="w-4 h-4" />
              Service
            </label>
            <select
              value={formData.service_id}
              onChange={(e) => handleChange('service_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - ${service.price}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              Date
              <span className="text-xs text-gray-500 ml-2">(Asia/Hong_Kong)</span>
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
    </div>
  );
}