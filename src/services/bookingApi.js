const API_BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

const bookingAPI = {
  // Get all bookings
  getAllBookings: async (includeAll = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}/viewAllBookings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data: data || [] };
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  },

  // Get bookings filtered by resource, service, or location
  getFilteredBookings: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.resource_id) params.append('resource_id', filters.resource_id);
      if (filters.service_id) params.append('service_id', filters.service_id);
      if (filters.location_id) params.append('location_id', filters.location_id);
      
      const response = await fetch(`${API_BASE_URL}/viewFilteredBookings?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data: data || [] };
    } catch (error) {
      console.error('Error fetching filtered bookings:', error);
      throw error;
    }
  },

  // Get single booking by ID
  getBooking: async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/viewBooking/${bookingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw error;
    }
  },

  // Create a new booking with proper format
  createBooking: async (bookingData) => {
    try {
      // Ensure proper datetime format with timezone
      const payload = {
        resource_id: bookingData.resource_id,
        service_id: bookingData.service_id,
        location_id: bookingData.location_id,
        starts_at: bookingData.starts_at, // Format: "2025-10-30T09:00:00+08:00"
        ends_at: bookingData.ends_at,     // Format: "2025-10-30T10:00:00+08:00"
        price: bookingData.price || "0.000",
        customer_id: bookingData.customer_id || "",
        customer_name: bookingData.customer_name || bookingData.metadata?.user_name || "Guest",
      };

      console.log('Creating booking with payload:', payload);

      const response = await fetch(`${API_BASE_URL}/createBookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Booking created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  // Update an existing booking
  updateBooking: async (bookingId, updateData) => {
    try {
      const payload = {};
      
      if (updateData.starts_at) payload.starts_at = updateData.starts_at;
      if (updateData.ends_at) payload.ends_at = updateData.ends_at;
      if (updateData.price !== undefined) payload.price = updateData.price.toString();

      console.log('Updating booking with payload:', payload);

      const response = await fetch(`${API_BASE_URL}/updateBooking/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  },

  // Delete a booking
  deleteBooking: async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/deleteBooking/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  },

  // Get available time slots for a resource on a specific date
  getAvailableTimeSlots: async (resourceId, date, serviceId) => {
    try {
      // Get all bookings for this resource on this date
      const bookingsResponse = await bookingAPI.getFilteredBookings({
        resource_id: resourceId
      });
      const allBookings = bookingsResponse.data || [];

      // Filter bookings for the specific date
      const dateString = date instanceof Date ? date.toISOString().split('T')[0] : date;
      const dateBookings = allBookings.filter(booking => {
        const bookingDate = booking.starts_at.split('T')[0];
        return bookingDate === dateString;
      });

      // Get service details for duration constraints
      let serviceDuration = 60; // default 60 minutes
      let minDuration = 15;
      let maxDuration = 240;
      let interval = 15;

      if (serviceId) {
        try {
          const service = await bookingAPI.getService(serviceId);
          // Parse ISO 8601 duration format (e.g., "PT1H" = 1 hour, "PT30M" = 30 minutes)
          if (service.duration) {
            const durationMatch = service.duration.match(/PT(\d+H)?(\d+M)?/);
            if (durationMatch) {
              const hours = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
              const minutes = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
              serviceDuration = hours * 60 + minutes;
            }
          }
          if (service.min_duration) {
            const minMatch = service.min_duration.match(/PT(\d+H)?(\d+M)?/);
            if (minMatch) {
              const hours = minMatch[1] ? parseInt(minMatch[1]) : 0;
              const minutes = minMatch[2] ? parseInt(minMatch[2]) : 0;
              minDuration = hours * 60 + minutes;
            }
          }
          if (service.max_duration) {
            const maxMatch = service.max_duration.match(/PT(\d+H)?(\d+M)?/);
            if (maxMatch) {
              const hours = maxMatch[1] ? parseInt(maxMatch[1]) : 0;
              const minutes = maxMatch[2] ? parseInt(maxMatch[2]) : 0;
              maxDuration = hours * 60 + minutes;
            }
          }
          if (service.bookable_interval) {
            const intervalMatch = service.bookable_interval.match(/PT(\d+M)/);
            if (intervalMatch) {
              interval = parseInt(intervalMatch[1]);
            }
          }
        } catch (error) {
          console.warn('Could not fetch service details, using defaults:', error);
        }
      }

      // Generate all possible time slots (6 AM to 11 PM with service interval)
      const allSlots = [];
      for (let hour = 6; hour < 23; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
          allSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }
      }

      // Mark slots as booked or available
      const availableSlots = allSlots.map(slot => {
        const [hour, minute] = slot.split(':').map(Number);
        const slotStart = hour * 60 + minute; // minutes from midnight
        const slotEnd = slotStart + serviceDuration;

        // Check if this slot conflicts with any booking
        const isBooked = dateBookings.some(booking => {
          const bookingStartTime = booking.starts_at.split('T')[1].substring(0, 5);
          const bookingEndTime = booking.ends_at.split('T')[1].substring(0, 5);
          
          const [bStartHour, bStartMin] = bookingStartTime.split(':').map(Number);
          const [bEndHour, bEndMin] = bookingEndTime.split(':').map(Number);
          
          const bookingStart = bStartHour * 60 + bStartMin;
          const bookingEnd = bEndHour * 60 + bEndMin;

          // Check for overlap
          return (slotStart < bookingEnd && slotEnd > bookingStart);
        });

        return {
          time: slot,
          available: !isBooked,
          duration: serviceDuration
        };
      });

      return {
        slots: availableSlots,
        serviceDuration,
        minDuration,
        maxDuration,
        interval
      };
    } catch (error) {
      console.error('Error getting available time slots:', error);
      throw error;
    }
  },

  // Get resources
  getResources: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/viewAllResources`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data: data || [] };
    } catch (error) {
      console.error('Error fetching resources:', error);
      throw error;
    }
  },

  // Get services
  getServices: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/viewAllServices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data: data || [] };
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  },

  // Get single service
  getService: async (serviceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/viewService/${serviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching service:', error);
      throw error;
    }
  },

  // Get locations
  getLocations: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/viewAllLocations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data: data || [] };
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  },

  // Get service ID by resource
  getServiceIdByResource: async (resourceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/viewResource/${resourceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resource = await response.json();
      return resource.service_id || '';
    } catch (error) {
      console.error('Error fetching service ID:', error);
      return '';
    }
  },

  // Helper function to format datetime with timezone
  formatDateTimeWithTimezone: (date, time, timezone) => {
    // date: "2025-10-30" or Date object
    // time: "09:00"
    // timezone: "+08:00" or "Asia/Hong_Kong"
    
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
    
    // Convert timezone name to offset if needed
    let offset = timezone;
    if (timezone.includes('/')) {
      const timezoneMap = {
        'Asia/Hong_Kong': '+08:00',
        'Asia/Kolkata': '+05:30',
        'Asia/Singapore': '+08:00',
        'America/New_York': '-05:00',
        'Europe/London': '+00:00',
      };
      offset = timezoneMap[timezone] || '+00:00';
    }
    
    return `${dateStr}T${time}:00${offset}`;
  }
};

export default bookingAPI;