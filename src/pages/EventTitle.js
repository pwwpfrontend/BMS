import React from 'react';
import { Clock, User } from 'lucide-react';
import { formatTimeRange } from '../utils/timezoneHelper';

/**
 * EventTile component - displays booking events in calendar cells
 * Matches the Figma design with resource name, time, and status indicators
 */
const EventTile = ({ 
  booking, 
  onClick, 
  showTooltip = false,
  compact = false,
  showSecondaryTime = false 
}) => {
  if (!booking) return null;

  const roomTimezone = booking.location?.time_zone || 'UTC';
  const timeDisplay = formatTimeRange(
    booking.starts_at, 
    booking.ends_at, 
    roomTimezone, 
    showSecondaryTime
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed':
        return {
          bg: '#EDF7ED',
          border: '#79C485',
          text: '#2D5A2D'
        };
      case 'Tentative':
        return {
          bg: '#FDF6E3',
          border: '#EDB02D', 
          text: '#8B5000'
        };
      case 'Cancelled':
        return {
          bg: '#FEF2F2',
          border: '#EF4444',
          text: '#7F1D1D'
        };
      default:
        return {
          bg: '#F3F4F6',
          border: '#6B7280',
          text: '#374151'
        };
    }
  };

  const statusColors = getStatusColor(booking.status);
  
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(booking);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative cursor-pointer rounded-md border-l-4 px-2 py-1 mb-1 
        transition-all duration-150 hover:shadow-sm
        ${compact ? 'text-xs' : 'text-sm'}
      `}
      style={{
        backgroundColor: statusColors.bg,
        borderLeftColor: statusColors.border,
        borderWidth: '0 0 0 4px',
        minHeight: compact ? '20px' : '32px'
      }}
      aria-label={`Booking: ${booking.resource?.name} at ${timeDisplay.primary.range}, by ${booking.customerName || 'Unknown'}`}
    >
      {/* Status indicator dot */}
      <div 
        className="absolute top-1 left-1 w-2 h-2 rounded-full"
        style={{ backgroundColor: statusColors.border }}
      />

      {/* Resource name */}
      <div 
        className="font-semibold truncate pr-1" 
        style={{ 
          color: statusColors.text,
          fontFamily: 'Inter',
          marginLeft: '8px'
        }}
      >
        {booking.resource?.name || 'Unknown Resource'}
      </div>

      {/* Time range */}
      <div className="flex items-center gap-1 mt-1">
        <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
        <span 
          className="text-xs text-gray-600 truncate"
          style={{ fontFamily: 'Inter' }}
        >
          {timeDisplay.primary.range}
        </span>
      </div>

      {/* Customer info (shown in larger tiles) */}
      {!compact && booking.customerName && (
        <div className="flex items-center gap-1 mt-1">
          <User className="w-3 h-3 text-gray-500 flex-shrink-0" />
          <span 
            className="text-xs text-gray-500 truncate"
            style={{ fontFamily: 'Inter' }}
          >
            {booking.customerName}
          </span>
        </div>
      )}

      {/* Secondary time display (viewer timezone) */}
      {showSecondaryTime && timeDisplay.secondary && (
        <div className="text-xs text-gray-400 mt-1 truncate" style={{ fontFamily: 'Inter' }}>
          {timeDisplay.secondary.range}
        </div>
      )}

      {/* Service name as subtitle (if space allows) */}
      {!compact && booking.service?.name && (
        <div 
          className="text-xs text-gray-500 truncate mt-1"
          style={{ fontFamily: 'Inter' }}
        >
          — {booking.service.name}
        </div>
      )}

      {/* Buffer time indicator (optional visual) */}
      {booking.buffer_starts_at !== booking.starts_at && (
        <div 
          className="absolute inset-0 rounded-md opacity-20 pointer-events-none"
          style={{ backgroundColor: statusColors.border }}
        />
      )}
    </div>
  );
};

export default EventTile;