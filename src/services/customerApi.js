// Mock Customer API service
class CustomerAPI {
  constructor() {
    this.customers = [
      { id: 'cust_1', name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
      { id: 'cust_2', name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891' },
      { id: 'cust_3', name: 'Bob Johnson', email: 'bob@example.com', phone: '+1234567892' }
    ];
  }

  // Get all customers
  async getCustomers() {
    return { data: this.customers };
  }

  // Create new customer
  async createCustomer(customerData) {
    const newCustomer = {
      id: `cust_${Date.now()}`,
      ...customerData,
      created_at: new Date().toISOString()
    };
    
    this.customers.push(newCustomer);
    return newCustomer;
  }

  // Update customer
  async updateCustomer(customerId, updateData) {
    const index = this.customers.findIndex(c => c.id === customerId);
    if (index === -1) {
      throw new Error('Customer not found');
    }
    
    this.customers[index] = { ...this.customers[index], ...updateData };
    return this.customers[index];
  }

  // Delete customer
  async deleteCustomer(customerId) {
    const index = this.customers.findIndex(c => c.id === customerId);
    if (index === -1) {
      throw new Error('Customer not found');
    }
    
    this.customers.splice(index, 1);
    return { success: true };
  }
}

export default new CustomerAPI();