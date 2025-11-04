import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User } from 'lucide-react';
import BookingSidePanel from './BookingSidePanel';

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

// Event Tile Component
function EventTile({ booking, compact, onClick, className = '' }) {
  const getStatusColor = (booking) => {
    if (booking.is_canceled) return '#EF4444';
    if (booking.is_temporary) return '#EDB02D';
    return '#79C485';
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div
      onClick={onClick}
      className={`p-2 rounded text-xs cursor-pointer hover:opacity-90 transition-opacity ${className}`}
      style={{ backgroundColor: getStatusColor(booking), color: 'white' }}
    >
      <div className="font-semibold truncate">
        {booking.resource?.name || 'Unknown Resource'}
      </div>
      {!compact && (
        <>
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            <span>{formatTime(booking.starts_at)} - {formatTime(booking.ends_at)}</span>
          </div>
          {booking.customer_name && (
            <div className="flex items-center gap-1 mt-1">
              <User className="w-3 h-3" />
              <span className="truncate">{booking.customer_name}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function BookingCalendar({ onAddBooking, onSelectBooking }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState('Month');
  
  // Side panel state
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch Auth0 users first
      const userMap = await fetchAuth0Users();
      
      const response = await fetch(`${API_BASE_URL}/viewAllBookings`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to fetch bookings');
      
      const data = await response.json();
      
      // Filter active bookings and map proper usernames
      const activeBookings = (data.data || data || [])
        .filter(booking => !booking.is_canceled && !booking.is_temporary)
        .map(booking => {
          // Extract email from customer_id or customer_name
          let email = booking.customer_id || booking.customer_name;
          
          // If customer_name looks like an email, use it
          if (booking.customer_name && booking.customer_name.includes('@')) {
            email = booking.customer_name;
          }
          
          // Get proper username from Auth0 user map
          const properUsername = email && userMap.has(email) 
            ? userMap.get(email) 
            : (booking.customer_name || 'N/A');
          
          return {
            ...booking,
            customer_name: properUsername
          };
        });
      
      setBookings(activeBookings);
    } catch (err) {
      setError('Failed to fetch bookings');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  const generateCalendarData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = currentDate.getDate();
    
    if (viewType === 'Day') {
      return {
        type: 'day',
        dates: [new Date(year, month, date)],
        timeSlots: Array.from({length: 48}, (_, i) => `${Math.floor(i/2).toString().padStart(2,'0')}:${i%2===0?'00':'30'}`)
      };
    }
    
    if (viewType === 'Week') {
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
      
      const weekDates = Array.from({length: 7}, (_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        return day;
      });
      
      return {
        type: 'week',
        dates: weekDates,
        timeSlots: Array.from({length: 32}, (_, i) => {
          const hour = Math.floor(i/2) + 6;
          return `${hour.toString().padStart(2,'0')}:${i%2===0?'00':'30'}`;
        })
      };
    }
    
    // Month view
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const mondayOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    const days = [];
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = mondayOffset - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonth.getDate() - i), isCurrentMonth: false });
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }
    
    return { type: 'month', days };
  };

  const getBookingsForDate = (date) => {
    if (!date || !bookings.length) return [];
    const dateString = date.toISOString().split('T')[0];
    return bookings.filter(booking => {
      if (!booking.starts_at) return false;
      const bookingDate = new Date(booking.starts_at).toISOString().split('T')[0];
      return bookingDate === dateString;
    }).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  };

  const getBookingsForTimeSlot = (date, timeSlot) => {
    const dayBookings = getBookingsForDate(date);
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotStart = new Date(date);
    slotStart.setHours(hours, minutes, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + 30);
    
    return dayBookings.filter(booking => {
      const bookingStart = new Date(booking.starts_at);
      const bookingEnd = new Date(booking.ends_at);
      return (bookingStart < slotEnd && bookingEnd > slotStart);
    });
  };

  const navigatePeriod = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewType === 'Day') {
        newDate.setDate(prev.getDate() + direction);
      } else if (viewType === 'Week') {
        newDate.setDate(prev.getDate() + (direction * 7));
      } else {
        newDate.setMonth(prev.getMonth() + direction);
      }
      return newDate;
    });
  };

  const getPeriodDisplayText = () => {
    if (viewType === 'Day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (viewType === 'Week') {
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startMonth} - ${endMonth}, ${currentDate.getFullYear()}`;
    } else {
      return formatMonth(currentDate);
    }
  };

  const renderMonthView = (data) => {
    return (
      <div className="flex flex-col h-full">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 flex-shrink-0">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50 border-r border-gray-100 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1 overflow-auto">
          {data.days.map((dayData, index) => {
            const { date, isCurrentMonth } = dayData;
            const dayBookings = getBookingsForDate(date).slice(0, 3);
            const isToday = date.toDateString() === new Date().toDateString();
            
            // Improved date comparison for selection
            const isSelected = selectedDate && (
              date.getFullYear() === (selectedDate instanceof Date ? selectedDate.getFullYear() : new Date(selectedDate).getFullYear()) &&
              date.getMonth() === (selectedDate instanceof Date ? selectedDate.getMonth() : new Date(selectedDate).getMonth()) &&
              date.getDate() === (selectedDate instanceof Date ? selectedDate.getDate() : new Date(selectedDate).getDate())
            );
            
            const hasMore = getBookingsForDate(date).length > 3;
            
            return (
              <div 
                key={index} 
                className={`min-h-[100px] p-2 border-r border-b border-gray-100 last:border-r-0 transition-colors cursor-pointer ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'hover:bg-blue-50 bg-white'
                } ${isToday ? 'bg-blue-50 border-blue-300' : ''} ${
                  isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => {
                  setSelectedDate(new Date(date));
                  setSelectedBooking(null);
                  setSelectedTimeSlot(null);
                  setShowSidePanel(true);
                }}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-blue-600 font-bold' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {date.getDate()}
                </div>
                
                {isCurrentMonth && (
                  <div className="space-y-1">
                    {dayBookings.map((booking) => (
                      <EventTile
                        key={booking.id}
                        booking={booking}
                        compact={true}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(booking);
                          setSelectedDate(new Date(booking.starts_at));
                          setSelectedTimeSlot(null);
                          setShowSidePanel(true);
                        }}
                      />
                    ))}
                    {hasMore && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{getBookingsForDate(date).length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = (data) => {
    return (
      <div className="flex flex-col h-full">
        {/* Day Headers */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <div className="flex">
            <div className="w-16 border-r border-gray-100"></div>
            {data.dates.map((date, index) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
              return (
                <div 
                  key={index} 
                  className={`flex-1 p-3 text-center border-r border-gray-100 last:border-r-0 cursor-pointer hover:bg-blue-50 transition-colors ${
                    isSelected ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedBooking(null);
                    setSelectedTimeSlot(null);
                    setShowSidePanel(true);
                  }}
                >
                  <div className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Slots Grid */}
        <div className="flex-1 overflow-auto">
          {data.timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="flex border-b border-gray-100">
              <div className="w-16 py-4 px-3 text-xs text-gray-500 text-right flex-shrink-0 border-r border-gray-100">
                {timeSlot}
              </div>
              {data.dates.map((date, dateIndex) => {
                const slotBookings = getBookingsForTimeSlot(date, timeSlot);
                return (
                  <div 
                    key={dateIndex}
                    className="flex-1 min-h-[60px] p-1 hover:bg-blue-50 cursor-pointer border-r border-gray-100 last:border-r-0 transition-colors"
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedTimeSlot(timeSlot);
                      setSelectedBooking(null);
                      setShowSidePanel(true);
                    }}
                  >
                    {slotBookings.map((booking) => (
                      <EventTile
                        key={booking.id}
                        booking={booking}
                        compact={true}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(booking);
                          setSelectedDate(new Date(booking.starts_at));
                          setSelectedTimeSlot(null);
                          setShowSidePanel(true);
                        }}
                        className="mb-1"
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = (data) => {
    const date = data.dates[0];
    const isToday = date.toDateString() === new Date().toDateString();

    return (
      <div className="flex flex-col h-full">
        {/* Day Header */}
        <div className="border-b border-gray-200 p-4 text-center flex-shrink-0">
          <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
            {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
          </div>
          <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {date.getDate()}
          </div>
        </div>

        {/* Time Slots */}
        <div className="flex-1 overflow-auto">
          {data.timeSlots.map((timeSlot) => {
            const slotBookings = getBookingsForTimeSlot(date, timeSlot);
            return (
              <div key={timeSlot} className="flex border-b border-gray-100">
                <div className="w-16 py-4 px-3 text-xs text-gray-500 text-right flex-shrink-0 border-r border-gray-100">
                  {timeSlot}
                </div>
                <div 
                  className="flex-1 min-h-[60px] p-2 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedTimeSlot(timeSlot);
                    setSelectedBooking(null);
                    setShowSidePanel(true);
                  }}
                >
                  {slotBookings.map((booking) => (
                    <EventTile
                      key={booking.id}
                      booking={booking}
                      compact={false}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBooking(booking);
                        setSelectedDate(new Date(booking.starts_at));
                        setSelectedTimeSlot(null);
                        setShowSidePanel(true);
                      }}
                      className="mb-1"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSidePanelSave = () => {
    // Refresh bookings after save
    fetchBookings();
    setShowSidePanel(false);
    setSelectedBooking(null);
  };

  const handleSidePanelDelete = () => {
    // Refresh bookings after delete
    fetchBookings();
    setShowSidePanel(false);
    setSelectedBooking(null);
  };

  const handleNewBooking = () => {
    setSelectedBooking(null);
    setSelectedDate(new Date());
    setSelectedTimeSlot(null);
    setShowSidePanel(true);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="text-gray-500">Loading...</div></div>;
  if (error) return <div className="flex justify-center py-12"><div className="text-red-500">{error}</div></div>;

  const calendarData = generateCalendarData();

  return (
    <div className="space-y-6 relative h-full">
      {/* Calendar Container with Side Panel */}
      <div className="bg-white rounded-lg border border-gray-200 flex relative overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Calendar Content - adjust margin for side panel */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ marginRight: showSidePanel ? '384px' : '0' }}>
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => navigatePeriod(-1)} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-semibold">{getPeriodDisplayText()}</h2>
                <button onClick={() => navigatePeriod(1)} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {['Day', 'Week', 'Month'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setViewType(type)}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      viewType === type ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {viewType === 'Month' && renderMonthView(calendarData)}
            {viewType === 'Week' && renderWeekView(calendarData)}
            {viewType === 'Day' && renderDayView(calendarData)}
          </div>
        </div>
        
        {/* Booking Side Panel */}
        {showSidePanel && (
          <BookingSidePanel
            isOpen={showSidePanel}
            onClose={() => setShowSidePanel(false)}
            booking={selectedBooking}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            onSave={handleSidePanelSave}
            onDelete={handleSidePanelDelete}
            onNewBooking={handleNewBooking}
          />
        )}
      </div>
    </div>
  );
}