import React, { useState, useEffect } from 'react';
import { AlertCircle, X, RotateCcw, Trash2 } from 'lucide-react';
import bookingStateManager from '../utils/bookingStateManager';

const BookingStateIndicator = ({ onRefresh }) => {
  const [stats, setStats] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      const currentStats = bookingStateManager.getStats();
      setStats(currentStats);
    };

    updateStats();
    
    // Update stats periodically or when localStorage changes
    const interval = setInterval(updateStats, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleClearModified = () => {
    if (confirm('Are you sure you want to clear all local modifications? This will remove all cancelled, tentative, and other local changes.')) {
      bookingStateManager.clearModifiedBookings();
      setStats({ total: 0, cancelled: 0, tentative: 0, confirmed: 0 });
      if (onRefresh) {
        onRefresh();
      }
    }
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear the booking cache? This will force a fresh reload of all booking data.')) {
      bookingStateManager.clearCache();
      if (onRefresh) {
        onRefresh();
      }
    }
  };

  if (!stats || stats.total === 0) {
    return null;
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          <div className="text-sm text-orange-800">
            <span className="font-medium">{stats.total} booking{stats.total !== 1 ? 's' : ''} modified locally</span>
            {stats.cancelled > 0 && (
              <span className="ml-2">({stats.cancelled} cancelled)</span>
            )}
            {stats.tentative > 0 && (
              <span className="ml-2">({stats.tentative} tentative)</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-orange-600 hover:text-orange-800 underline"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
          <button
            onClick={handleClearCache}
            className="text-xs text-orange-600 hover:text-orange-800 p-1"
            title="Clear cache and refresh"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={handleClearModified}
            className="text-xs text-orange-600 hover:text-orange-800 p-1"
            title="Clear all local modifications"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setStats(null)}
            className="text-xs text-orange-600 hover:text-orange-800 p-1"
            title="Hide this notification"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <div className="text-xs text-orange-700 space-y-1">
            <p>
              <strong>Local modifications:</strong> These changes are stored in your browser 
              and may not be reflected on the server due to API limitations.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <span className="font-medium">Cancelled:</span> {stats.cancelled}
              </div>
              <div>
                <span className="font-medium">Tentative:</span> {stats.tentative}
              </div>
              <div>
                <span className="font-medium">Confirmed:</span> {stats.confirmed}
              </div>
            </div>
            <p className="mt-2">
              <strong>Note:</strong> These modifications are used to provide a consistent UI 
              experience despite backend API filtering behaviors.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingStateIndicator;