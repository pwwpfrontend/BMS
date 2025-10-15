import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Download, UserPlus, MoreVertical, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const dummyCustomers = [
  {
    id: 1,
    fullName: 'Andrea Tang',
    email: 'andreatang@cuhk.edu.hk',
    lastAccess: 'Thursday, 18 April 2024 1:36 PM',
    status: 'Active'
  },
  {
    id: 2,
    fullName: 'Andreas Zheng',
    email: 'andreaszheng@ink.cuhk.edu.hk',
    lastAccess: 'Tuesday, 18 April 2023 3:20 PM',
    status: 'Active'
  },
  {
    id: 3,
    fullName: 'Andrew',
    email: 'lamhohei51@gmail.com',
    lastAccess: '—',
    status: 'Active'
  },
  {
    id: 4,
    fullName: 'Andrewwai',
    email: 'Skywal20022001@yahoo.com.hk',
    lastAccess: '—',
    status: 'Active'
  },
  {
    id: 5,
    fullName: 'Andy',
    email: 'andykunkwanhang@gmail.com',
    lastAccess: '—',
    status: 'Active'
  },
  {
    id: 6,
    fullName: 'Andy',
    email: 'andy.laulh@gmail.com',
    lastAccess: 'Wednesday, 19 March 2025 12:15 PM',
    status: 'Active'
  },
  {
    id: 7,
    fullName: 'Andy',
    email: 'andychanqhan0723@gmail.com',
    lastAccess: '—',
    status: 'Active'
  },
  {
    id: 8,
    fullName: 'Andy Chen',
    email: 'andychen81@gmail.com',
    lastAccess: 'Wednesday, 19 March 2025 11:00 AM',
    status: 'Active'
  },
  {
    id: 9,
    fullName: 'Andy Fung',
    email: 'Andyfung817@yahoo.com.hk',
    lastAccess: '—',
    status: 'Active'
  },
  {
    id: 10,
    fullName: 'Andy Li',
    email: 'andyck121@gmail.com',
    lastAccess: '—',
    status: 'Active'
  },
  {
    id: 11,
    fullName: 'Andy ng',
    email: 'andynghoyin@gmail.com',
    lastAccess: '—',
    status: 'Active'
  },
  {
    id: 12,
    fullName: 'andyhkcps',
    email: 'andyhkcps@gmail.com',
    lastAccess: '—',
    status: 'Active'
  }
];

export default function Customers() {
  const [customers, setCustomers] = useState(dummyCustomers);
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [bulkActionsEnabled, setBulkActionsEnabled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);
  const menuRef = useRef(null);
  const sortRef = useRef(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'date') {
        if (a.lastAccess === '—' && b.lastAccess === '—') return 0;
        if (a.lastAccess === '—') return 1;
        if (b.lastAccess === '—') return -1;
        return new Date(b.lastAccess) - new Date(a.lastAccess);
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

  const handleBulkDelete = () => {
    setCustomers(customers.filter(c => !selectedCustomers.has(c.id)));
    setSelectedCustomers(new Set());
    setBulkActionsEnabled(false);
  };

  const handleExport = () => {
    const headers = ['Full Name', 'Email', 'Last Access', 'Status'];
    const rows = filteredCustomers.map(c => [
      c.fullName,
      c.email,
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

  const handleAddCustomer = () => {
    if (formData.fullName && formData.email && formData.password) {
      setCustomers([
        ...customers,
        {
          id: Math.max(...customers.map(c => c.id), 0) + 1,
          fullName: formData.fullName,
          email: formData.email,
          lastAccess: '—',
          status: 'Active'
        }
      ]);
      setFormData({ fullName: '', email: '', password: '' });
      setShowAddModal(false);
    }
  };

  const handleEditCustomer = () => {
    setCustomers(customers.map(c => 
      c.id === editingCustomer.id 
        ? { ...c, fullName: formData.fullName, email: formData.email }
        : c
    ));
    setFormData({ fullName: '', email: '', password: '' });
    setShowEditModal(false);
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = (id) => {
    setCustomers(customers.filter(c => c.id !== id));
    setOpenMenuId(null);
  };

  const handleOpenEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      fullName: customer.fullName,
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
                      Full name
                    </th>
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
                  {filteredCustomers.map((customer) => (
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
                        <div className="text-sm font-medium text-gray-900">{customer.fullName}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{customer.lastAccess}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <div ref={menuRef}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                            className="text-gray-400 hover:text-gray-600 p-1 inline-flex items-center justify-center"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenuId === customer.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                              <button
                                onClick={() => handleOpenEditModal(customer)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 first:rounded-t-lg"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCustomer(customer.id)}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter full name"
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
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter full name"
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
    </div>
  );
}