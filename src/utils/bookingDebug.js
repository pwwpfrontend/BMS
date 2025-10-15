/**
 * Debug utilities for booking functionality
 */

import bookingAPI from '../services/bookingApi';
import bookingStateManager from './bookingStateManager';

export const debugBookingSystem = {
  // Test API connectivity
  async testAPIConnection() {
    try {
      console.log('🔗 Testing API connection...');
      
      const locationsTest = await bookingAPI.getLocations();
      const resourcesTest = await bookingAPI.getResources();
      const servicesTest = await bookingAPI.getServices();
      const bookingsTest = await bookingAPI.getAllBookings();
      
      console.log('✅ API Connection successful:');
      console.log(`  - Locations: ${locationsTest.data?.length || 0}`);
      console.log(`  - Resources: ${resourcesTest.data?.length || 0}`);
      console.log(`  - Services: ${servicesTest.data?.length || 0}`);
      console.log(`  - Bookings: ${bookingsTest.data?.length || 0}`);
      
      return true;
    } catch (error) {
      console.error('❌ API Connection failed:', error);
      return false;
    }
  },

  // Check cache and state manager status
  checkCacheStatus() {
    const cacheValid = localStorage.getItem('bookings_cache_valid');
    const cache = localStorage.getItem('bookings_cache');
    const modifiedBookings = bookingStateManager.getModifiedBookings();
    const stats = bookingStateManager.getStats();
    
    console.log('📊 Cache and State Status:');
    console.log(`  - Cache Valid: ${cacheValid}`);
    console.log(`  - Cache Exists: ${!!cache}`);
    console.log(`  - Modified Bookings: ${modifiedBookings.length}`);
    console.log('  - Stats:', stats);
    
    return {
      cacheValid,
      cacheExists: !!cache,
      modifiedCount: modifiedBookings.length,
      stats
    };
  },

  // Clear all booking-related storage
  clearAllBookingData() {
    console.log('🧹 Clearing all booking data...');
    
    // Clear cache
    localStorage.removeItem('bookings_cache');
    localStorage.removeItem('bookings_cache_valid');
    
    // Clear modified bookings
    bookingStateManager.clearModifiedBookings();
    
    console.log('✅ All booking data cleared');
  },

  // Test form data loading
  async testFormDataLoading() {
    try {
      console.log('📋 Testing form data loading...');
      
      const locations = await bookingAPI.getLocations();
      const resources = await bookingAPI.getResources();
      const services = await bookingAPI.getServices();
      
      console.log('✅ Form data loaded successfully:');
      console.log(`  - Locations: ${locations.data?.length || 0} items`);
      console.log(`  - Resources: ${resources.data?.length || 0} items`);
      console.log(`  - Services: ${services.data?.length || 0} items`);
      
      if (locations.data?.length > 0) {
        console.log('  - Sample location:', locations.data[0]);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Form data loading failed:', error);
      return false;
    }
  },

  // Test booking creation with sample data
  async testBookingCreation() {
    try {
      console.log('🧪 Testing booking creation...');
      
      // Get available data first
      const locations = await bookingAPI.getLocations();
      const resources = await bookingAPI.getResources();
      const services = await bookingAPI.getServices();
      
      if (!locations.data?.length || !resources.data?.length || !services.data?.length) {
        console.error('❌ Cannot test booking creation: Missing locations, resources, or services');
        return false;
      }
      
      // Create test booking data
      const testBooking = {
        location_id: locations.data[0].id,
        resource_id: resources.data[0].id,
        service_id: services.data[0].id,
        starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('Z', '+05:30'), // Tomorrow
        ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString().replace('Z', '+05:30'), // Tomorrow + 1 hour
        metadata: {
          user_name: 'Test User'
        }
      };
      
      console.log('📝 Test booking data:', testBooking);
      
      // Note: This is just for testing - don't actually create the booking
      console.log('⚠️  Test booking data prepared (not created to avoid spam)');
      return true;
      
    } catch (error) {
      console.error('❌ Booking creation test failed:', error);
      return false;
    }
  },

  // Run all tests
  async runAllTests() {
    console.log('🚀 Running all booking system tests...\n');
    
    const results = {
      apiConnection: await this.testAPIConnection(),
      formDataLoading: await this.testFormDataLoading(),
      bookingCreationTest: await this.testBookingCreation()
    };
    
    console.log('\n📊 Test Results Summary:');
    console.log('  - API Connection:', results.apiConnection ? '✅' : '❌');
    console.log('  - Form Data Loading:', results.formDataLoading ? '✅' : '❌');
    console.log('  - Booking Creation Test:', results.bookingCreationTest ? '✅' : '❌');
    
    this.checkCacheStatus();
    
    return results;
  }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  window.debugBooking = debugBookingSystem;
}

export default debugBookingSystem;