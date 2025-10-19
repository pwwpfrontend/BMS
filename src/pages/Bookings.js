import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Download, Plus, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Clock, MoreHorizontal, User, MapPin, Globe } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import AddBookingForm from '../components/AddBookingForm';
import EventTile from '../pages/EventTitle';
import BookingSidePanel from '../components/BookingSidePanel';
import bookingAPI from '../services/bookingApi';
import { transformBookingForUI, getStatusBadgeClass, formatTime, formatDate, calculateDuration, getCustomerName } from '../utils/bookingUtils';
import { formatTimeInZone } from '../utils/timezoneHelper';

// Shared booking data hook - Pure API version
const useBookingsData = () => {
  const [bookings, setBookings] = useState([]);
  const [cancelledBookings, setCancelledBookings] = useState([]);
  const [tentativeBookings, setTentativeBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      
      
      // Fetch all bookings
      const response = await bookingAPI.getAllBookings(true);
      
      // Fetch cancelled booking IDs
      const cancelledResponse = await fetch('https://njs-01.optimuslab.space/bms/cancelled-meeting', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      let cancelledBookingIds = [];
      if (cancelledResponse.ok) {
        const cancelledData = await cancelledResponse.json();
        cancelledBookingIds = cancelledData
          .map(item => item.booking_id)
          .filter(id => id);
      }
      
      
      
      // Transform and separate bookings
      const allTransformedBookings = response.data
        .map(transformBookingForUI)
        .filter(booking => booking !== null);
      
      const activeBookings = [];
      const cancelled = [];
      
      allTransformedBookings.forEach(booking => {
        if (cancelledBookingIds.includes(booking.id)) {
          cancelled.push({ ...booking, status: 'Cancelled', is_canceled: true });
        } else if (!booking.is_canceled) {
          activeBookings.push(booking);
        }
      });
      
      // Add demo tentative meetings data - must match the structure expected by transformBookingForUI
      const tentative = [
        {
          id: 'tentative-001',
          title: 'Weekly Team Sync',
          customer: 'John Smith',
          customerName: 'John Smith',
          customerEmail: 'john.smith@example.com',
          resource: { name: 'Conference Room A' },
          service: { name: 'Meeting Room Booking' },
          location: { name: 'Main Office', address: '123 Business St' },
          starts_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          ends_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour duration
          status: 'Tentative',
          is_tentative: true,
          is_canceled: false,
          is_temporary: true,
          notes: 'Awaiting confirmation from team members',
          metadata: { notes: 'Awaiting confirmation from team members' },
          price: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'tentative-002',
          title: 'Client Presentation Review',
          customer: 'Sarah Johnson',
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah.johnson@company.com',
          resource: { name: 'Meeting Room B' },
          service: { name: 'Presentation Room Booking' },
          location: { name: 'Main Office', address: '123 Business St' },
          starts_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(), // 1.5 hour duration
          status: 'Tentative',
          is_tentative: true,
          is_canceled: false,
          is_temporary: true,
          notes: 'Pending client availability confirmation',
          metadata: { notes: 'Pending client availability confirmation' },
          price: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setBookings(activeBookings);
      setCancelledBookings(cancelled);
      setTentativeBookings(tentative);
      setLastFetch(Date.now());
    } catch (err) {
      setError('Failed to fetch bookings');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return { 
    bookings, 
    cancelledBookings,
    tentativeBookings,
    loading, 
    error, 
    refetchBookings: fetchBookings,
    lastFetch
  };
};

// Individual Booking Row Component
function BookingRow({ booking, isSelected, onSelect, onNavigateToDetail, onRefresh, style }) {
  const [showActions, setShowActions] = useState(false);

  const handleEdit = (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    onNavigateToDetail(booking.id);
  };

  const handleCancel = async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    
    const action = booking.status === 'Cancelled' ? 'reactivate' : 'cancel';
    const confirmMessage = booking.status === 'Cancelled' 
      ? `Are you sure you want to reactivate this booking?`
      : `Are you sure you want to cancel this booking?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      if (booking.status !== 'Cancelled') {
        // Cancel booking using cancelled-meeting API
        const response = await fetch('https://njs-01.optimuslab.space/bms/cancelled-meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: booking.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to cancel booking');
        }
      } else {
        // Reactivate: Delete from cancelled-meeting API (if endpoint exists) or update original booking
        await bookingAPI.updateBooking(booking.id, { is_canceled: false });
      }
      
      // Refresh from API
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      alert(`Failed to ${action} booking: ${error.message}`);
    }
  };

  const handleMarkTentative = async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    
    const action = booking.status === 'Tentative' ? 'confirm' : 'mark as tentative';
    const confirmMessage = booking.status === 'Tentative' 
      ? `Are you sure you want to confirm this tentative booking?`
      : `Are you sure you want to mark this booking as tentative?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      const updateData = {
        is_temporary: booking.status !== 'Tentative'
      };
      
      await bookingAPI.updateBooking(booking.id, updateData);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      alert(`Failed to ${action} booking: ${error.message}`);
    }
  };

  const handleDelete = async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    
    if (!confirm(`Are you sure you want to permanently delete this booking?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    try {
      await bookingAPI.deleteBooking(booking.id);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert(`Failed to delete booking: ${error.message}`);
    }
  };

  const handleRowClick = () => {
    onNavigateToDetail(booking.id);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Confirmed':
        return { backgroundColor: '#79C485', color: 'white' };
      case 'Tentative':
        return { backgroundColor: '#EDB02D', color: 'white' };
      case 'Cancelled':
        return { backgroundColor: '#EF4444', color: 'white' };
      default:
        return { backgroundColor: '#6B7280', color: 'white' };
    }
  };

  return (
    <div 
      className="flex items-center px-4 py-4 border-b hover:bg-gray-50 cursor-pointer transition-colors duration-150"
      style={{ ...style, borderColor: '#D3DAE6', minHeight: '89px' }}
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
    >
      <div className="w-8 mr-4">
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            onSelect(booking.id);
          }}
          className="w-4 h-4 rounded border-gray-300"
          style={{ accentColor: '#184AC0' }}
        />
      </div>

      <div className="w-16 h-16 mr-4 flex-shrink-0">
        <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="w-12 h-12 bg-gray-300 rounded flex items-center justify-center text-gray-600 text-xs">
            Room
          </div>
        </div>
      </div>

      <div className="flex-1 mr-4 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
          {booking.resource?.name || 'Unknown'} - {booking.service?.name || 'Unknown'}
        </h3>
        
        <div className="flex items-center gap-1 mb-1">
          <CalendarIcon className="w-3 h-3 text-gray-400" />
          <p className="text-xs text-gray-600">
            {booking.starts_at ? formatDate(booking.starts_at) : 'No date'}
          </p>
          <Clock className="w-3 h-3 text-gray-400 ml-2" />
          <p className="text-xs text-gray-600">
            {booking.starts_at && booking.ends_at ? `${formatTime(booking.starts_at)} - ${formatTime(booking.ends_at)}` : 'No time'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {booking.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500">{booking.location.name || 'Unknown'}</p>
              <Globe className="w-3 h-3 text-gray-400 ml-1" />
              <p className="text-xs text-gray-500">{booking.location.time_zone || 'UTC'}</p>
            </div>
          )}
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500">{booking.customerName || 'Unknown'}</p>
          </div>
        </div>
      </div>

      <div className="w-32 mr-4 text-sm text-gray-900">
        {booking.price > 0 ? `$${booking.price.toFixed(2)}` : '-'}
      </div>

      <div className="w-24 mr-4 text-sm text-gray-900">
        {booking.duration}
      </div>

      <div className="w-24 mr-4">
        <span 
          className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
          style={getStatusBadgeStyle(booking.status)}
        >
          {booking.status}
        </span>
      </div>

      <div className="w-8 relative">
        <button
          className="p-1 hover:bg-gray-200 rounded"
          onClick={(e) => {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            setShowActions(!showActions);
          }}
        >
          <MoreHorizontal className="w-4 h-4 text-gray-500" />
        </button>
        
        {showActions && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowActions(false)}
            />
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-40">
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={handleEdit}
              >
                Edit
              </button>
              {booking.status !== 'Cancelled' && (
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                  onClick={handleMarkTentative}
                >
                  {booking.status === 'Tentative' ? 'Confirm Booking' : 'Mark Tentative'}
                </button>
              )}
              <button
                className="block w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                onClick={handleCancel}
              >
                {booking.status === 'Cancelled' ? 'Reactivate' : 'Cancel'}
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Bookings List View
function BookingsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [currentTab, setCurrentTab] = useState('list');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showAddBookingForm, setShowAddBookingForm] = useState(false);
  const navigate = useNavigate();
  const { bookings, cancelledBookings, tentativeBookings, loading, error, refetchBookings } = useBookingsData();

  const getFilteredBookings = () => {
    let filtered = currentTab === 'cancelled' ? cancelledBookings : 
                  currentTab === 'tentative' ? tentativeBookings : bookings;
    
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        (booking.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.resource?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.id || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getSortedBookings = (bookingsToSort) => {
    return [...bookingsToSort].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'resource':
          aValue = (a.resource?.name || '').toLowerCase();
          bValue = (b.resource?.name || '').toLowerCase();
          break;
        case 'duration':
          aValue = a.ends_at && a.starts_at ? new Date(a.ends_at) - new Date(a.starts_at) : 0;
          bValue = b.ends_at && b.starts_at ? new Date(b.ends_at) - new Date(b.starts_at) : 0;
          break;
        case 'status':
          aValue = (a.status || '').toLowerCase();
          bValue = (b.status || '').toLowerCase();
          break;
        case 'date':
        default:
          aValue = a.starts_at ? new Date(a.starts_at) : new Date(0);
          bValue = b.starts_at ? new Date(b.starts_at) : new Date(0);
          break;
      }
      
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });
  };

  const filteredBookings = getFilteredBookings();
  const sortedBookings = getSortedBookings(filteredBookings);
  const totalPages = Math.ceil(sortedBookings.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedBookings = sortedBookings.slice(startIndex, startIndex + pageSize);

  const handleBulkAction = async (action) => {
    if (!confirm(`${action} ${selectedBookings.length} bookings?`)) {
      setShowBulkActions(false);
      return;
    }
    
    try {
      if (action === 'cancel') {
        await Promise.all(selectedBookings.map(bookingId => 
          fetch('https://njs-01.optimuslab.space/bms/cancelled-meeting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: bookingId }),
          })
        ));
      } else if (action === 'delete') {
        await Promise.all(selectedBookings.map(bookingId => 
          bookingAPI.deleteBooking(bookingId)
        ));
      }
      
      setSelectedBookings([]);
      refetchBookings();
      alert(`Successfully ${action}ed bookings`);
    } catch (error) {
      alert(`Failed to ${action} bookings`);
    }
    
    setShowBulkActions(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="text-gray-500">Loading...</div></div>;
  if (error) return <div className="flex justify-center py-12"><div className="text-red-500">{error}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center border-b border-gray-200">
          <button 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => { setCurrentTab('list'); setCurrentPage(1); }}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            onClick={() => navigate('/bookings?view=calendar')}
          >
            <CalendarIcon className="w-4 h-4" />
            Calendar View
          </button>
          <button 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'cancelled' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => { setCurrentTab('cancelled'); setCurrentPage(1); }}
          >
            Cancelled Bookings
          </button>
          <button 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'tentative' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => { setCurrentTab('tentative'); setCurrentPage(1); }}
          >
            Tentative Meetings
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
            >
              Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} {sortOrder === 'asc' ? '↑' : '↓'}
              <ChevronRight className={`w-4 h-4 transform ${showSortDropdown ? 'rotate-90' : ''}`} />
            </button>
            {showSortDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 min-w-48">
                {['date', 'resource', 'duration', 'status'].map((sort) => (
                  <button
                    key={sort}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => {
                      if (sortBy === sort) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(sort);
                        setSortOrder('desc');
                      }
                      setShowSortDropdown(false);
                    }}
                  >
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-64"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedBookings.length > 0 && (
            <div className="relative">
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border rounded-md hover:bg-gray-50"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                Bulk Actions ({selectedBookings.length})
              </button>
              {showBulkActions && (
                <div className="absolute top-full right-0 mt-1 bg-white border rounded-md shadow-lg z-10 min-w-48">
                  <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => handleBulkAction('cancel')}>Cancel Selected</button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => handleBulkAction('delete')}>Delete Selected</button>
                </div>
              )}
            </div>
          )}
          
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border rounded-md hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export {filteredBookings.length} records
          </button>
          
          <button 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700"
            style={{ backgroundColor: '#184AC0' }}
            onClick={() => setShowAddBookingForm(true)}
          >
            <Plus className="w-4 h-4" />
            Add booking
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="border-b">
          <div className="flex items-center px-4 py-3 text-sm font-medium text-gray-600">
            <div className="w-8 mr-4">
              <input 
                type="checkbox"
                checked={selectedBookings.length === paginatedBookings.length && paginatedBookings.length > 0}
                onChange={() => {
                  if (selectedBookings.length === paginatedBookings.length) {
                    setSelectedBookings([]);
                  } else {
                    setSelectedBookings(paginatedBookings.map(b => b.id));
                  }
                }}
                className="w-4 h-4 rounded"
                style={{ accentColor: '#184AC0' }}
              />
            </div>
            <div className="w-16 mr-4"></div>
            <div className="flex-1 mr-4">Resource</div>
            <div className="w-32 mr-4">Price</div>
            <div className="w-24 mr-4">Duration</div>
            <div className="w-24 mr-4">Status</div>
            <div className="w-8"></div>
          </div>
        </div>

        <div>
          {paginatedBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {currentTab === 'cancelled' ? 'No cancelled bookings found' : 'No bookings found'}
            </div>
          ) : (
            paginatedBookings.map((booking) => (
              <BookingRow 
                key={booking.id}
                booking={booking}
                isSelected={selectedBookings.includes(booking.id)}
                onSelect={(id) => setSelectedBookings(prev => 
                  prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                )}
                onNavigateToDetail={(id) => navigate(`/bookings/${id}`)}
                onRefresh={refetchBookings}
              />
            ))
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedBookings.length)} of {sortedBookings.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-sm border rounded-md ${
                    currentPage === pageNum ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showAddBookingForm && (
        <AddBookingForm
          onClose={() => setShowAddBookingForm(false)}
          onBookingCreated={() => {
            refetchBookings();
            setShowAddBookingForm(false);
          }}
        />
      )}
    </div>
  );
}

// Calendar View Component
function BookingsCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState('Month');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('12:00');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const { bookings, loading, error, refetchBookings } = useBookingsData();

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
      return bookingDate === dateString && booking.status !== 'Cancelled';
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
      <div className="p-6">
        <div className="grid grid-cols-7 gap-px mb-1 border-b border-gray-200">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-px" style={{ minHeight: '600px' }}>
          {data.days.map((dayData, index) => {
            const { date, isCurrentMonth } = dayData;
            const dayBookings = getBookingsForDate(date).slice(0, 3);
            const isToday = date.toDateString() === new Date().toDateString();
            const hasMore = getBookingsForDate(date).length > 3;
            
            return (
              <div 
                key={index} 
                className={`min-h-[120px] p-2 border border-gray-100 transition-colors cursor-pointer ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'
                } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedBooking(null);
                }}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
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
                          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                          setSelectedBooking(booking);
                          setSelectedDate(new Date(booking.starts_at));
                        }}
                      />
                    ))}
                    {hasMore && (
                      <div className="text-xs text-gray-500 pl-2">
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
      <div className="flex-1 overflow-hidden">
        <div className="border-b border-gray-200 px-6">
          <div className="flex">
            <div className="w-16"></div>
            {data.dates.map((date, index) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={index} className="flex-1 p-3 text-center border-l border-gray-200">
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

        <div className="overflow-y-auto px-6" style={{ height: 'calc(100vh - 350px)' }}>
          {data.timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="flex border-b border-gray-100">
              <div className="w-16 py-4 px-3 text-xs text-gray-500 text-right">
                {timeSlot}
              </div>
              {data.dates.map((date, dateIndex) => {
                const slotBookings = getBookingsForTimeSlot(date, timeSlot);
                return (
                  <div 
                    key={dateIndex}
                    className="flex-1 min-h-[60px] p-1 hover:bg-gray-50 cursor-pointer border-l border-gray-200"
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedTimeSlot(timeSlot);
                      setSelectedBooking(null);
                    }}
                  >
                    {slotBookings.map((booking) => (
                      <EventTile
                        key={booking.id}
                        booking={booking}
                        compact={true}
                        onClick={(e) => {
                          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                          setSelectedBooking(booking);
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
      <div className="flex-1 overflow-hidden">
        <div className="border-b border-gray-200 p-6">
          <div className="text-center">
            <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
              {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
            </div>
            <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
              {date.getDate()}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-6" style={{ height: 'calc(100vh - 350px)' }}>
          {data.timeSlots.map((timeSlot) => {
            const slotBookings = getBookingsForTimeSlot(date, timeSlot);
            return (
              <div key={timeSlot} className="flex border-b border-gray-100">
                <div className="w-16 py-4 px-3 text-xs text-gray-500 text-right">
                  {timeSlot}
                </div>
                <div 
                  className="flex-1 min-h-[60px] p-2 hover:bg-gray-50 cursor-pointer border-l border-gray-200"
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedTimeSlot(timeSlot);
                    setSelectedBooking(null);
                  }}
                >
                  {slotBookings.map((booking) => (
                    <EventTile
                      key={booking.id}
                      booking={booking}
                      compact={false}
                      onClick={(e) => {
                        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                        setSelectedBooking(booking);
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

  if (loading) return <div className="flex justify-center py-12"><div className="text-gray-500">Loading...</div></div>;
  if (error) return <div className="flex justify-center py-12"><div className="text-red-500">{error}</div></div>;

  const calendarData = generateCalendarData();

  return (
    <div className="flex h-full">
      <div className="flex-1 space-y-6 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center border-b border-gray-200">
            <button 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900"
              onClick={() => navigate('/bookings')}
            >
              <List className="w-4 h-4" />
              List View
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600">
              <CalendarIcon className="w-4 h-4" />
              Calendar View
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900"
              onClick={() => navigate('/bookings?tab=cancelled')}
            >
              Cancelled Bookings
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900"
              onClick={() => navigate('/bookings?tab=tentative')}
            >
              Tentative Meetings
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border rounded-md hover:bg-gray-50"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
              >
                Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md text-sm w-64"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border rounded-md hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export {bookings.length} records
            </button>
            
            <button 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700"
              style={{ backgroundColor: '#184AC0' }}
              onClick={() => {
                setSelectedBooking(null);
                setSelectedDate(new Date());
              }}
            >
              <Plus className="w-4 h-4" />
              Add booking
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col relative">
          <div className="p-6 border-b border-gray-200 flex-shrink-0" style={{ marginRight: '384px' }}>
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
          
          <div style={{ marginRight: '384px' }}>
            {viewType === 'Month' && renderMonthView(calendarData)}
            {viewType === 'Week' && renderWeekView(calendarData)}
            {viewType === 'Day' && renderDayView(calendarData)}
          </div>
          
          <BookingSidePanel
            isOpen={true}
            onClose={() => {}}
            booking={selectedBooking}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            onSave={refetchBookings}
            onDelete={refetchBookings}
            onNewBooking={() => setSelectedBooking(null)}
          />
        </div>
      </div>
    </div>
  );
}

export default function Bookings() {
  const location = useLocation();
  const isCalendarView = location.pathname.includes('/bookings') && location.search.includes('view=calendar');
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar currentPath="/bookings" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6 h-full">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
              <p className="text-sm text-gray-500 mt-1">All Booking Details</p>
            </div>
            
            {isCalendarView ? <BookingsCalendar /> : <BookingsList />}
          </div>
        </main>
      </div>
      
    </div>
  );
}
