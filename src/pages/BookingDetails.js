import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, User } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const API_BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

// Fetch Auth0 users and create a mapping
const fetchAuth0Users = async () => {
  try {
    const config = {
      domain: "bms-optimus.us.auth0.com",
      audience: "https://bms-optimus.us.auth0.com/api/v2/",
      clientId: "x3UIh4PsAjdW1Y0uTmjDUk5VIA36iQ12",
      clientSecret: "xYfZ6lk_kJoLy73sgh3jAY_4U4bMnwm58EjN97Ozw-JcsQTs36JpA2UM4C2xVn-r"
    };

    const tokenResp = await fetch(`https://${config.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        audience: config.audience,
        grant_type: 'client_credentials',
        scope: 'read:users'
      })
    });
    
    if (!tokenResp.ok) return new Map();
    
    const { access_token } = await tokenResp.json();
    const allUsersResp = await fetch(`${config.audience}users`, {
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }
    });
    
    if (!allUsersResp.ok) return new Map();
    
    const allUsers = await allUsersResp.json();
    
    // Create a map: email -> username
    const userMap = new Map();
    allUsers.forEach(user => {
      const username = user.user_metadata?.username || user.username || user.email?.split('@')[0] || 'User';
      userMap.set(user.email, username);
    });
    
    return userMap;
  } catch (error) {
    console.error('Error fetching Auth0 users:', error);
    return new Map();
  }
};


function BookingDetailsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-start gap-6 mb-8">
        <div className="w-16 h-16 bg-gray-300 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-6 bg-gray-300 rounded mb-2 w-3/4"></div>
          <div className="h-5 bg-gray-300 rounded w-1/2"></div>
        </div>
        <div className="w-20 h-4 bg-gray-300 rounded"></div>
      </div>

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

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userMap, setUserMap] = useState(new Map());

  const [notes, setNotes] = useState('');
  const [addNoteToggle, setAddNoteToggle] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [resourceSchedule, setResourceSchedule] = useState(null);

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Hong_Kong'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'Asia/Hong_Kong'
    });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }
    return `${minutes} min`;
  };

  const getStatus = (booking) => {
    if (booking.is_canceled) return 'Cancelled';
    if (booking.is_temporary) return 'Tentative';
    return 'Confirmed';
  };

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

  // Helper function to get hour in Hong Kong timezone
  const getHongKongHour = (dateString) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    // Get the time string in Hong Kong timezone and extract the hour
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Hong_Kong'
    });
    return parseInt(timeStr.split(':')[0]);
  };

  // Helper function to get the weekday name for schedule matching
  const getWeekdayName = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[date.getDay()];
  };

  useEffect(() => {
    const loadData = async () => {
      const auth0UserMap = await fetchAuth0Users();
      setUserMap(auth0UserMap);
      await fetchBookingDetails();
    };
    
    loadData();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/viewBooking/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to fetch booking details');
      
      const data = await response.json();
      setBooking(data);
      setNotes(data.metadata?.notes || '');
      
      // Fetch resource schedule info
      if (data.resource?.name) {
        fetchResourceSchedule(data.resource.name);
      }
    } catch (err) {
      setError(err.message || 'Failed to load booking details');
      console.error('Error fetching booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResourceSchedule = async (resourceName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/getResourceScheduleInfo/${encodeURIComponent(resourceName)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to fetch resource schedule');
      
      const data = await response.json();
      setResourceSchedule(data);
    } catch (err) {
      console.error('Error fetching resource schedule:', err);
      // Don't set error state, just log it - schedule is optional
    }
  };

  const handleApprove = async () => {
    if (!booking) return;
    
    setActionLoading('Approve');
    
    try {
      const response = await fetch(`${API_BASE_URL}/updateBooking/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          is_temporary: false,
          is_canceled: false 
        }),
      });

      if (!response.ok) throw new Error('Failed to approve booking');
      
      await fetchBookingDetails();
      alert('Booking approved successfully');
    } catch (error) {
      console.error('Error approving booking:', error);
      alert(`Failed to approve booking: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkTentative = async () => {
    if (!booking) return;
    
    setActionLoading('Mark Tentative');
    
    try {
      const response = await fetch(`${API_BASE_URL}/updateBooking/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          is_temporary: true,
          is_canceled: false 
        }),
      });

      if (!response.ok) throw new Error('Failed to mark booking as tentative');
      
      await fetchBookingDetails();
      alert('Booking marked as tentative successfully');
    } catch (error) {
      console.error('Error marking tentative:', error);
      alert(`Failed to mark booking as tentative: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    if (!booking) return;

    setActionLoading('Cancel');
    
    try {
      const response = await fetch('https://njs-01.optimuslab.space/bms/cancelled-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel booking');
      }
      
      await fetchBookingDetails();
      alert('Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!booking) return;

    setActionLoading('save');
    
    try {
      const response = await fetch(`${API_BASE_URL}/updateBooking/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          metadata: {
            ...booking.metadata,
            notes: notes
          }
        }),
      });

      if (!response.ok) throw new Error('Failed to save notes');
      
      await fetchBookingDetails();
      alert('Notes saved successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert(`Failed to save notes: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBack = () => {
    navigate('/bookings');
  };

  if (loading) {
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
                  aria-label="Back to bookings"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Bookings
                </button>

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

  if (error) {
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
                  <p className="text-gray-600 mb-4">{error}</p>
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

  if (!booking) return null;

  const status = getStatus(booking);
 // Extract email from booking data
let email = booking.customer_id || booking.customer_name || booking.metadata?.customer_name;

// If customer_name looks like an email, use it
if (booking.customer_name && booking.customer_name.includes('@')) {
  email = booking.customer_name;
} else if (booking.metadata?.customer_name && booking.metadata.customer_name.includes('@')) {
  email = booking.metadata.customer_name;
}

// Get proper username from Auth0 user map
const customerName = email && userMap.has(email) 
  ? userMap.get(email) 
  : (booking.metadata?.customer_name || booking.customer_name || 'Unknown');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FBFBFB' }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar currentPath="/bookings" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors duration-150"
                aria-label="Back to bookings"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Bookings
              </button>

              <div 
                className="bg-white rounded-lg transition-all duration-220 ease-out"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  boxShadow: '0px 0.9px 4px rgba(0,0,0,0.08), 0px 2.6px 8px rgba(0,0,0,0.06), 0px 5.7px 12px rgba(0,0,0,0.05), 0px 15px 15px rgba(0,0,0,0.04)',
                  padding: '24px'
                }}
              >
                {/* Header Section */}
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-16 h-16 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#D3DAE6', borderRadius: '6px' }}
                    >
                      <div className="w-12 h-12 bg-gray-400 rounded flex items-center justify-center text-gray-600 text-xs">
                        Room
                      </div>
                    </div>
                    
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
                        {booking.resource?.name || 'Unknown'} - {booking.service?.name || 'Unknown'}
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
                        {formatDate(booking.starts_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-gray-900">
                      <User className="w-4 h-4" />
                      <span style={{ fontFamily: 'Inter', fontSize: '16px' }}>
                        {customerName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-3" style={{ gap: '32px' }}>
                  {/* Left Column - Main Details */}
                  <div className="col-span-2 space-y-6">
                    {/* Status */}
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
                          ...getStatusStyle(status),
                          borderRadius: '3px',
                          fontSize: '14px',
                          fontWeight: 500,
                          fontFamily: 'Inter'
                        }}
                      >
                        {status}
                      </span>
                    </div>

                    {/* Time Display */}
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
                        {calculateDuration(booking.starts_at, booking.ends_at)}
                      </div>
                    </div>

                    {/* Action Buttons */}
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
                          onClick={handleApprove}
                          disabled={actionLoading === 'Approve' || booking.is_canceled}
                          className="px-4 py-1.5 text-sm font-medium text-white rounded transition-all duration-120 hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          onClick={handleMarkTentative}
                          disabled={actionLoading === 'Mark Tentative' || booking.is_canceled}
                          className="px-4 py-1.5 text-sm font-medium border rounded transition-all duration-120 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

                    {/* Notes Section */}
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
                      
                      <div className="flex gap-3 justify-end mt-3" style={{ width: '70%' }}>
                        <button
                          onClick={handleCancelBooking}
                          disabled={actionLoading === 'Cancel'}
                          className="px-4 py-1.5 text-sm font-medium border rounded transition-all duration-120 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className="px-4 py-1.5 text-sm font-medium text-white rounded transition-all duration-120 hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

                  {/* Right Column - Availability */}
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
                          // Use Hong Kong timezone aware hours
                          const bookingStartHour = getHongKongHour(booking.starts_at);
                          const bookingEndHour = getHongKongHour(booking.ends_at);
                          const bookingWeekday = getWeekdayName(booking.starts_at);
                          
                          // Get schedule blocks for this weekday
                          const scheduleBlocks = resourceSchedule?.schedule_blocks?.filter(
                            block => block.weekday === bookingWeekday
                          ) || [];
                          
                          // Helper to check if an hour is within schedule
                          const isHourAvailable = (hour) => {
                            if (!scheduleBlocks.length) return true; // If no schedule, all hours available
                            
                            return scheduleBlocks.some(block => {
                              const startHour = parseInt(block.start_time.split(':')[0]);
                              const endHour = parseInt(block.end_time.split(':')[0]);
                              return hour >= startHour && hour < endHour;
                            });
                          };
                          
                          const timeSlots = [];
                          
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
                            
                            let isBooked = false;
                            if (bookingStartHour === bookingEndHour) {
                              isBooked = hour === bookingStartHour;
                            } else {
                              isBooked = hour >= bookingStartHour && hour < bookingEndHour;
                            }
                            
                            const isAvailable = isHourAvailable(hour);
                            
                            timeSlots.push({
                              hour,
                              label: timeLabel,
                              isBooked,
                              isAvailable
                            });
                          }
                          
                          return timeSlots.map(({ hour, label, isBooked, isAvailable }) => (
                            <div 
                              key={hour}
                              className="flex items-center gap-3 mb-1"
                              style={{ fontFamily: 'Inter' }}
                            >
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
                              
                              <div 
                                className="flex-1 rounded-sm transition-all duration-200"
                                style={{
                                  backgroundColor: isBooked 
                                    ? '#2563EB' 
                                    : isAvailable 
                                      ? '#F3F4F6' 
                                      : '#E5E7EB',
                                  height: '28px',
                                  border: isBooked 
                                    ? '1px solid #1D4ED8' 
                                    : isAvailable
                                      ? '1px solid #E5E7EB'
                                      : '1px solid #D1D5DB',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  paddingLeft: isBooked ? '8px' : '0',
                                  minWidth: '160px',
                                  opacity: isAvailable ? 1 : 0.5
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