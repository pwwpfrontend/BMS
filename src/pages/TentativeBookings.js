import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Calendar as CalendarIcon, Clock, MoreHorizontal, User, MapPin, Globe, ChevronRight } from 'lucide-react';

const API_BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

function TentativeBookingRow({ booking, isSelected, onSelect, onNavigateToDetail, onRefresh }) {
  const [showActions, setShowActions] = useState(false);

  const handleConfirm = async (e) => {
    e?.stopPropagation();
    
    if (!confirm('Are you sure you want to confirm this tentative booking?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/updateBooking/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_temporary: false }),
      });

      if (!response.ok) throw new Error('Failed to confirm booking');
      
      onRefresh?.();
    } catch (error) {
      console.error('Error confirming booking:', error);
      alert(`Failed to confirm booking: ${error.message}`);
    }
  };

  const handleCancel = async (e) => {
    e?.stopPropagation();
    
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      const response = await fetch('https://njs-01.optimuslab.space/bms/cancelled-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel booking');
      }
      
      onRefresh?.();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error.message}`);
    }
  };

  const handleDelete = async (e) => {
    e?.stopPropagation();
    
    if (!confirm('Are you sure you want to permanently delete this booking?\n\nThis action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/deleteBooking/${booking.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to delete booking');
      
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert(`Failed to delete booking: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'Asia/Hong_Kong'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'Asia/Hong_Kong'
    });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return '-';
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div 
      className="flex items-center px-4 py-4 border-b hover:bg-gray-50 cursor-pointer transition-colors duration-150"
      style={{ borderColor: '#D3DAE6', minHeight: '89px' }}
      onClick={() => onNavigateToDetail(booking.id)}
      role="button"
      tabIndex={0}
    >
      <div className="w-8 mr-4">
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(booking.id);
          }}
          className="w-4 h-4 rounded border-gray-300"
          style={{ accentColor: '#184AC0' }}
        />
      </div>

      <div className="w-16 h-16 mr-4 flex-shrink-0">
        <div className="w-full h-full bg-yellow-100 rounded-lg flex items-center justify-center">
          <div className="w-12 h-12 bg-yellow-200 rounded flex items-center justify-center text-yellow-700 text-xs">
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
            {formatDate(booking.starts_at)}
          </p>
          <Clock className="w-3 h-3 text-gray-400 ml-2" />
          <p className="text-xs text-gray-600">
            {`${formatTime(booking.starts_at)} - ${formatTime(booking.ends_at)}`}
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
            <p className="text-xs text-gray-500">{booking.metadata?.customer_name || booking.customer_name || booking.customer || 'Unknown'}</p>
          </div>
        </div>
      </div>

      <div className="w-32 mr-4 text-sm text-gray-900">
        {booking.price > 0 ? `$${parseFloat(booking.price).toFixed(2)}` : '-'}
      </div>

      <div className="w-24 mr-4 text-sm text-gray-900">
        {calculateDuration(booking.starts_at, booking.ends_at)}
      </div>

      <div className="w-24 mr-4">
        <span 
          className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
          style={{ backgroundColor: '#EDB02D', color: 'white' }}
        >
          Tentative
        </span>
      </div>

      <div className="w-8 relative">
        <button
          className="p-1 hover:bg-gray-200 rounded"
          onClick={(e) => {
            e.stopPropagation();
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
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToDetail(booking.id);
                }}
              >
                Edit
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                onClick={handleConfirm}
              >
                Confirm Booking
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                onClick={handleCancel}
              >
                Cancel
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

export default function TentativeBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTentativeBookings();
  }, []);

  const fetchTentativeBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/viewAllBookings`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to fetch bookings');
      
      const data = await response.json();
      
      // Filter tentative bookings (is_temporary = true and not cancelled)
      const tentativeBookings = (data.data || data || []).filter(booking => 
        booking.is_temporary === true && !booking.is_canceled && !booking.canceled_at
      );
      
      setBookings(tentativeBookings);
    } catch (err) {
      setError('Failed to fetch tentative bookings');
      console.error('Error fetching tentative bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredBookings = () => {
    if (!searchTerm) return bookings;
    
    const search = searchTerm.toLowerCase();
    return bookings.filter(booking => 
      (booking.resource?.name || '').toLowerCase().includes(search) ||
      (booking.service?.name || '').toLowerCase().includes(search) ||
      (booking.metadata?.customer_name || booking.customer_name || booking.customer || '').toLowerCase().includes(search) ||
      (booking.id || '').toLowerCase().includes(search)
    );
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
      if (action === 'confirm') {
        await Promise.all(selectedBookings.map(bookingId => 
          fetch(`${API_BASE_URL}/updateBooking/${bookingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_temporary: false }),
          })
        ));
      } else if (action === 'delete') {
        await Promise.all(selectedBookings.map(bookingId => 
          fetch(`${API_BASE_URL}/deleteBooking/${bookingId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          })
        ));
      }
      
      setSelectedBookings([]);
      fetchTentativeBookings();
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
                {['date', 'resource', 'duration'].map((sort) => (
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
                  <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => handleBulkAction('confirm')}>Confirm Selected</button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => handleBulkAction('delete')}>Delete Selected</button>
                </div>
              )}
            </div>
          )}
          
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border rounded-md hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export {filteredBookings.length} records
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
            <div className="text-center py-12 text-gray-500">No tentative bookings found</div>
          ) : (
            paginatedBookings.map((booking) => (
              <TentativeBookingRow 
                key={booking.id}
                booking={booking}
                isSelected={selectedBookings.includes(booking.id)}
                onSelect={(id) => setSelectedBookings(prev => 
                  prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                )}
                onNavigateToDetail={(id) => navigate(`/bookings/${id}`)}
                onRefresh={fetchTentativeBookings}
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
    </div>
  );
}