import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, User } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import bookingAPI from '../services/bookingApi';
import { transformBookingForUI, formatTime, formatDate } from '../utils/bookingUtils';

// Analytics helper
const trackEvent = (eventName, properties) => {
  console.log('Analytics:', eventName, properties);
  // TODO: Implement actual analytics tracking
};

// Toast notification helper
const showToast = (message, type = 'success') => {
  // TODO: Implement proper toast notifications
  console.log(`${type.toUpperCase()}: ${message}`);
};

// Loading skeleton component
function BookingDetailsSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-16 h-16 bg-gray-300 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-6 bg-gray-300 rounded mb-2 w-3/4"></div>
          <div className="h-5 bg-gray-300 rounded w-1/2"></div>
        </div>
        <div className="w-20 h-4 bg-gray-300 rounded"></div>
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="h-4 bg-gray-300 rounded w-20"></div>
          <div className="h-20 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded w-16"></div>
          <div className="flex gap-3">
            <div className="h-10 bg-gray-300 rounded w-24"></div>
            <div className="h-10 bg-gray-300 rounded w-32"></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-300 rounded w-24"></div>
          <div className="h-40 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function BookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [addNoteToggle, setAddNoteToggle] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch booking data
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First try to get from cache/context if available
        const cachedBooking = getCachedBooking(bookingId);
        if (cachedBooking) {
          setBooking(cachedBooking);
          setNotes(cachedBooking.notes || '');
          setLoading(false);
          trackEvent('booking_open', { bookingId });
          return;
        }

        // Fetch from API
        const response = await bookingAPI.getAllBookings();
        const foundBooking = response.data.find(b => b.id === bookingId);
        
        if (!foundBooking) {
          setError('notFound');
          setLoading(false);
          return;
        }

        // Cache the fresh data
        localStorage.setItem('bookings_cache', JSON.stringify(response.data));
        
        const transformedBooking = transformBookingForUI(foundBooking);
        setBooking(transformedBooking);
        setNotes(transformedBooking.notes || foundBooking.metadata?.notes || '');
        trackEvent('booking_open', { bookingId });
        
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('fetchError');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  // Get cached booking data from localStorage
  const getCachedBooking = (id) => {
    try {
      const cached = localStorage.getItem('bookings_cache');
      if (cached) {
        const bookings = JSON.parse(cached);
        const booking = bookings.find(b => b.id === id);
        return booking ? transformBookingForUI(booking) : null;
      }
    } catch (err) {
      console.error('Error reading cache:', err);
    }
    return null;
  };

  // Handle action with optimistic updates
  const handleAction = async (action, newStatus) => {
    if (!booking) return;

    setActionLoading(action);
    
    // Optimistic update
    const updatedBooking = { ...booking, status: newStatus };
    setBooking(updatedBooking);

    try {
      // Map UI status to API fields for PATCH /update-booking/:id
      let updateData = {};
      
      if (newStatus === 'Confirmed') {
        updateData = {
          is_canceled: false,
          is_temporary: false
        };
      } else if (newStatus === 'Tentative') {
        updateData = {
          is_canceled: false,
          is_temporary: true
        };
      } else if (newStatus === 'Cancelled') {
        updateData = {
          is_canceled: true,
          is_temporary: false
        };
      }
      
      // Call API with correct field mapping
      await bookingAPI.updateBooking(booking.id, updateData);
      
      // Invalidate cache to force refresh on list page
      localStorage.removeItem('bookings_cache_valid');
      
      // Track and notify
      trackEvent('booking_action', { bookingId, action });
      showToast(`Booking ${action.toLowerCase()} successful`);
      
    } catch (err) {
      // Revert optimistic update
      setBooking(booking);
      showToast(`Failed to ${action.toLowerCase()} booking. Please try again.`, 'error');
      console.error(`Error ${action}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!booking) return;

    setActionLoading('save');
    
    try {
      const updatedBooking = { ...booking, notes };
      
      // Save notes to API using PATCH /update-booking/:id
      // Based on API doc, we can send any subset of booking fields
      const updateData = {
        notes: notes
      };
      
      await bookingAPI.updateBooking(booking.id, updateData);
      
      setBooking(updatedBooking);
      
      // Invalidate cache to force refresh on list page
      localStorage.removeItem('bookings_cache_valid');
      
      trackEvent('booking_action', { bookingId, action: 'save_notes' });
      showToast('Notes saved successfully');
      
    } catch (err) {
      showToast('Failed to save notes. Please try again.', 'error');
      console.error('Error saving notes:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    await handleAction('Cancel', 'Cancelled');
  };


  const handleBack = () => {
    navigate('/bookings', { 
      state: { preserveState: true } 
    });
  };

  // Retry mechanism
  const handleRetry = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FBFBFB' }}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar currentPath="/bookings" />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto">
                {/* Back button */}
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                  aria-label="Back to bookings"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Bookings
                </button>

                {/* Card container */}
                <div 
                  className="bg-white rounded-lg p-6"
                  style={{
                    boxShadow: '0px 0.9px 4px rgba(0,0,0,0.08), 0px 2.6px 8px rgba(0,0,0,0.06), 0px 5.7px 12px rgba(0,0,0,0.05), 0px 15px 15px rgba(0,0,0,0.04)',
                    borderRadius: '6px'
                  }}
                >
                  <BookingDetailsSkeleton />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'notFound') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FBFBFB' }}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar currentPath="/bookings" />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Bookings
                </button>
                
                <div className="bg-white rounded-lg p-8 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking not found</h2>
                  <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist or may have been deleted.</p>
                  <button
                    onClick={handleBack}
                    className="px-4 py-1.5 text-sm font-medium text-white rounded"
                    style={{ backgroundColor: '#184AC0', height: '32px' }}
                  >
                    Back to Bookings
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'fetchError') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FBFBFB' }}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar currentPath="/bookings" />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Bookings
                </button>
                
                <div className="bg-white rounded-lg p-8 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load booking</h2>
                  <p className="text-gray-600 mb-4">There was an error loading the booking details.</p>
                  <button
                    onClick={handleRetry}
                    className="px-4 py-1.5 text-sm font-medium text-white rounded mr-3"
                    style={{ backgroundColor: '#184AC0', height: '32px' }}
                  >
                    Retry
                  </button>
                  <button
                    onClick={handleBack}
                    className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50"
                    style={{ height: '32px' }}
                  >
                    Back to Bookings
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Confirmed':
        return { backgroundColor: '#79C485', color: 'white' };
      case 'Tentative':
        return { backgroundColor: '#EDB02D', color: 'white' };
      case 'Cancelled':
        return { backgroundColor: '#EF4444', color: 'white' };
      default:
        return { backgroundColor: '#EDB02D', color: 'white' };
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FBFBFB' }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar currentPath="/bookings" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              {/* Back button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors duration-150"
                aria-label="Back to bookings"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleBack();
                  }
                }}
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Bookings
              </button>

              {/* Main details card */}
              <div 
                className="bg-white rounded-lg transition-all duration-220 ease-out"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  boxShadow: '0px 0.9px 4px rgba(0,0,0,0.08), 0px 2.6px 8px rgba(0,0,0,0.06), 0px 5.7px 12px rgba(0,0,0,0.05), 0px 15px 15px rgba(0,0,0,0.04)',
                  padding: '24px'
                }}
              >
                {/* Header section */}
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-start gap-4">
                    {/* 64x64 thumbnail */}
                    <div 
                      className="w-16 h-16 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#D3DAE6', borderRadius: '6px' }}
                    >
                      <div className="w-12 h-12 bg-gray-400 rounded flex items-center justify-center text-gray-600 text-xs">
                        Room
                      </div>
                    </div>
                    
                    {/* Title block */}
                    <div>
                      <h1 
                        className="font-semibold mb-2" 
                        style={{ 
                          fontFamily: 'Inter', 
                          fontSize: '24px', 
                          fontWeight: 600, 
                          color: '#000000',
                          lineHeight: '1.2' 
                        }}
                      >
                        {booking.resource.name} - {booking.service.name}
                      </h1>
                      <p 
                        className="font-normal" 
                        style={{ 
                          fontFamily: 'Inter', 
                          fontSize: '20px', 
                          fontWeight: 400, 
                          color: '#000000' 
                        }}
                      >
                        {booking.date}
                      </p>
                    </div>
                  </div>
                  
                  {/* Organizer */}
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-gray-900">
                      <User className="w-4 h-4" />
                      <span style={{ fontFamily: 'Inter', fontSize: '16px' }}>
                        {booking.customer}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main content grid */}
                <div className="grid grid-cols-3" style={{ gap: '32px' }}>
                  {/* Left column (2/3) */}
                  <div className="col-span-2 space-y-6">
                    {/* Status section */}
                    <div>
                      <h3 
                        className="mb-2" 
                        style={{ 
                          fontFamily: 'Inter', 
                          fontSize: '16px', 
                          fontWeight: 500,
                          color: '#000000'
                        }}
                      >
                        Status
                      </h3>
                      <span 
                        className="inline-flex px-3 py-1 text-sm font-medium rounded"
                        style={{
                          ...getStatusStyle(booking.status),
                          borderRadius: '3px',
                          fontSize: '14px',
                          fontWeight: 500,
                          fontFamily: 'Inter'
                        }}
                      >
                        {booking.status}
                      </span>
                    </div>

                    {/* Large time display */}
                    <div className="flex items-start gap-8 py-8">
                      <div className="text-left">
                        <div 
                          className="font-medium mb-2" 
                          style={{ 
                            fontFamily: 'Inter', 
                            fontSize: '28px', 
                            fontWeight: 500, 
                            color: '#3E3E3E' 
                          }}
                        >
                          {formatTime(booking.starts_at)}
                        </div>
                        <div 
                          className="text-sm" 
                          style={{ 
                            fontFamily: 'Inter', 
                            color: '#767070' 
                          }}
                        >
                          {formatDate(booking.starts_at)}
                        </div>
                      </div>
                      <div className="text-2xl text-gray-400" style={{ marginTop: '8px' }}>→</div>
                      <div className="text-left">
                        <div 
                          className="font-medium" 
                          style={{ 
                            fontFamily: 'Inter', 
                            fontSize: '28px', 
                            fontWeight: 500, 
                            color: '#3E3E3E' 
                          }}
                        >
                          {formatTime(booking.ends_at)}
                        </div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <h3 
                        className="mb-2" 
                        style={{ 
                          fontFamily: 'Inter', 
                          fontSize: '16px', 
                          fontWeight: 500 
                        }}
                      >
                        Duration
                      </h3>
                      <div 
                        className="inline-flex px-3 py-1 text-sm bg-white border rounded"
                        style={{ 
                          borderColor: '#B8B8B8', 
                          fontSize: '14px', 
                          fontFamily: 'Inter',
                          boxShadow: '0px 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        {booking.duration}
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <h3 
                        className="mb-3" 
                        style={{ 
                          fontFamily: 'Inter', 
                          fontSize: '16px', 
                          fontWeight: 500 
                        }}
                      >
                        Action
                      </h3>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAction('Approve', 'Confirmed')}
                          disabled={actionLoading === 'Approve'}
                          className="px-4 py-1.5 text-sm font-medium text-white rounded transition-all duration-120 hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
                          style={{ 
                            backgroundColor: '#79C485', 
                            fontSize: '14px', 
                            fontFamily: 'Inter',
                            height: '32px'
                          }}
                          aria-label="Approve booking"
                        >
                          {actionLoading === 'Approve' ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAction('Mark Tentative', 'Tentative')}
                          disabled={actionLoading === 'Mark Tentative'}
                          className="px-4 py-1.5 text-sm font-medium border rounded transition-all duration-120 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                          style={{ 
                            borderColor: '#6E6969', 
                            color: '#6E6969', 
                            backgroundColor: '#FFFFFF', 
                            fontSize: '14px', 
                            fontFamily: 'Inter',
                            height: '32px'
                          }}
                          aria-label="Mark booking as tentative"
                        >
                          {actionLoading === 'Mark Tentative' ? 'Updating...' : 'Mark Tentative'}
                        </button>
                      </div>
                    </div>

                    {/* Notes section */}
                    <div>
                      <div className="flex items-center justify-between mb-3" style={{ width: '70%' }}>
                        <h3 
                          style={{ 
                            fontFamily: 'Inter', 
                            fontSize: '16px', 
                            fontWeight: 500 
                          }}
                        >
                          Add note
                        </h3>
                        <button
                          onClick={() => setAddNoteToggle(!addNoteToggle)}
                          className="relative inline-flex h-8 w-14 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                          style={{ 
                            backgroundColor: addNoteToggle ? '#176DF5' : '#E5E7EB',
                            border: addNoteToggle ? '1px solid #92B0FF' : '1px solid #D1D5DB'
                          }}
                          aria-label={`${addNoteToggle ? 'Hide' : 'Show'} note textarea`}
                          aria-pressed={addNoteToggle}
                        >
                          <span 
                            className="inline-block h-6 w-6 rounded-full bg-white shadow transform ring-0 transition-transform ease-in-out duration-150"
                            style={{ 
                              transform: addNoteToggle ? 'translateX(28px)' : 'translateX(4px)',
                              marginTop: '3px'
                            }}
                          />
                        </button>
                      </div>
                      
                      {addNoteToggle && (
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Customer notes ..."
                          className="px-3 py-2 border-2 rounded text-sm resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 mb-3"
                          style={{
                            backgroundColor: '#F6F6F6',
                            borderColor: '#E4E4E4',
                            borderRadius: '5px',
                            fontSize: '14px',
                            fontFamily: 'Inter',
                            height: '109px',
                            width: '70%'
                          }}
                          aria-label="Booking notes"
                        />
                      )}
                      
                      {/* Cancel and Save buttons - always visible */}
                      <div className="flex gap-3 justify-end mt-3" style={{ width: '70%' }}>
                        <button
                          onClick={handleCancelBooking}
                          disabled={actionLoading === 'Cancel'}
                          className="px-4 py-1.5 text-sm font-medium border rounded transition-all duration-120 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                          style={{ 
                            borderColor: '#AB4444', 
                            color: '#AB4444', 
                            backgroundColor: '#FFFFFF', 
                            fontSize: '14px', 
                            fontFamily: 'Inter',
                            height: '32px'
                          }}
                          aria-label="Cancel booking"
                        >
                          {actionLoading === 'Cancel' ? 'Canceling...' : 'Cancel Booking'}
                        </button>
                        <button
                          onClick={handleSaveNotes}
                          disabled={actionLoading === 'save'}
                          className="px-4 py-1.5 text-sm font-medium text-white rounded transition-all duration-120 hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                          style={{ 
                            backgroundColor: '#184AC0', 
                            fontSize: '14px', 
                            fontFamily: 'Inter',
                            height: '32px'
                          }}
                          aria-label="Save changes"
                        >
                          {actionLoading === 'save' ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right column (1/3) - Availability rail */}
                  <div>
                    <h3 
                      className="mb-4" 
                      style={{ 
                        fontFamily: 'Inter', 
                        fontSize: '16px', 
                        fontWeight: 500 
                      }}
                    >
                      Availability
                    </h3>
                    
                    {/* Scrollable 24-hour container */}
                    <div 
                      className="bg-white border rounded overflow-y-auto"
                      style={{
                        borderColor: '#E5E7EB',
                        height: '400px',
                        width: '250px'
                      }}
                    >
                      <div className="p-3">
                        {(() => {
                          // Generate all 24 hours
                          const bookingStart = new Date(booking.starts_at);
                          const bookingEnd = new Date(booking.ends_at);
                          const bookingStartHour = bookingStart.getHours();
                          const bookingStartMinutes = bookingStart.getMinutes();
                          const bookingEndHour = bookingEnd.getHours();
                          const bookingEndMinutes = bookingEnd.getMinutes();
                          
                          const timeSlots = [];
                          
                          // Create all 24 hour slots (0-23)
                          for (let hour = 0; hour < 24; hour++) {
                            let displayHour, ampm;
                            
                            if (hour === 0) {
                              displayHour = 12;
                              ampm = 'AM';
                            } else if (hour < 12) {
                              displayHour = hour;
                              ampm = 'AM';
                            } else if (hour === 12) {
                              displayHour = 12;
                              ampm = 'PM';
                            } else {
                              displayHour = hour - 12;
                              ampm = 'PM';
                            }
                            
                            const timeLabel = `${displayHour} ${ampm}`;
                            
                            // Check if this hour is within the booking range
                            let isBooked = false;
                            if (bookingStartHour === bookingEndHour) {
                              // Same hour booking
                              isBooked = hour === bookingStartHour;
                            } else {
                              // Multi-hour booking
                              isBooked = hour >= bookingStartHour && hour < bookingEndHour;
                            }
                            
                            timeSlots.push({
                              hour,
                              label: timeLabel,
                              isBooked
                            });
                          }
                          
                          return timeSlots.map(({ hour, label, isBooked }) => (
                            <div 
                              key={hour}
                              className="flex items-center gap-3 mb-1"
                              style={{ fontFamily: 'Inter' }}
                            >
                              {/* Time label */}
                              <span 
                                className="w-12 text-left text-sm"
                                style={{ 
                                  color: '#6B7280',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  flexShrink: 0
                                }}
                              >
                                {label}
                              </span>
                              
                              {/* Time slot bar */}
                              <div 
                                className="flex-1 rounded-sm transition-all duration-200"
                                style={{
                                  backgroundColor: isBooked ? '#2563EB' : '#F3F4F6',
                                  height: '28px',
                                  border: isBooked ? '1px solid #1D4ED8' : '1px solid #E5E7EB',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  paddingLeft: isBooked ? '8px' : '0',
                                  minWidth: '160px'
                                }}
                              >
                                {isBooked && (
                                  <span 
                                    className="text-white font-medium"
                                    style={{ 
                                      fontSize: '11px', 
                                      fontFamily: 'Inter',
                                      letterSpacing: '0.01em'
                                    }}
                                  >
                                    {formatTime(booking.starts_at)} - {formatTime(booking.ends_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}