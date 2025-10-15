import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Plus } from 'lucide-react';
import bookingAPI from '../services/bookingApi';

export default function ScheduleManager({ resourceId, resourceName, onClose }) {
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('blocks');
  const [showAddBlock, setShowAddBlock] = useState(false);
  
  const [newBlock, setNewBlock] = useState({
    location_id: '',
    starts_at: '',
    ends_at: ''
  });

  // Load schedules
  useEffect(() => {
    const loadSchedules = async () => {
      if (!resourceId) return;
      
      try {
        setLoading(true);
        const [blocksRes, recurringRes] = await Promise.all([
          bookingAPI.getScheduleBlocks(resourceId),
          bookingAPI.getRecurringSchedules(resourceId)
        ]);
        
        setScheduleBlocks(blocksRes.data || []);
        setRecurringSchedules(recurringRes.data || []);
      } catch (error) {
        console.error('Error loading schedules:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [resourceId]);

  // Add schedule block
  const handleAddBlock = async (e) => {
    e.preventDefault();
    
    try {
      const response = await bookingAPI.createScheduleBlock(resourceId, newBlock);
      setScheduleBlocks(prev => [...prev, response]);
      setNewBlock({ location_id: '', starts_at: '', ends_at: '' });
      setShowAddBlock(false);
    } catch (error) {
      console.error('Error creating schedule block:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading schedules...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Schedule for {resourceName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('blocks')}
            className={`px-6 py-3 font-medium ${activeTab === 'blocks' 
              ? 'border-b-2 border-blue-600 text-blue-600' 
              : 'text-gray-500'}`}
          >
            Schedule Blocks ({scheduleBlocks.length})
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-6 py-3 font-medium ${activeTab === 'recurring' 
              ? 'border-b-2 border-blue-600 text-blue-600' 
              : 'text-gray-500'}`}
          >
            Recurring Schedules ({recurringSchedules.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'blocks' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Schedule Blocks</h3>
                <button
                  onClick={() => setShowAddBlock(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Block
                </button>
              </div>

              {scheduleBlocks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No schedule blocks found</p>
                  <p className="text-sm">Add a schedule block to allow bookings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduleBlocks.map((block) => (
                    <div key={block.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {new Date(block.starts_at).toLocaleDateString()} - {new Date(block.ends_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(block.starts_at).toLocaleTimeString()} - {new Date(block.ends_at).toLocaleTimeString()}
                          </p>
                          <p className={`text-sm mt-2 ${block.is_available ? 'text-green-600' : 'text-red-600'}`}>
                            {block.is_available ? '✅ Available' : '❌ Not Available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recurring' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Recurring Schedules</h3>
              {recurringSchedules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No recurring schedules found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringSchedules.map((schedule) => (
                    <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                      <p className="font-medium">
                        {schedule.start_date} to {schedule.end_date}
                      </p>
                      <p className="text-sm text-gray-600">
                        Repeats every {schedule.interval} week(s)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Block Modal */}
        {showAddBlock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Add Schedule Block</h3>
              <form onSubmit={handleAddBlock}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newBlock.starts_at.slice(0, 16)}
                    onChange={(e) => setNewBlock({...newBlock, starts_at: e.target.value + ':00+05:30'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newBlock.ends_at.slice(0, 16)}
                    onChange={(e) => setNewBlock({...newBlock, ends_at: e.target.value + ':00+05:30'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddBlock(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Block
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}