const BASE_URL = 'http://optimus-india-njs-01.netbird.cloud:4000/booking_system';

class BookingAPI {
  // Helper method to make API requests
  async apiRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Bookings
  async getAllBookings(includeCancelled = true) {
    const endpoint = includeCancelled ? '/all-bookings?include_cancelled=true' : '/all-bookings';
    return this.apiRequest(endpoint);
  }

  async getCancelledBookings() {
    return this.apiRequest('/all-bookings?status=cancelled');
  }

  async createBooking(bookingData) {
    return this.apiRequest('/create-booking', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  // Additional methods needed for booking creation form
  async getLocations() {
    return this.apiRequest('/all-locations');
  }

  async getResources() {
    return this.apiRequest('/all-resources');
  }

  async getServices() {
    return this.apiRequest('/all-services');
  }

  // Create new items
  async createLocation(locationData) {
    return this.apiRequest('/create-location', {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }

  async createResource(resourceData) {
    return this.apiRequest('/create-resource', {
      method: 'POST',
      body: JSON.stringify(resourceData),
    });
  }

  async createService(serviceData) {
    return this.apiRequest('/create-service', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async updateBooking(bookingId, updateData) {
    return this.apiRequest(`/update-booking/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteBooking(bookingId) {
    return this.apiRequest(`/delete-booking/${bookingId}`, {
      method: 'DELETE',
    });
  }

  // Associations (Service ↔ Resource)
  async associateServiceToResource(serviceId, resourceId) {
    return this.apiRequest(`/associate-service/${serviceId}/resource/${resourceId}`, {
      method: 'PUT',
    });
  }

  async removeServiceResourceAssociation(serviceId, resourceId) {
    return this.apiRequest(`/associate-service/${serviceId}/resource/${resourceId}`, {
      method: 'DELETE',
    });
  }

  async getServiceAssociations(serviceId) {
    return this.apiRequest(`/associations/${serviceId}`);
  }

  // Schedule Blocks (per resource)
  async createScheduleBlock(resourceId, scheduleData) {
    return this.apiRequest(`/resource/${resourceId}/schedule-blocks`, {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  async getScheduleBlocks(resourceId) {
    return this.apiRequest(`/resource/${resourceId}/schedule-blocks`);
  }

  async updateScheduleBlock(resourceId, blockId, updateData) {
    return this.apiRequest(`/resource/${resourceId}/schedule-blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteScheduleBlock(resourceId, blockId) {
    return this.apiRequest(`/resource/${resourceId}/schedule-blocks/${blockId}`, {
      method: 'DELETE',
    });
  }

  // Recurring Schedules (per resource)
  async createRecurringSchedule(resourceId, scheduleData) {
    return this.apiRequest(`/resource/${resourceId}/recurring-schedules`, {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  async getRecurringSchedules(resourceId) {
    return this.apiRequest(`/resource/${resourceId}/recurring-schedules`);
  }

  async updateRecurringSchedule(resourceId, schedId, updateData) {
    return this.apiRequest(`/resource/${resourceId}/recurring-schedules/${schedId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteRecurringSchedule(resourceId, schedId) {
    return this.apiRequest(`/resource/${resourceId}/recurring-schedules/${schedId}`, {
      method: 'DELETE',
    });
  }

  // Check availability by comparing with existing bookings (client-side)
  async checkAvailability(resourceId, startTime, endTime) {
    try {
      const response = await this.getAllBookings();
      const resourceBookings = response.data.filter(booking => 
        booking.resource.id === resourceId && !booking.is_canceled
      );
      
      // Check for time conflicts
      const hasConflict = resourceBookings.some(booking => {
        const bookingStart = new Date(booking.starts_at);
        const bookingEnd = new Date(booking.ends_at);
        const requestStart = new Date(startTime);
        const requestEnd = new Date(endTime);
        
        return (requestStart < bookingEnd && requestEnd > bookingStart);
      });
      
      return { available: !hasConflict, conflicts: hasConflict ? resourceBookings : [] };
    } catch (error) {
      console.error('Availability check failed:', error);
      throw error;
    }
  }

  // Get available time slots based on schedule blocks and existing bookings
  async getAvailableSlots(resourceId, date) {
    try {
      // Get schedule blocks for the resource
      const scheduleResponse = await this.getScheduleBlocks(resourceId);
      const scheduleBlocks = scheduleResponse.data || [];
      
      // Get existing bookings for the date
      const bookingsResponse = await this.getAllBookings();
      const dayBookings = bookingsResponse.data.filter(booking => {
        const bookingDate = new Date(booking.starts_at).toISOString().split('T')[0];
        return bookingDate === date && booking.resource.id === resourceId && !booking.is_canceled;
      });
      
      // Find available slots within schedule blocks
      const availableSlots = [];
      
      scheduleBlocks.forEach(block => {
        const blockDate = new Date(block.starts_at).toISOString().split('T')[0];
        if (blockDate === date && block.is_available) {
          // Generate hourly slots within this block
          const blockStart = new Date(block.starts_at);
          const blockEnd = new Date(block.ends_at);
          
          for (let time = new Date(blockStart); time < blockEnd; time.setHours(time.getHours() + 1)) {
            const slotEnd = new Date(time.getTime() + 60 * 60 * 1000); // 1 hour later
            
            // Check if this slot conflicts with existing bookings
            const hasConflict = dayBookings.some(booking => {
              const bookingStart = new Date(booking.starts_at);
              const bookingEnd = new Date(booking.ends_at);
              return (time < bookingEnd && slotEnd > bookingStart);
            });
            
            if (!hasConflict && slotEnd <= blockEnd) {
              availableSlots.push({
                start: time.toISOString(),
                end: slotEnd.toISOString(),
                duration: 'PT1H'
              });
            }
          }
        }
      });
      
      return { data: availableSlots };
    } catch (error) {
      console.error('Failed to get available slots:', error);
      throw error;
    }
  }
}

export default new BookingAPI();