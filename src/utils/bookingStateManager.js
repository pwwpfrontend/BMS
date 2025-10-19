/**
 * Client-side booking state manager to handle booking modifications
 * when the backend API doesn't reliably return updated booking data
 */

const STORAGE_KEY = 'modified_bookings';
const CACHE_KEY = 'bookings_cache';
const CACHE_VALID_KEY = 'bookings_cache_valid';

class BookingStateManager {
  constructor() {
    this.migrate();
  }

  // Migrate old cancelled_bookings data to the new unified system
  migrate() {
    const oldCancelled = localStorage.getItem('cancelled_bookings');
    if (oldCancelled) {
      try {
        const cancelledBookings = JSON.parse(oldCancelled);
        if (cancelledBookings.length > 0) {
          const existing = this.getModifiedBookings();
          const existingIds = existing.map(b => b.id);
          
          cancelledBookings.forEach(booking => {
            if (!existingIds.includes(booking.id)) {
              existing.push(booking);
            }
          });
          
          this.setModifiedBookings(existing);
        }
      } catch (error) {
        console.warn('Failed to migrate cancelled bookings:', error);
      }
      
      localStorage.removeItem('cancelled_bookings');
    }
  }

  // Get all modified bookings from localStorage
  getModifiedBookings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
      console.error('Failed to parse modified bookings:', error);
      return [];
    }
  }

  // Set modified bookings to localStorage
  setModifiedBookings(bookings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch (error) {
      console.error('Failed to save modified bookings:', error);
    }
  }

  // Update or add a booking to the modified state
  updateBooking(bookingId, updates) {
    const modifiedBookings = this.getModifiedBookings();
    const existingIndex = modifiedBookings.findIndex(b => b.id === bookingId);
    
    if (existingIndex >= 0) {
      // Update existing modified booking
      modifiedBookings[existingIndex] = {
        ...modifiedBookings[existingIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
    } else {
      // Add new modified booking
      modifiedBookings.push({
        id: bookingId,
        ...updates,
        updated_at: new Date().toISOString()
      });
    }
    
    this.setModifiedBookings(modifiedBookings);
    this.invalidateCache();
  }

  // Cancel a booking (client-side)
  cancelBooking(booking) {
    const updates = {
      ...booking,
      status: 'Cancelled',
      is_canceled: true,
      canceled_at: new Date().toISOString()
    };
    
    this.updateBooking(booking.id, updates);
  }

  // Reactivate a cancelled booking (client-side)
  reactivateBooking(booking) {
    const updates = {
      ...booking,
      status: 'Confirmed',
      is_canceled: false,
      canceled_at: null
    };
    
    this.updateBooking(booking.id, updates);
  }

  // Mark booking as tentative (client-side)
  markTentative(booking, isTentative = true) {
    const updates = {
      ...booking,
      status: isTentative ? 'Tentative' : 'Confirmed',
      is_temporary: isTentative
    };
    
    this.updateBooking(booking.id, updates);
  }

  // Remove a booking from modified state (e.g., after successful API update)
  removeModifiedBooking(bookingId) {
    const modifiedBookings = this.getModifiedBookings();
    const filtered = modifiedBookings.filter(b => b.id !== bookingId);
    this.setModifiedBookings(filtered);
    this.invalidateCache();
  }

  // Get a specific modified booking
  getModifiedBooking(bookingId) {
    const modifiedBookings = this.getModifiedBookings();
    return modifiedBookings.find(b => b.id === bookingId);
  }

  // Check if a booking has been modified
  isBookingModified(bookingId) {
    const modifiedBookings = this.getModifiedBookings();
    return modifiedBookings.some(b => b.id === bookingId);
  }

  // Merge API bookings with modified bookings
  mergeWithApiBookings(apiBookings, transformFn = (booking) => booking) {
    const modifiedBookings = this.getModifiedBookings();
    const modifiedIds = modifiedBookings.map(b => b.id);
    
    // Filter out bookings that exist in modified state
    const filteredApiBookings = apiBookings.filter(booking => 
      !modifiedIds.includes(booking.id)
    );
    
    // Transform modified bookings and filter out any invalid ones
    const transformedModified = modifiedBookings
      .map(transformFn)
      .filter(booking => booking !== null && booking.id);
    
    // Combine API bookings first (prioritize fresh data), then add modified bookings
    return [...filteredApiBookings, ...transformedModified];
  }

  // Bulk cancel bookings
  bulkCancelBookings(bookings) {
    bookings.forEach(booking => {
      if (booking.status !== 'Cancelled') {
        this.cancelBooking(booking);
      }
    });
  }

  // Clear all modified bookings
  clearModifiedBookings() {
    localStorage.removeItem(STORAGE_KEY);
    this.invalidateCache();
  }

  // Invalidate cache to force refresh
  invalidateCache() {
    localStorage.removeItem(CACHE_VALID_KEY);
  }

  // Clear cache
  clearCache() {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VALID_KEY);
  }
  
  // Clean up invalid or corrupted modified bookings
  cleanupModifiedBookings() {
    const modifiedBookings = this.getModifiedBookings();
    const validBookings = modifiedBookings.filter(booking => {
      // Keep only bookings with valid IDs and essential properties
      return booking.id && (booking.status || booking.is_canceled !== undefined);
    });
    
    if (validBookings.length !== modifiedBookings.length) {
      
      this.setModifiedBookings(validBookings);
    }
  }

  // Get stats about modified bookings
  getStats() {
    const modifiedBookings = this.getModifiedBookings();
    
    return {
      total: modifiedBookings.length,
      cancelled: modifiedBookings.filter(b => b.is_canceled || b.status === 'Cancelled').length,
      tentative: modifiedBookings.filter(b => b.is_temporary || b.status === 'Tentative').length,
      confirmed: modifiedBookings.filter(b => !b.is_canceled && !b.is_temporary && b.status === 'Confirmed').length
    };
  }
}

// Create a singleton instance
const bookingStateManager = new BookingStateManager();

export default bookingStateManager;

// Export individual methods for convenience
export const {
  getModifiedBookings,
  setModifiedBookings,
  updateBooking,
  cancelBooking,
  reactivateBooking,
  markTentative,
  removeModifiedBooking,
  getModifiedBooking,
  isBookingModified,
  mergeWithApiBookings,
  bulkCancelBookings,
  clearModifiedBookings,
  invalidateCache,
  clearCache,
  getStats
} = bookingStateManager;