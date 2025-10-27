const BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

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
      
      // Some endpoints may return 204 No Content
      if (response.status === 204) return { status: 204 };
      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Helper: Get service_id for a resource
  async getServiceIdByResource(resourceId) {
    const res = await this.apiRequest('/getServiceIdbyResourceId', {
      method: 'POST',
      body: JSON.stringify({ resource_id: resourceId })
    });
    return res?.service_id || res?.id || res?.data?.service_id || null;
  }

  // Bookings
  async getAllBookings(includeCancelled = true) {
    // New endpoint returns an array of bookings
    const data = await this.apiRequest('/viewAllBookings');
    const list = Array.isArray(data) ? data : (data?.data || []);
    return { data: list };
  }

  async getCancelledBookings() {
    // Not provided server-side; caller filters locally if needed
    const res = await this.getAllBookings(true);
    return { data: (res.data || []).filter(b => b?.is_canceled) };
  }

  async createBooking(bookingData) {
    // Map to expected payload; ensure price string as per API
    const payload = {
      resource_id: bookingData.resource_id,
      service_id: bookingData.service_id,
      location_id: bookingData.location_id,
      price: bookingData.price ?? '0.000',
      customer_id: bookingData.customer_id || '',
      customer_name: bookingData.customer_name || bookingData.metadata?.user_name || '',
      starts_at: bookingData.starts_at,
      ends_at: bookingData.ends_at,
    };
    return this.apiRequest('/createBookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Additional methods needed for booking creation form
  async getLocations() {
    // Not part of the provided API. Return empty structure to keep UI stable.
    return { data: [] };
  }

  async getResources() {
    const res = await this.apiRequest('/viewAllresources');
    return { data: Array.isArray(res) ? res : (res?.data || []) };
  }

  async getServices() {
    // No global list in the provided API. Caller should use getServicesByResource.
    return { data: [] };
  }

  async getService(serviceId) {
    return this.apiRequest(`/getService/${serviceId}`);
  }

  async getServicesByResource(resourceId) {
    // First obtain service_id by resource
    const sidRes = await this.apiRequest('/getServiceIdbyResourceId', {
      method: 'POST',
      body: JSON.stringify({ resource_id: resourceId })
    });
    const serviceId = sidRes?.service_id || sidRes?.id || sidRes?.data?.service_id;
    if (!serviceId) return { data: [] };
    const svc = await this.getService(serviceId);
    const svcObj = Array.isArray(svc) ? svc[0] : (svc?.data || svc);
    return { data: svcObj ? [svcObj] : [] };
  }

  // Create new items
  async createLocation(locationData) {
    throw new Error('createLocation is not supported by the current API');
  }

  async createResource(resourceData) {
    throw new Error('createResource is not supported by the current API here');
  }

  async createService(serviceData) {
    throw new Error('createService is not supported by the current API');
  }

  async updateBooking(bookingId, updateData) {
    return this.apiRequest(`/updateBooking/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteBooking(bookingId) {
    return this.apiRequest(`/deleteBooking/${bookingId}`, {
      method: 'DELETE',
    });
  }

  // Associations (Service ↔ Resource)
  async associateServiceToResource(serviceId, resourceId) {
    // Not available in the current API, keep no-op for backward compatibility
    return { status: 200 };
  }

  async removeServiceResourceAssociation(serviceId, resourceId) {
    return { status: 200 };
  }

  async getServiceAssociations(serviceId) {
    return { data: [] };
  }

  // Schedule Blocks (per resource)
  async createScheduleBlock(resourceId, scheduleData) {
    // Not used with current API
    return { status: 200 };
  }

  async getScheduleBlocks(resourceId) {
    return { data: [] };
  }

  async updateScheduleBlock(resourceId, blockId, updateData) {
    return { status: 200 };
  }

  async deleteScheduleBlock(resourceId, blockId) {
    return { status: 200 };
  }

  // Recurring Schedules (per resource)
  async createRecurringSchedule(resourceId, scheduleData) {
    return { status: 200 };
  }

  async getRecurringSchedules(resourceId) {
    return { data: [] };
  }

  async updateRecurringSchedule(resourceId, schedId, updateData) {
    return { status: 200 };
  }

  async deleteRecurringSchedule(resourceId, schedId) {
    return { status: 200 };
  }

  // Check availability by comparing with existing bookings (client-side)
  async checkAvailability(resourceId, startTime, endTime) {
    try {
      const response = await this.getAllBookings();
      const resourceBookings = response.data.filter(booking => 
        (booking.resource?.id === resourceId || booking.resource_id === resourceId) && !booking.is_canceled
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
      // Simplified: compute free hourly slots from 06:00 to 23:00 excluding overlaps
      const bookingsResponse = await this.getAllBookings();
      const dayBookings = bookingsResponse.data.filter(booking => {
        const bookingDate = new Date(booking.starts_at).toISOString().split('T')[0];
        return bookingDate === date && (booking.resource?.id === resourceId || booking.resource_id === resourceId) && !booking.is_canceled;
      });

      const availableSlots = [];
      for (let h = 6; h < 23; h++) {
        const start = new Date(`${date}T${String(h).padStart(2, '0')}:00:00`);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const conflict = dayBookings.some(b => {
          const bs = new Date(b.starts_at);
          const be = new Date(b.ends_at);
          return start < be && end > bs;
        });
        if (!conflict) availableSlots.push({ start: start.toISOString(), end: end.toISOString(), duration: 'PT1H' });
      }

      return { data: availableSlots };
    } catch (error) {
      console.error('Failed to get available slots:', error);
      throw error;
    }
  }
}

export default new BookingAPI();