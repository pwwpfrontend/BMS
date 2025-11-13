import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import formsAPI from '../services/formsApi';

function getAccessToken() {
  const ss = (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem('access_token') : null;
  const ls = (typeof localStorage !== 'undefined') ? localStorage.getItem('access_token') : null;
  const win = (typeof window !== 'undefined') ? (window.ACCESS_TOKEN || window.BEARER_TOKEN) : null;
  const env = (typeof process !== 'undefined' && process.env) ? process.env.REACT_APP_API_BEARER_TOKEN : null;
  return ss || ls || win || env || '';
}

export default function Forms() {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedForms, setSelectedForms] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendingForm, setSendingForm] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [availableFormTypes, setAvailableFormTypes] = useState([]);
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [newTypeValue, setNewTypeValue] = useState('');
  
  const [newForm, setNewForm] = useState({
    name: '',
    description: '',
    type: '',
    fields: []
  });

  const [sendFormData, setSendFormData] = useState({
    customer: '',
    customerEmail: '',
    form: '',
    formId: '',
    emailNotification: true
  });

  // Auth0 configuration for fetching customers
  const auth0Config = {
    domain: "bms-optimus.us.auth0.com",
    clientId: "x3UIh4PsAjdW1Y0uTmjDUk5VIA36iQ12",
    clientSecret: "xYfZ6lk_kJoLy73sgh3jAY_4U4bMnwm58EjN97Ozw-JcsQTs36JpA2UM4C2xVn-r",
    audience: "https://bms-optimus.us.auth0.com/api/v2/",
    userRoleId: "rol_FdjheKGmIFxzp6hR"
  };

  // Fetch Management API access token
  const getManagementAccessToken = async () => {
    try {
      const response = await fetch(`https://${auth0Config.domain}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: auth0Config.clientId,
          client_secret: auth0Config.clientSecret,
          audience: auth0Config.audience,
          grant_type: "client_credentials",
          scope: "read:users read:users_app_metadata read:roles",
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

  // Fetch customers from Auth0
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const token = await getManagementAccessToken();
      
      if (!token) {
        console.error("Failed to get management token");
        return;
      }

      const roleUsersResponse = await fetch(
        `${auth0Config.audience}roles/${auth0Config.userRoleId}/users`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!roleUsersResponse.ok) {
        throw new Error('Failed to fetch users with User role');
      }

      const roleUsers = await roleUsersResponse.json();
      
      const customersData = roleUsers.map(user => ({
        id: user.user_id,
        name: user.user_metadata?.username || user.name || user.email.split('@')[0],
        email: user.email
      }));

      setCustomers(customersData);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Load forms on component mount
  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      setError('');
      const token = getAccessToken();
      const formsArray = await formsAPI.getAllForms(token);
      
      const transformedForms = formsArray.map(form => ({
        id: form._id,
        name: form.name,
        workspace: form.type || '',
        status: form.active ? 'Active' : 'Inactive',
        description: form.description,
        type: form.type,
        active: form.active !== undefined ? form.active : true,
        fields: form.fields || []
      }));
      
      setForms(transformedForms);
      
      // Extract unique form types from the API response
      const uniqueTypes = [...new Set(formsArray.map(form => form.type).filter(type => type))];
      setAvailableFormTypes(uniqueTypes);
      
    } catch (err) {
      setError('Failed to load forms. Please try again.');
      console.error('Error loading forms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkToggle = () => {
    setBulkMode(!bulkMode);
    setSelectedForms([]);
  };

  const handleSelectForm = (formId) => {
    setSelectedForms(prev => 
      prev.includes(formId) 
        ? prev.filter(id => id !== formId)
        : [...prev, formId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedForms.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedForms.length} form(s)?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = getAccessToken();
      await formsAPI.bulkDeleteForms(selectedForms, token);
      await loadForms();
      
      setSelectedForms([]);
      setBulkMode(false);
    } catch (err) {
      setError('Failed to delete forms. Please try again.');
      console.error('Error deleting forms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Type', 'Status'],
      ...forms.map(form => [
        form.name,
        form.workspace,
        form.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forms.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFormTypeChange = (e) => {
    const value = e.target.value;
    if (value === '__new__') {
      setShowNewTypeInput(true);
      setNewTypeValue('');
      setNewForm({...newForm, type: ''});
    } else {
      setShowNewTypeInput(false);
      setNewForm({...newForm, type: value});
    }
  };

  const handleNewTypeValueChange = (e) => {
    const value = e.target.value;
    setNewTypeValue(value);
    setNewForm({...newForm, type: value});
  };

  const handleAddForm = async () => {
    if (!newForm.name.trim()) {
      setError('Form name is required');
      return;
    }
    
    if (!newForm.type) {
      setError('Form type is required');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const formData = {
        name: newForm.name,
        description: newForm.description || 'Form for collecting user information',
        type: newForm.type,
        fields: newForm.fields || [],
        active: true
      };
      
      const token = getAccessToken();
      const response = await formsAPI.createForm(formData, token);
      console.log('Form created:', response);
      
      await loadForms();
      
      setShowAddForm(false);
      setShowNewTypeInput(false);
      setNewTypeValue('');
      setNewForm({
        name: '',
        description: '',
        type: '',
        fields: []
      });
    } catch (err) {
      setError('Failed to create form. Please try again.');
      console.error('Error creating form:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditForm = async () => {
    if (!newForm.name.trim()) {
      setError('Form name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const formData = {
        name: newForm.name,
        description: newForm.description || '',
        type: newForm.type || 'feedback'
      };
      
      const token = getAccessToken();
      await formsAPI.updateForm(editingForm.id, formData, token);
      await loadForms();
      
      setShowEditForm(false);
      setEditingForm(null);
      setNewForm({
        name: '',
        description: '',
        type: '',
        fields: []
      });
    } catch (err) {
      setError('Failed to update form. Please try again.');
      console.error('Error updating form:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (form) => {
    setEditingForm(form);
    setNewForm({
      name: form.name,
      description: form.description || 'Form for collecting user information',
      type: form.type || '',
      fields: form.fields || []
    });
    setShowEditForm(true);
    setActiveDropdown(null);
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form?')) {
      return;
    }

    try {
      setError('');
      const token = getAccessToken();
      await formsAPI.deleteForm(formId, token);
      await loadForms();
      setActiveDropdown(null);
    } catch (err) {
      setError('Failed to delete form. Please try again.');
      console.error('Error deleting form:', err);
    }
  };

  const handleToggleFormStatus = async (form) => {
    try {
      setError('');
      const newStatus = !form.active;
      const token = getAccessToken();
      await formsAPI.toggleFormStatus(form.id, newStatus, token);
      await loadForms();
      setActiveDropdown(null);
    } catch (err) {
      setError('Failed to toggle form status. Please try again.');
      console.error('Error toggling form status:', err);
    }
  };

  const openSendFormModal = (form) => {
    setSendingForm(form);
    setSendFormData({
      customer: '',
      customerEmail: '',
      form: form.name,
      formId: form.id,
      emailNotification: true
    });
    setShowSendForm(true);
    setActiveDropdown(null);
    fetchCustomers();
  };

  const handleSendForm = async () => {
    if (!sendFormData.customerEmail || !sendFormData.formId) {
      setError('Please select a customer and ensure form is selected');
      return;
    }

    try {
      setError('');
      const selectedCustomer = customers.find(c => c.email === sendFormData.customerEmail);
      
      const result = await formsAPI.sendFormToCustomer(
        sendFormData.formId,
        sendFormData.customerEmail,
        selectedCustomer ? selectedCustomer.name : sendFormData.customer
      );
      
      console.log('Form sent successfully:', result);
      
      setShowSendForm(false);
      setSendFormData({
        customer: '',
        customerEmail: '',
        form: '',
        formId: '',
        emailNotification: true
      });
      setSendingForm(null);
      
      alert('Form sent successfully to customer!');
    } catch (err) {
      setError('Failed to send form. Please try again.');
      console.error('Error sending form:', err);
    }
  };

  const filteredForms = forms.filter(form =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && forms.length === 0) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar currentPath="/forms" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading forms...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar currentPath="/forms" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Forms</h1>
                <p className="text-sm text-gray-500 mt-1">All Forms</p>
              </div>
            </div>
            
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="text-sm text-red-600">{error}</div>
                  <button 
                    onClick={() => setError('')}
                    className="ml-auto text-red-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Sort
                  </button>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 w-80 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBulkToggle}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    Bulk actions
                  </button>
                  {bulkMode && selectedForms.length > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="px-3 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                      Delete Selected ({selectedForms.length})
                    </button>
                  )}
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v8m0 0L5.5 7.5M8 10l2.5-2.5M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Export
                  </button>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Add Form
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {bulkMode && (
                        <th className="w-12 px-4 py-3"></th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          Name
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 3v6M3.5 6.5L6 9l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredForms.map((form) => (
                      <tr key={form.id} className="hover:bg-gray-50">
                        {bulkMode && (
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedForms.includes(form.id)}
                              onChange={() => handleSelectForm(form.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                        )}
                        <td className="px-4 py-4">
                          <div 
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
                            onClick={() => navigate(`/forms/${form.id}`)}
                          >
                            {form.name}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {form.workspace}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            form.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                            {form.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative">
                            <button
                              onClick={() => setActiveDropdown(activeDropdown === form.id ? null : form.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="8" cy="3" r="1.5"/>
                                <circle cx="8" cy="8" r="1.5"/>
                                <circle cx="8" cy="13" r="1.5"/>
                              </svg>
                            </button>
                            {activeDropdown === form.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => openEditModal(form)}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleToggleFormStatus(form)}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    {form.active ? 'Mark as Inactive' : 'Mark as Active'}
                                  </button>
                                  {/* <button
                                    onClick={() => openSendFormModal(form)}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Send Form
                                  </button> */}
                                  <button
                                    onClick={() => handleDeleteForm(form.id)}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Rows per page:</span>
                  <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option>15</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <button className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" disabled>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M12.5 15l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-blue-600">1</span>
                  <button className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" disabled>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M7.5 15l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {(showAddForm || showEditForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {showEditForm ? 'Edit Form' : 'Add Form'}
                  </h2>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Form details</h3>
                <p className="text-sm text-gray-600">
                  Forms are a set of questions you can send to specific customers or publish online for users to complete.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) => setNewForm({...newForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter form name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newForm.description}
                    onChange={(e) => setNewForm({...newForm, description: e.target.value})}
                    className="w-full px-3 py-2 min-h-[100px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter form description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Form Type
                  </label>
                  <select
                    value={showNewTypeInput ? '__new__' : newForm.type}
                    onChange={handleFormTypeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a type</option>
                    {availableFormTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    {showAddForm && <option value="__new__">+ Add new type</option>}
                  </select>
                  {showNewTypeInput && (
                    <input
                      type="text"
                      value={newTypeValue}
                      onChange={handleNewTypeValueChange}
                      placeholder="Enter new form type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setShowEditForm(false);
                  setEditingForm(null);
                  setShowNewTypeInput(false);
                  setNewTypeValue('');
                  setNewForm({
                    name: '',
                    description: '',
                    type: '',
                    fields: []
                  });
                }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Discard Changes
              </button>
              <button
                onClick={showEditForm ? handleEditForm : handleAddForm}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md my-8 mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Send form</h2>
            </div>

            <div className="px-6 py-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Form request</h3>
                <p className="text-sm text-gray-600">
                  Select the form you want to send to the customer. Their responses are available below once they complete the form.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer
                  </label>
                  {loadingCustomers ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                      Loading customers...
                    </div>
                  ) : (
                    <select
                      value={sendFormData.customerEmail}
                      onChange={(e) => {
                        const selectedCustomer = customers.find(c => c.email === e.target.value);
                        setSendFormData({
                          ...sendFormData, 
                          customer: selectedCustomer ? selectedCustomer.name : '',
                          customerEmail: e.target.value
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.email}>
                          {customer.name} ({customer.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Form
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
                    {sendFormData.form || 'Current Form'}
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Email notification</h4>
                  <p className="text-sm text-blue-800">
                    Saving this record sends an email notification to the customer, prompting them to complete the form.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSendForm(false);
                  setSendFormData({
                    customer: '',
                    customerEmail: '',
                    form: '',
                    formId: '',
                    emailNotification: true
                  });
                  setSendingForm(null);
                }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendForm}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Send form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}