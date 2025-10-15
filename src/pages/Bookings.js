import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Search, Download, Plus, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Clock, MoreHorizontal, User, MapPin, Globe } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import AddBookingForm from '../components/AddBookingForm';
import BookingStateIndicator from '../components/BookingStateIndicator';
import EventTile from '../pages/EventTitle';
import BookingSidePanel from '../components/BookingSidePanel';
import bookingAPI from '../services/bookingApi';
import { transformBookingForUI, getStatusBadgeClass, formatTime, formatDate, calculateDuration, getCustomerName } from '../utils/bookingUtils';
import { formatTimeInZone } from '../utils/timezoneHelper';
import bookingStateManager from '../utils/bookingStateManager';
import '../utils/bookingDebug'; // Import debug utilities

// Shared booking data hook
const useBookingsData = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);
  const location = useLocation();

  const fetchBookings = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clean up any invalid modified bookings before fetching
      bookingStateManager.cleanupModifiedBookings();
      
      // Check if we have cached data and if cache was invalidated
      const cached = localStorage.getItem('bookings_cache');
      const cacheInvalidated = !localStorage.getItem('bookings_cache_valid');
      
      if (!forceRefresh && cached && !cacheInvalidated) {
        // Use cached data if available and valid
        const cachedBookings = JSON.parse(cached);
        let transformedBookings = cachedBookings
          .map(transformBookingForUI)
          .filter(booking => booking !== null); // Filter out null bookings
        
        // Merge cached bookings with client-side modified bookings
        transformedBookings = bookingStateManager.mergeWithApiBookings(transformedBookings, transformBookingForUI);
        
        setBookings(transformedBookings);
        setLoading(false);
        return;
      }
      
      console.log('🔄 Fetching fresh booking data from API...');
      
      // Fetch fresh data (including cancelled bookings)
      const response = await bookingAPI.getAllBookings(true);
      const apiBookings = response.data
        .map(transformBookingForUI)
        .filter(booking => booking !== null); // Filter out null bookings
      
      console.log(`✅ Fetched ${apiBookings.length} bookings from API`);
      
      // Merge API bookings with client-side modified bookings
      const transformedBookings = bookingStateManager.mergeWithApiBookings(apiBookings, transformBookingForUI);
      
      console.log(`🔄 Final booking list has ${transformedBookings.length} bookings (including modified)`);
      
      // Update cache
      localStorage.setItem('bookings_cache', JSON.stringify(response.data));
      localStorage.setItem('bookings_cache_valid', 'true');
      
      setBookings(transformedBookings);
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

  // Check for cache invalidation when navigating back from details
  useEffect(() => {
    const cacheValid = localStorage.getItem('bookings_cache_valid');
    if (!cacheValid && bookings.length > 0) {
      // Cache was invalidated, refresh data
      fetchBookings(true);
    }
  }, [location.pathname]);

  // Also refresh when window regains focus (user returns from details page)
  useEffect(() => {
    const handleFocus = () => {
      const cacheValid = localStorage.getItem('bookings_cache_valid');
      if (!cacheValid) {
        fetchBookings(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return { 
    bookings, 
    loading, 
    error, 
    refetchBookings: () => fetchBookings(true),
    lastFetch
  };
};

// Individual Booking Row Component
function BookingRow({ booking, isSelected, onSelect, onNavigateToDetail, onRefresh, style }) {
  const [showActions, setShowActions] = useState(false);

  const handleEdit = (e) => {
    e.stopPropagation();
    onNavigateToDetail(booking.id);
  };

  const handleCancel = async (e) => {
    e.stopPropagation();
    
    const action = booking.status === 'Cancelled' ? 'reactivate' : 'cancel';
    const confirmMessage = booking.status === 'Cancelled' 
      ? `Are you sure you want to reactivate this booking?`
      : `Are you sure you want to cancel this booking?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      const updateData = {
        is_canceled: booking.status !== 'Cancelled'
      };
      
      // Update client-side state first
      if (booking.status !== 'Cancelled') {
        bookingStateManager.cancelBooking(booking);
      } else {
        bookingStateManager.reactivateBooking(booking);
      }
      
      try {
        await bookingAPI.updateBooking(booking.id, updateData);
      } catch (apiError) {
        // If API cancellation fails (e.g., past cancellation threshold), handle client-side only
        if (apiError.message.includes('cancellation threshold') || apiError.message.includes('has passed')) {
          console.log('API cancellation failed due to time restrictions, handling client-side only');
          // We already updated the client state above, so just continue
        } else {
          // Re-throw other API errors
          throw apiError;
        }
      }
      
      // Trigger parent component refresh
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      alert(`Failed to ${action} booking: ${error.message}`);
    }
  };

  const handleMarkTentative = async (e) => {
    e.stopPropagation();
    
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
      
      // Update client-side state first
      bookingStateManager.markTentative(booking, updateData.is_temporary);
      
      try {
        await bookingAPI.updateBooking(booking.id, updateData);
      } catch (apiError) {
        // If API update fails due to time restrictions, handle client-side only
        console.warn('API update failed:', apiError.message);
        // We already updated the client state above, so just continue
      }
      
      // Trigger parent component refresh
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      alert(`Failed to ${action} booking: ${error.message}`);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to permanently delete this booking?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    try {
      await bookingAPI.deleteBooking(booking.id);
      
      // Invalidate cache and trigger refresh
      localStorage.removeItem('bookings_cache_valid');
      
      // Trigger parent component refresh
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNavigateToDetail(booking.id);
    }
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
  
  const isModified = bookingStateManager.isBookingModified(booking.id);

  return (
    <div 
      className="flex items-center px-4 py-4 border-b hover:bg-gray-50 cursor-pointer transition-colors duration-150 focus:outline-none focus:bg-blue-50"
      style={{ ...style, borderColor: '#D3DAE6', minHeight: '89px' }}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${booking.resource.name} booking`}
    >
      {/* Checkbox */}
      <div className="w-8 mr-4">
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(booking.id);
          }}
          className="w-4 h-4 rounded border-gray-300 focus:ring-blue-500"
          style={{ accentColor: '#184AC0' }}
        />
      </div>

      {/* Thumbnail */}
      <div className="w-16 h-16 mr-4 flex-shrink-0">
        <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-xs" style={{ fontFamily: 'Inter' }}>
          <div className="w-12 h-12 bg-gray-300 rounded flex items-center justify-center">
            Room
          </div>
        </div>
      </div>

      {/* Resource Info */}
      <div className="flex-1 mr-4 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate" style={{ fontFamily: 'Inter' }}>
            {(booking.resource?.name || 'Unknown Resource')} - {(booking.service?.name || 'Unknown Service')}
          </h3>
        </div>
        
        {/* Date and Time */}
        <div className="flex items-center gap-1 mb-1">
          <CalendarIcon className="w-3 h-3 text-gray-400" />
          <p className="text-xs text-gray-600" style={{ fontFamily: 'Inter' }}>
            {booking.starts_at ? formatDate(booking.starts_at) : 'No date'}
          </p>
          <Clock className="w-3 h-3 text-gray-400 ml-2" />
          <p className="text-xs text-gray-600" style={{ fontFamily: 'Inter' }}>
            {booking.starts_at && booking.ends_at ? `${formatTime(booking.starts_at)} - ${formatTime(booking.ends_at)}` : 'No time'}
          </p>
        </div>
        
        {/* Location and User */}
        <div className="flex items-center gap-4">
          {booking.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter' }}>
                {booking.location.name || 'Unknown location'}
              </p>
              <Globe className="w-3 h-3 text-gray-400 ml-1" />
              <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter' }}>
                {booking.location.time_zone || 'UTC'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter' }}>
              {booking.customerName || 'Unknown User'}
            </p>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="w-32 mr-4 text-sm text-gray-900" style={{ fontFamily: 'Inter' }}>
        {booking.price > 0 ? `$${booking.price.toFixed(2)}` : '-'}
      </div>

      {/* Duration */}
      <div className="w-24 mr-4 text-sm text-gray-900" style={{ fontFamily: 'Inter' }}>
        {booking.duration}
      </div>

      {/* Status */}
      <div className="w-24 mr-4">
        <div className="flex items-center gap-1">
          <span 
            className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
            style={getStatusBadgeStyle(booking.status)}
          >
            {booking.status}
          </span>
          {isModified && (
            <div 
              className="w-2 h-2 bg-orange-400 rounded-full"
              title="Modified locally - changes may not be reflected on server"
            />
          )}
        </div>
      </div>

      {/* Three-dot Actions */}
      <div className="w-8 relative">
        <button
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          aria-label="Booking actions"
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

// Enhanced Bookings List View Component
function BookingsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [currentTab, setCurrentTab] = useState('list'); // 'list', 'calendar', 'cancelled'
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showAddBookingForm, setShowAddBookingForm] = useState(false);
  const navigate = useNavigate();
  const { bookings, loading, error, refetchBookings } = useBookingsData();

  // Navigation handler
  const handleNavigateToDetail = (bookingId) => {
    navigate(`/bookings/${bookingId}`);
  };

  // Filter bookings based on current tab and search
  const getFilteredBookings = () => {
    let filtered = bookings;
    
    
    // Filter by tab
    if (currentTab === 'cancelled') {
      filtered = filtered.filter(booking => {
        return booking.status === 'Cancelled' || booking.is_canceled === true;
      });
    } else if (currentTab === 'list') {
      // For list view, show all non-cancelled bookings
      filtered = filtered.filter(booking => booking.status !== 'Cancelled' && booking.is_canceled !== true);
    }
    
    // Filter by search term
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

  // Sort bookings
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
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const filteredBookings = getFilteredBookings();
  const sortedBookings = getSortedBookings(filteredBookings);
  const totalPages = Math.ceil(sortedBookings.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedBookings = sortedBookings.slice(startIndex, startIndex + pageSize);

  const handleBookingSelect = (bookingId) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === paginatedBookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(paginatedBookings.map(b => b.id));
    }
  };

  const handleExport = () => {
    const recordCount = filteredBookings.length;
    alert(`Exporting ${recordCount} records...`);
    // TODO: Implement actual export functionality
  };

  const handleBulkAction = async (action) => {
    const selectedCount = selectedBookings.length;
    
    if (!confirm(`Are you sure you want to ${action} ${selectedCount} selected bookings?`)) {
      setShowBulkActions(false);
      return;
    }
    
    try {
      if (action === 'cancel') {
        // Get bookings to cancel and update client-side state
        const bookingsToCancel = bookings.filter(booking => selectedBookings.includes(booking.id));
        bookingStateManager.bulkCancelBookings(bookingsToCancel);
        
        // Cancel all selected bookings via API
        const promises = selectedBookings.map(bookingId => 
          bookingAPI.updateBooking(bookingId, { is_canceled: true }).catch(error => {
            console.warn(`Failed to cancel booking ${bookingId} via API:`, error.message);
            // Client-side state is already updated, so continue
          })
        );
        await Promise.all(promises);
      } else if (action === 'delete') {
        // Delete all selected bookings
        const promises = selectedBookings.map(bookingId => 
          bookingAPI.deleteBooking(bookingId)
        );
        await Promise.all(promises);
      }
      
      // Clear selections and refresh
      setSelectedBookings([]);
      bookingStateManager.invalidateCache();
      refetchBookings();
      
      alert(`Successfully ${action === 'cancel' ? 'cancelled' : 'deleted'} ${selectedCount} bookings.`);
      
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      alert(`Failed to ${action} some bookings. Please try again.`);
    }
    
    setShowBulkActions(false);
  };

  const getSortLabel = () => {
    const labels = {
      date: 'Date',
      resource: 'Resource Name', 
      duration: 'Duration',
      status: 'Status'
    };
    return `${labels[sortBy]} ${sortOrder === 'asc' ? '↑' : '↓'}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading bookings...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Booking State Indicator */}
      <BookingStateIndicator onRefresh={refetchBookings} />
      
      {/* Three-state tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center border-b border-gray-200">
          <button 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'list' 
                ? 'border-blue-600 text-blue-600 ' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
            onClick={() => {
              setCurrentTab('list');
              setCurrentPage(1);
            }}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'calendar' 
                ? 'border-blue-600 text-blue-600 bg-white' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
            onClick={() => navigate('/bookings?view=calendar')}
          >
            <CalendarIcon className="w-4 h-4" />
            Calendar View
          </button>
          <button 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'cancelled' 
                ? 'border-blue-600 text-blue-600 bg-white' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
            onClick={() => {
              setCurrentTab('cancelled');
              setCurrentPage(1);
            }}
          >
            Cancelled Bookings
          </button>
        </div>
        
      
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
            >
              Sort: {getSortLabel()}
              <ChevronRight className={`w-4 h-4 transform transition-transform ${showSortDropdown ? 'rotate-90' : ''}`} />
            </button>
            {showSortDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48">
                {['date', 'resource', 'duration', 'status'].map((sort) => (
                  <button
                    key={sort}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 capitalize"
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
                    {sort === 'resource' ? 'Resource Name' : sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              style={{ fontFamily: 'Inter' }}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Bulk Actions */}
          {selectedBookings.length > 0 && (
            <div className="relative">
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                Bulk Actions ({selectedBookings.length})
                <ChevronRight className={`w-4 h-4 transform transition-transform ${showBulkActions ? 'rotate-90' : ''}`} />
              </button>
              {showBulkActions && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => handleBulkAction('cancel')}
                  >
                    Cancel Selected
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => handleBulkAction('delete')}
                  >
                    Delete Selected
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => handleBulkAction('export')}
                  >
                    Export Selected
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Export */}
          <button 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" />
            Export {filteredBookings.length} records
          </button>
          
          {/* Add Booking */}
          <button 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700 transition-colors"
            style={{ backgroundColor: '#184AC0' }}
            onClick={() => setShowAddBookingForm(true)}
          >
            <Plus className="w-4 h-4" />
            Add booking
          </button>
        </div>
      </div>

      {/* Enhanced Bookings Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="border-b" style={{ borderColor: '#D3DAE6' }}>
          <div className="flex items-center px-4 py-3 text-sm font-medium text-gray-600" style={{ fontFamily: 'Inter' }}>
            <div className="w-8 mr-4">
              <input 
                type="checkbox"
                checked={selectedBookings.length === paginatedBookings.length && paginatedBookings.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-gray-300 focus:ring-blue-500"
                style={{ accentColor: '#184AC0' }}
              />
            </div>
            <div className="w-16 mr-4"></div> {/* Thumbnail space */}
            <div className="flex-1 mr-4">Resource</div>
            <div className="w-32 mr-4">Price</div>
            <div className="w-24 mr-4">Duration</div>
            <div className="w-24 mr-4">Status</div>
            <div className="w-8"></div> {/* Actions space */}
          </div>
        </div>

        {/* Table Body */}
        <div>
          {paginatedBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500" style={{ fontFamily: 'Inter' }}>
              {currentTab === 'cancelled' ? 'No cancelled bookings found' : 'No bookings found'}
            </div>
          ) : (
            paginatedBookings.map((booking, index) => (
              <BookingRow 
                key={booking.id}
                booking={booking}
                isSelected={selectedBookings.includes(booking.id)}
                onSelect={handleBookingSelect}
                onNavigateToDetail={handleNavigateToDetail}
                onRefresh={refetchBookings}
                style={{ height: '89px' }}
              />
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700" style={{ fontFamily: 'Inter' }}>
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedBookings.length)} of {sortedBookings.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-sm border border-gray-300 rounded-md ${
                    currentPage === pageNum 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Booking Form Modal */}
      {showAddBookingForm && (
        <AddBookingForm
          onClose={() => setShowAddBookingForm(false)}
          onBookingCreated={(newBooking) => {
            // Clear the booking state manager cache to avoid conflicts with new bookings
            bookingStateManager.clearCache();
            
            // Force a complete refresh of the bookings list
            refetchBookings();
            
            // Close the form
            setShowAddBookingForm(false);
            
            console.log('🔄 New booking added, refreshing list...');
          }}
        />
      )}
    </div>
  );
}

// Enhanced Calendar View Component - Matches Figma Design Exactly with Always-Visible Side Panel
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

  const formatMonth = (date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Generate calendar data based on view type (like Outlook)
  const generateCalendarData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = currentDate.getDate();
    
    if (viewType === 'Day') {
      return {
        type: 'day',
        dates: [new Date(year, month, date)],
        timeSlots: generateTimeSlots(0, 24, 30) // 30-minute intervals for day view
      };
    }
    
    if (viewType === 'Week') {
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Make Monday the first day
      startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
      
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        weekDates.push(day);
      }
      
      return {
        type: 'week',
        dates: weekDates,
        timeSlots: generateTimeSlots(6, 22, 30) // 6 AM to 10 PM for week view
      };
    }
    
    // Month view (default)
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const mondayOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    const days = [];
    
    // Add days from previous month to fill the first week
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = mondayOffset - 1; i >= 0; i--) {
      const day = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    
    // Add days from next month to fill the last week
    const remainingCells = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }
    
    return {
      type: 'month',
      days: days
    };
  };

  const generateTimeSlots = (startHour = 0, endHour = 24, intervalMinutes = 30) => {
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const navigatePeriod = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      
      if (viewType === 'Day') {
        newDate.setDate(prev.getDate() + direction);
      } else if (viewType === 'Week') {
        newDate.setDate(prev.getDate() + (direction * 7));
      } else { // Month
        newDate.setMonth(prev.getMonth() + direction);
      }
      
      return newDate;
    });
  };

  // Get period display text
  const getPeriodDisplayText = () => {
    if (viewType === 'Day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (viewType === 'Week') {
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const year = currentDate.getFullYear();
      
      return `${startMonth} - ${endMonth}, ${year}`;
    } else { // Month
      return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  };

  // Get bookings for specific date
  const getBookingsForDate = (date) => {
    if (!date || !bookings.length) return [];
    
    const dateString = date.toISOString().split('T')[0];
    
    return bookings.filter(booking => {
      if (!booking.starts_at) return false;
      const bookingDate = new Date(booking.starts_at).toISOString().split('T')[0];
      return bookingDate === dateString && booking.status !== 'Cancelled';
    }).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  };

  // Get bookings for specific time slot in day/week view
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

  const handleCellClick = (date, timeSlot = '12:00') => {
    if (!date) return;
    
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
    setSelectedBooking(null);
  };

  const handleEventClick = (booking, e) => {
    if (e) e.stopPropagation();
    setSelectedBooking(booking);
    setSelectedDate(new Date(booking.starts_at));
    const roomTz = booking.location?.time_zone || 'UTC';
    const startTime = formatTimeInZone(booking.starts_at, roomTz, 'HH:mm');
    setSelectedTimeSlot(startTime);
  };

  const handleAddBookingClick = () => {
    setSelectedBooking(null);
    setSelectedDate(new Date());
    setSelectedTimeSlot('12:00');
  };

  const handleTimeSlotClick = (date, timeSlot) => {
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
    setSelectedBooking(null);
  };

  const handleSave = () => {
    refetchBookings();
    // Keep side panel open but reset to create mode
    setSelectedBooking(null);
    setSelectedDate(new Date());
    setSelectedTimeSlot('12:00');
  };

  const handleDelete = () => {
    refetchBookings();
    // Keep side panel open but reset to create mode
    setSelectedBooking(null);
    setSelectedDate(new Date());
    setSelectedTimeSlot('12:00');
  };

  const getSortLabel = () => {
    const labels = {
      date: 'Date',
      resource: 'Resource Name', 
      duration: 'Duration',
      status: 'Status'
    };
    return `${labels[sortBy]} ${sortOrder === 'asc' ? '↑' : '↓'}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading calendar...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  const calendarData = generateCalendarData();

  // Render different calendar views
  const renderCalendarView = () => {
    if (viewType === 'Day') {
      return renderDayView(calendarData);
    } else if (viewType === 'Week') {
      return renderWeekView(calendarData);
    } else {
      return renderMonthView(calendarData);
    }
  };

  // Render Day View (Outlook style)
  const renderDayView = (data) => {
    const date = data.dates[0];
    const dayBookings = getBookingsForDate(date);
    const isToday = date.toDateString() === new Date().toDateString();

    return (
      <div className="flex-1 overflow-hidden">
        {/* Day header */}
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

        {/* Time slots */}
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
                  onClick={() => handleTimeSlotClick(date, timeSlot)}
                >
                  {slotBookings.map((booking) => (
                    <EventTile
                      key={booking.id}
                      booking={booking}
                      compact={false}
                      onClick={() => handleEventClick(booking)}
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

  // Render Week View (Outlook style)
  const renderWeekView = (data) => {
    return (
      <div className="flex-1 overflow-hidden">
        {/* Week header */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex">
            <div className="w-16"></div> {/* Time column header */}
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

        {/* Time slots */}
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
                    onClick={() => handleTimeSlotClick(date, timeSlot)}
                  >
                    {slotBookings.map((booking) => (
                      <EventTile
                        key={booking.id}
                        booking={booking}
                        compact={true}
                        onClick={() => handleEventClick(booking)}
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

  // Render Month View (Outlook style)
  const renderMonthView = (data) => {
    return (
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-px mb-1 border-b border-gray-200">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50" style={{ fontFamily: 'Inter' }}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px" style={{ minHeight: '600px' }}>
          {data.days.map((dayData, index) => {
            const { date, isCurrentMonth } = dayData;
            const dayBookings = getBookingsForDate(date).slice(0, 3); // Limit to 3 for space
            const isToday = date.toDateString() === new Date().toDateString();
            const hasMore = getBookingsForDate(date).length > 3;
            
            return (
              <div 
                key={index} 
                className={`min-h-[120px] p-2 border border-gray-100 transition-colors cursor-pointer ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'
                } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
                onClick={() => handleCellClick(date)}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`} style={{ fontFamily: 'Inter' }}>
                  {date.getDate()}
                </div>
                
                {/* Event Tiles */}
                {isCurrentMonth && (
                  <div className="space-y-1">
                    {dayBookings.map((booking) => (
                      <EventTile
                        key={booking.id}
                        booking={booking}
                        compact={true}
                        onClick={(booking) => handleEventClick(booking)}
                      />
                    ))}
                    
                    {hasMore && (
                      <div className="text-xs text-gray-500 pl-2">
                        +{getBookingsForDate(date).length - 3} more
                      </div>
                    )}
                    
                    {/* Show "All day event" for day 16 as in Figma */}
                    {date.getDate() === 16 && date.getMonth() === currentDate.getMonth() && (
                      <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded" style={{ fontFamily: 'Inter' }}>
                        All day event
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

  return (
    <div className="flex h-full">
      {/* Main Calendar Content */}
      <div className="flex-1 space-y-6 relative"> {/* Make relative for absolute positioning of side panel */}
        {/* Header with tabs - exactly matching Figma */}
        <div className="flex items-center justify-between">
          <div className="flex items-center border-b border-gray-200">
            <button 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
              onClick={() => navigate('/bookings')}
            >
              <List className="w-4 h-4" />
              List View
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600 bg-white">
              <CalendarIcon className="w-4 h-4" />
              Calendar View
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
              onClick={() => navigate('/bookings?tab=cancelled')}
            >
              Cancelled Bookings
            </button>
          </div>
          
          <div className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>
            14:17
          </div>
        </div>

        {/* Toolbar - matching Figma exactly */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
              >
                Sort: {getSortLabel()}
                <ChevronRight className={`w-4 h-4 transform transition-transform ${showSortDropdown ? 'rotate-90' : ''}`} />
              </button>
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48">
                  {['date', 'resource', 'duration', 'status'].map((sort) => (
                    <button
                      key={sort}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 capitalize"
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
                      {sort === 'resource' ? 'Resource Name' : sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                style={{ fontFamily: 'Inter' }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Export */}
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export {bookings.length} records
            </button>
            
            {/* Add Booking */}
            <button 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700 transition-colors"
              style={{ backgroundColor: '#184AC0' }}
              onClick={handleAddBookingClick}
            >
              <Plus className="w-4 h-4" />
              Add booking
            </button>
          </div>
        </div>

        {/* Calendar Container with Side Panel */}
        <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col relative">
          {/* Calendar Header */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0" style={{ marginRight: '384px' }}> {/* Reserve space for side panel */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigatePeriod(-1)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'Inter' }}>
                  {getPeriodDisplayText()}
                </h2>
                <button 
                  onClick={() => navigatePeriod(1)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {['Day', 'Week', 'Month'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setViewType(type)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewType === type 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    style={{ fontFamily: 'Inter' }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Calendar View Content */}
          <div style={{ marginRight: '384px' }}> {/* Reserve space for side panel */}
            {renderCalendarView()}
          </div>
          
          {/* Side Panel - Always Visible, positioned relative to calendar container */}
          <BookingSidePanel
            isOpen={true} // Always open
            onClose={() => {}} // No close action needed
            booking={selectedBooking}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            onSave={handleSave}
            onDelete={handleDelete}
            onNewBooking={handleAddBookingClick}
          />
        </div>
      </div>
    </div>
  );
}

// Individual Booking Detail Component
function BookingDetail() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const { bookings, loading, error } = useBookingsData();
  
  const booking = bookings.find(b => b.id === bookingId);
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading booking details...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }
  
  if (!booking) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Bookings
        </button>
        <div className="text-center py-12">
          <div className="text-red-500">Booking not found</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/bookings')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Bookings
      </button>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center">
              <span className="text-gray-500 text-sm">Room</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
                {booking.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                  {booking.date}
                </span>
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>•</span>
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>{booking.customer}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status and Details */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>Status</h3>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeClass(booking.status)}`} style={{ fontFamily: 'Inter' }}>
                {booking.status}
              </span>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1" style={{ fontFamily: 'Inter' }}>{formatDate(booking.starts_at)}</div>
              <div className="text-sm text-gray-500" style={{ fontFamily: 'Inter' }}>Duration: {booking.duration}</div>
            </div>
          </div>
          
          {/* Time Display */}
          <div className="flex items-center justify-center gap-8 py-8 border border-gray-200 rounded-lg mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>{formatTime(booking.starts_at)}</div>
            </div>
            <div className="text-gray-400">→</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>{formatTime(booking.ends_at)}</div>
            </div>
          </div>
          
          {/* Availability */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3" style={{ fontFamily: 'Inter' }}>Availability</h4>
            <div className="space-y-2">
              {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((hour) => (
                <div key={hour} className="flex items-center justify-between text-sm" style={{ fontFamily: 'Inter' }}>
                  <span className="text-gray-600">{hour} PM</span>
                  <div className={`px-3 py-1 rounded text-xs ${
                    hour === 2 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {hour === 2 ? '2:00 - 2:15 AM' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700" style={{ fontFamily: 'Inter' }}>
              Approve
            </button>
            <button className="px-6 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50" style={{ fontFamily: 'Inter' }}>
              Mark Tentative
            </button>
            <button className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700" style={{ fontFamily: 'Inter' }}>
              Cancel Booking
            </button>
            <button className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700" style={{ fontFamily: 'Inter' }}>
              Save
            </button>
          </div>
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
              <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>Bookings</h1>
              <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Inter' }}>All Booking Details</p>
            </div>
            
            {isCalendarView ? <BookingsCalendar /> : <BookingsList />}
          </div>
        </main>
      </div>
    </div>
  );
}