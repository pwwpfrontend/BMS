// Utility functions for booking data formatting

export const formatBookingDate = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  const timeOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  const startDateStr = start.toLocaleDateString('en-US', options);
  const startTimeStr = start.toLocaleTimeString('en-US', timeOptions);
  const endTimeStr = end.toLocaleTimeString('en-US', timeOptions);
  
  return `${startDateStr} ${startTimeStr} - ${endTimeStr}`;
};

export const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const calculateDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours === 0) {
    return `${diffMinutes} minutes`;
  } else if (diffMinutes === 0) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
  } else {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ${diffMinutes} minutes`;
  }
};

export const getBookingStatus = (booking) => {
  if (booking.is_canceled) {
    return 'Cancelled';
  } else if (booking.is_temporary) {
    return 'Tentative';
  } else {
    return 'Confirmed';
  }
};

export const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Confirmed':
      return 'bg-green-100 text-green-800';
    case 'Tentative':
      return 'bg-yellow-100 text-yellow-800';
    case 'Cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getCustomerEmail = (booking) => {
  return booking.metadata?.email || 'N/A';
};

export const getCustomerName = (booking) => {
  return (
    booking.metadata?.customer_name ||
    booking.metadata?.user_name ||
    booking.customer_name ||
    'N/A'
  );
};

export const parseDuration = (isoDuration) => {
  // Parse ISO 8601 duration (e.g., PT1H, PT30M, PT4H)
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return '';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  
  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} minutes`;
  }
};

export const transformBookingForUI = (booking) => {
  if (!booking) {
    return null;
  }
  
  const resourceName = booking.resource?.name || 'N/A';
  const serviceName = booking.service?.name || 'N/A';
  return {
    id: booking.id || '',
    title: `${resourceName} - ${serviceName}`,
    date: booking.starts_at && booking.ends_at ? formatBookingDate(booking.starts_at, booking.ends_at) : 'No date',
    customer: getCustomerEmail(booking),
    customerName: getCustomerName(booking),
    duration: booking.starts_at && booking.ends_at ? calculateDuration(booking.starts_at, booking.ends_at) : 'Unknown',
    status: getBookingStatus(booking),
    resource: booking.resource || { name: resourceName },
    service: booking.service || { name: serviceName },
    location: booking.location || null,
    price: parseFloat(booking.price || 0),
    starts_at: booking.starts_at,
    ends_at: booking.ends_at,
    created_at: booking.created_at,
    updated_at: booking.updated_at,
    notes: booking.metadata?.notes || '',
    metadata: booking.metadata || {},
    // Include original API fields for reference
    is_canceled: booking.is_canceled,
    is_temporary: booking.is_temporary
  };
};