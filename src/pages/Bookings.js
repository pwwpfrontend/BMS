import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { List, Calendar as CalendarIcon, Download, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import BookingList from './BookingsList';
import BookingCalendar from './BookingsCalendar';
import CancelledBookings from './CancelledBookings';
import TentativeBookings from './TentativeBookings';
import AddBookingForm from './AddBookingForm';

export default function Bookings() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAddBookingForm, setShowAddBookingForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // Parse current tab from URL
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'list';
  const view = searchParams.get('view') || 'list';

  const handleTabChange = (tab) => {
    if (tab === 'calendar') {
      navigate('/bookings?view=calendar');
    } else if (tab === 'cancelled') {
      navigate('/bookings?tab=cancelled');
    } else if (tab === 'tentative') {
      navigate('/bookings?tab=tentative');
    } else {
      navigate('/bookings');
    }
  };

  const handleAddBooking = () => {
    setShowAddBookingForm(true);
  };

  const handleBookingCreated = () => {
    setShowAddBookingForm(false);
    // Optionally refresh the current view
    window.location.reload();
  };

  const renderTopActions = () => {
    return (
      <div className="flex items-center gap-3">
        <button 
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700"
          style={{ backgroundColor: '#184AC0' }}
          onClick={handleAddBooking}
        >
          <Plus className="w-4 h-4" />
          Add booking
        </button>
      </div>
    );
  };

  const renderContent = () => {
    if (view === 'calendar') {
      return (
        <BookingCalendar 
          onAddBooking={handleAddBooking}
          onSelectBooking={setSelectedBooking}
        />
      );
    }

    if (currentTab === 'cancelled') {
      return <CancelledBookings />;
    }

    if (currentTab === 'tentative') {
      return <TentativeBookings />;
    }

    // Default to list view
    return <BookingList onAddBooking={handleAddBooking} />;
  };

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

            {/* Tab Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center border-b border-gray-200">
                <button 
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    currentTab === 'list' && view !== 'calendar' 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => handleTabChange('list')}
                >
                  <List className="w-4 h-4" />
                  List View
                </button>
                <button 
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    view === 'calendar' 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => handleTabChange('calendar')}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Calendar View
                </button>
                <button 
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    currentTab === 'cancelled' 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => handleTabChange('cancelled')}
                >
                  Cancelled Bookings
                </button>
                <button 
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    currentTab === 'tentative' 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => handleTabChange('tentative')}
                >
                  Tentative Meetings
                </button>
              </div>
            </div>
            
            {/* Content Area */}
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Add Booking Modal */}
      {showAddBookingForm && (
        <AddBookingForm
          onClose={() => setShowAddBookingForm(false)}
          onBookingCreated={handleBookingCreated}
        />
      )}
    </div>
  );
}