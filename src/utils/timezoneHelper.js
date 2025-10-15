import { DateTime } from 'luxon';

/**
 * Timezone utility functions for booking calendar
 * Handles primary (location/room timezone) and secondary (viewer local timezone) displays
 */

// Get viewer's local timezone
export const getViewerTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Format time in specific timezone
export const formatTimeInZone = (isoString, timezone, format = 'HH:mm') => {
  if (!isoString) return '';
  
  try {
    return DateTime.fromISO(isoString)
      .setZone(timezone)
      .toFormat(format);
  } catch (error) {
    console.warn('Invalid date/timezone:', isoString, timezone);
    return '';
  }
};

// Format date in specific timezone
export const formatDateInZone = (isoString, timezone, format = 'ccc, MMM d, yyyy') => {
  if (!isoString) return '';
  
  try {
    return DateTime.fromISO(isoString)
      .setZone(timezone)
      .toFormat(format);
  } catch (error) {
    console.warn('Invalid date/timezone:', isoString, timezone);
    return '';
  }
};

// Get timezone abbreviation (e.g., "HKT", "EST")
export const getTimezoneAbbreviation = (timezone) => {
  try {
    return DateTime.now().setZone(timezone).toFormat('ZZZZ');
  } catch (error) {
    return timezone.split('/').pop() || 'UTC';
  }
};

// Format primary time (room timezone)
export const formatRoomTime = (isoString, roomTimezone) => {
  return {
    time: formatTimeInZone(isoString, roomTimezone, 'HH:mm'),
    date: formatDateInZone(isoString, roomTimezone, 'ccc, MMM d'),
    full: formatDateInZone(isoString, roomTimezone, 'ccc, MMM d, yyyy HH:mm'),
    abbreviation: getTimezoneAbbreviation(roomTimezone)
  };
};

// Format secondary time (viewer local timezone)
export const formatViewerTime = (isoString) => {
  const viewerTz = getViewerTimezone();
  return {
    time: formatTimeInZone(isoString, viewerTz, 'HH:mm'),
    date: formatDateInZone(isoString, viewerTz, 'ccc, MMM d'),
    full: formatDateInZone(isoString, viewerTz, 'ccc, MMM d, yyyy HH:mm'),
    abbreviation: getTimezoneAbbreviation(viewerTz),
    timezone: viewerTz
  };
};

// Format time range with primary and secondary display
export const formatTimeRange = (startISO, endISO, roomTimezone, showSecondary = false) => {
  const roomStart = formatRoomTime(startISO, roomTimezone);
  const roomEnd = formatRoomTime(endISO, roomTimezone);
  
  const primaryDisplay = {
    range: `${roomStart.time} — ${roomEnd.time} ${roomStart.abbreviation}`,
    date: roomStart.date,
    start: roomStart.time,
    end: roomEnd.time,
    timezone: roomStart.abbreviation
  };
  
  if (!showSecondary) {
    return { primary: primaryDisplay };
  }
  
  const viewerStart = formatViewerTime(startISO);
  const viewerEnd = formatViewerTime(endISO);
  
  const secondaryDisplay = {
    range: `${viewerStart.time} — ${viewerEnd.time} ${viewerStart.abbreviation}`,
    date: viewerStart.date,
    start: viewerStart.time,
    end: viewerEnd.time,
    timezone: viewerStart.abbreviation
  };
  
  return {
    primary: primaryDisplay,
    secondary: secondaryDisplay
  };
};

// Convert local datetime to specific timezone ISO string
export const convertToTimezone = (localDatetime, targetTimezone) => {
  try {
    return DateTime.fromJSDate(new Date(localDatetime))
      .setZone(targetTimezone)
      .toISO();
  } catch (error) {
    console.warn('Date conversion error:', error);
    return new Date(localDatetime).toISOString();
  }
};

// Check if date is today in specific timezone
export const isToday = (isoString, timezone) => {
  try {
    const date = DateTime.fromISO(isoString).setZone(timezone);
    const today = DateTime.now().setZone(timezone);
    return date.hasSame(today, 'day');
  } catch (error) {
    return false;
  }
};

// Get UTC offset for display (e.g., "GMT +8")
export const getUTCOffsetDisplay = (timezone) => {
  try {
    const dt = DateTime.now().setZone(timezone);
    const offset = dt.offset;
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    
    if (minutes === 0) {
      return `GMT ${sign}${hours}`;
    } else {
      return `GMT ${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
    }
  } catch (error) {
    return 'GMT +0';
  }
};

// Format duration in minutes to human readable format
export const formatDurationFromMinutes = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  } else {
    return `${hours}h ${remainingMinutes}m`;
  }
};

// Calculate duration between two datetime strings
export const calculateDurationMinutes = (startISO, endISO) => {
  try {
    const start = DateTime.fromISO(startISO);
    const end = DateTime.fromISO(endISO);
    return Math.round(end.diff(start, 'minutes').minutes);
  } catch (error) {
    return 0;
  }
};

// Common duration presets in minutes
export const DURATION_PRESETS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '2 hour', value: 120 }
];

// Generate time slots for a day (15-minute intervals)
export const generateTimeSlots = (startHour = 0, endHour = 24, intervalMinutes = 15) => {
  const slots = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  
  return slots;
};

// Convert time string to datetime in specific timezone
export const timeStringToDateTime = (timeString, date, timezone) => {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    return DateTime.fromJSDate(date)
      .setZone(timezone)
      .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 })
      .toISO();
  } catch (error) {
    console.warn('Time string conversion error:', error);
    return new Date().toISOString();
  }
};