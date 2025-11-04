import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Download, UserPlus, MoreVertical, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [bulkActionsEnabled, setBulkActionsEnabled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState('');
  const sortRef = useRef(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  // BMS Auth0 Management API configuration
  const config = {
    domain: "bms-optimus.us.auth0.com",
    clientId: "x3UIh4PsAjdW1Y0uTmjDUk5VIA36iQ12",
    clientSecret: "xYfZ6lk_kJoLy73sgh3jAY_4U4bMnwm58EjN97Ozw-JcsQTs36JpA2UM4C2xVn-r",
    audience: "https://bms-optimus.us.auth0.com/api/v2/",
    webClientId: "Q6sGKEIJKyFMoTzm6mzq9eM9KNVdjCOy",
    adminRoleId: "rol_w5FheridDpGctfQC", // Admin role ID
    userRoleId: "rol_FdjheKGmIFxzp6hR" // User role ID
  };

  // Fetch Management API access token
  const getManagementAccessToken = async () => {
    try {
      const response = await fetch(`https://${config.domain}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          audience: config.audience,
          grant_type: "client_credentials",
          scope: "read:users read:users_app_metadata update:users_app_metadata create:users delete:users update:users read:roles create:role_members",
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get management token');
      }
      
      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Error getting management token:", error);
      return null;
    }
  };

  // Check user's role by fetching role members
  const getUserRole = async (userId, token) => {
    try {
      // Check if user has Admin role
      const adminResponse = await fetch(
        `${config.audience}roles/${config.adminRoleId}/users`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (adminResponse.ok) {
        const adminUsers = await adminResponse.json();
        const isAdmin = adminUsers.some(user => user.user_id === userId);
        if (isAdmin) return 'Admin';
      }

      // Check if user has User role
      const userResponse = await fetch(
        `${config.audience}roles/${config.userRoleId}/users`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (userResponse.ok) {
        const regularUsers = await userResponse.json();
        const isUser = regularUsers.some(user => user.user_id === userId);
        if (isUser) return 'User';
      }

      return 'No Role';
    } catch (error) {
      console.error("Error checking user role:", error);
      return 'Unknown';
    }
  };

  // Fetch all users from Auth0
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = await getManagementAccessToken();
      
      if (!token) {
        console.error("Failed to get management token");
        return;
      }

      // Fetch ALL users from Auth0
      const response = await fetch(`${config.audience}users`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const allUsers = await response.json();
      
      console.log("All users:", allUsers);

      // Map all users and check their roles
      const customersData = await Promise.all(
        allUsers.map(async (user) => {
          const role = await getUserRole(user.user_id, token);
          
          return {
            id: user.user_id,
            username: user.user_metadata?.username || user.username || user.email.split('@')[0],
            fullName: user.user_metadata?.username || user.username || user.email.split('@')[0],
            email: user.email,
            role: role,
            lastAccess: user.last_login 
              ? new Date(user.last_login).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
              : '—',
            status: user.blocked ? 'Blocked' : 'Active',
            auth0User: user
          };
        })
      );

      setCustomers(customersData);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isMenuButton = event.target.closest('.menu-button');
      const isMenuDropdown = event.target.closest('.menu-dropdown');
      
      if (!isMenuButton && !isMenuDropdown) {
        setOpenMenuId(null);
      }
      
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = customers
    .filter(c => 
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'date') {
        if (a.lastAccess === '—' && b.lastAccess === '—') return 0;
        if (a.lastAccess === '—') return 1;
        if (b.lastAccess === '—') return -1;
        return new Date(b.auth0User.last_login) - new Date(a.auth0User.last_login);
      }
      return 0;
    });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSelectCustomer = (id) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCustomers(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedCustomers.size} customer(s)?`)) {
      return;
    }

    try {
      const token = await getManagementAccessToken();
      
      if (!token) {
        alert('Failed to authenticate. Please try again.');
        return;
      }

      const deletePromises = Array.from(selectedCustomers).map(userId =>
        fetch(`${config.audience}users/${encodeURIComponent(userId)}`, {
          method: 'DELETE',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        })
      );

      await Promise.all(deletePromises);
      
      await fetchCustomers();
      setSelectedCustomers(new Set());
      setBulkActionsEnabled(false);
    } catch (error) {
      console.error("Error deleting customers:", error);
      alert('Failed to delete some customers. Please try again.');
    }
  };

  const handleExport = () => {
    const headers = ['Username', 'Email', 'Role', 'Last Access', 'Status'];
    const rows = filteredCustomers.map(c => [
      c.username,
      c.email,
      c.role,
      c.lastAccess,
      c.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
  };

  const handleAddCustomer = async () => {
    if (!formData.fullName || !formData.email || !formData.password) {
      alert('All fields are required.');
      return;
    }

    try {
      const token = await getManagementAccessToken();
      
      if (!token) {
        alert('Failed to authenticate. Please try again.');
        return;
      }

      const createResponse = await fetch(`${config.audience}users`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          connection: "Username-Password-Authentication",
          user_metadata: { 
            username: formData.fullName 
          },
          email_verified: false
        })
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      const newUser = await createResponse.json();

      // Assign "User" role to the new user
      await fetch(`${config.audience}roles/${config.userRoleId}/users`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          users: [newUser.user_id]
        })
      });

      await fetchCustomers();
      setFormData({ fullName: '', email: '', password: '' });
      setShowAddModal(false);
    } catch (error) {
      console.error("Error adding customer:", error);
      alert(error.message || 'Failed to add customer. Please try again.');
    }
  };

  const handleEditCustomer = async () => {
    if (!formData.email) {
      alert('Email is required.');
      return;
    }

    try {
      const token = await getManagementAccessToken();
      
      if (!token) {
        alert('Failed to authenticate. Please try again.');
        return;
      }

      const updateResponse = await fetch(
        `${config.audience}users/${encodeURIComponent(editingCustomer.id)}`,
        {
          method: 'PATCH',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email
          })
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      await fetchCustomers();
      setFormData({ fullName: '', email: '', password: '' });
      setShowEditModal(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error("Error updating customer:", error);
      alert(error.message || 'Failed to update customer. Please try again.');
    }
  };

  const handleResetPassword = async (customerEmail) => {
    try {
      const response = await fetch(
        `https://${config.domain}/dbconnections/change_password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: config.webClientId,
            email: customerEmail,
            connection: "Username-Password-Authentication",
          }),
        }
      );

      if (response.ok) {
        setOverlayMessage(`A reset link has been sent to ${customerEmail}. Please check your inbox.`);
        setIsOverlayOpen(true);
        setOpenMenuId(null);
        setTimeout(() => setIsOverlayOpen(false), 3000);
      } else {
        const errorData = await response.json();
        setOverlayMessage(errorData.error_description || "Failed to send reset email.");
        setIsOverlayOpen(true);
        setTimeout(() => setIsOverlayOpen(false), 3000);
      }
    } catch (error) {
      console.error("Error sending password reset email:", error);
      setOverlayMessage("Something went wrong. Please try again.");
      setIsOverlayOpen(true);
      setTimeout(() => setIsOverlayOpen(false), 3000);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      const token = await getManagementAccessToken();
      
      if (!token) {
        alert('Failed to authenticate. Please try again.');
        return;
      }

      const deleteResponse = await fetch(
        `${config.audience}users/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete user');
      }

      await fetchCustomers();
      setOpenMenuId(null);
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert('Failed to delete customer. Please try again.');
    }
  };

  const handleOpenEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      fullName: '',
      email: customer.email,
      password: ''
    });
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar currentPath="/customers" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">Customers</h1>
              <p className="text-sm text-gray-500">All Customers</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 placeholder-gray-500 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="px-3 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1 text-sm font-medium"
                >
                  Sort <ChevronDown className="w-4 h-4" />
                </button>
                {sortOpen && (
                  <div className="absolute left-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <button
                      onClick={() => {
                        setSortBy('name');
                        setSortOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 first:rounded-t-lg"
                    >
                      Sort A-Z
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('date');
                        setSortOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                    >
                      Sort by Date
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setBulkActionsEnabled(!bulkActionsEnabled)}
                className="px-3 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Bulk actions
              </button>

              {bulkActionsEnabled && selectedCustomers.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  Delete Selected ({selectedCustomers.size})
                </button>
              )}

              <button
                onClick={handleExport}
                className="px-3 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              <button
                onClick={() => {
                  setFormData({ fullName: '', email: '', password: '' });
                  setShowAddModal(true);
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading customers...</div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-white border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left w-12">
                        {bulkActionsEnabled && (
                          <input
                            type="checkbox"
                            onChange={handleSelectAll}
                            checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                            className="rounded border-gray-300 cursor-pointer"
                          />
                        )}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Username
                      </th>
                      {/* <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Role
                      </th> */}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Last access
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          No customers found
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((customer, index) => (
                        <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-left">
                            {bulkActionsEnabled && (
                              <input
                                type="checkbox"
                                checked={selectedCustomers.has(customer.id)}
                                onChange={() => handleSelectCustomer(customer.id)}
                                className="rounded border-gray-300 cursor-pointer"
                              />
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{customer.username}</div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                          </td>
                          {/* <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              customer.role === 'Admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : customer.role === 'User'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {customer.role}
                            </span>
                          </td> */}
                          <td className="px-6 py-4 text-sm text-gray-700">{customer.lastAccess}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              customer.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {customer.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === customer.id ? null : customer.id);
                              }}
                              className="menu-button text-gray-400 hover:text-gray-600 p-1 inline-flex items-center justify-center"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            {openMenuId === customer.id && (
                              <div 
                                className={`menu-dropdown absolute right-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 ${
                                  index >= filteredCustomers.length - 2 ? 'bottom-0' : 'top-0'
                                }`}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(customer);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 first:rounded-t-lg"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResetPassword(customer.email);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                                >
                                  Reset Password
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCustomer(customer.id);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Customer</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter password"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Edit Customer</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter email"
                />
              </div>
              <p className="text-xs text-gray-500">
                Note: To reset password, use the "Reset Password" option from the menu.
              </p>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditCustomer}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Message */}
      {isOverlayOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
              Password Reset
            </h2>
            <p className="text-gray-600 text-sm" style={{ fontFamily: 'Inter' }}>
              {overlayMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}