import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import formsAPI from '../services/formsApi';

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
  
  const [newForm, setNewForm] = useState({
    name: '',
    description: '',
    type: 'survey',
    active: true
  });

  // Load forms on component mount
  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      setError('');
      const formsArray = await formsAPI.getAllForms();
      
      // API returns array directly, transform to match UI expectations
      const transformedForms = formsArray.map(form => ({
        id: form._id,
        name: form.name,
        workspace: '', // No default workspace
        status: form.active ? 'Active' : 'Inactive',
        description: form.description,
        type: form.type
      }));
      
      setForms(transformedForms);
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
    
    try {
      setLoading(true);
      setError('');
      
      // Delete selected forms
      await formsAPI.bulkDeleteForms(selectedForms);
      
      // Reload forms to get fresh data
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
      ['Name', 'Workspace', 'Status'],
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

  const handleAddForm = async () => {
    if (!newForm.name.trim()) {
      setError('Form name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Prepare data for API
      const formData = {
        name: newForm.name,
        description: newForm.description || '',
        type: newForm.type || 'survey',
        active: newForm.active
      };
      
      // Create new form - API returns {message, form}
      const response = await formsAPI.createForm(formData);
      console.log('Form created:', response);
      
      // Reload forms to get fresh data with IDs from server
      await loadForms();
      
      setShowAddForm(false);
      setNewForm({
        name: '',
        description: '',
        type: 'survey',
        active: true
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
      
      // Prepare data for API
      const formData = {
        name: newForm.name,
        description: newForm.description || '',
        type: newForm.type || 'survey',
        active: newForm.active
      };
      
      // Update form
      await formsAPI.updateForm(editingForm.id, formData);
      
      // Reload forms to get fresh data
      await loadForms();
      
      setShowEditForm(false);
      setEditingForm(null);
      setNewForm({
        name: '',
        description: '',
        type: 'survey',
        active: true
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
      description: form.description || 'Form for collecting user information and registration data.',
      type: form.type || 'survey',
      active: form.status === 'Active'
    });
    setShowEditForm(true);
    setActiveDropdown(null);
  };

  const handleStatusChange = async (formId, newStatus) => {
    try {
      setError('');
      
      // Find the form to get its current data
      const form = forms.find(f => f.id === formId);
      if (!form) return;
      
      // Prepare data for API - send complete form data with updated status
      const formData = {
        name: form.name,
        description: form.description || '',
        type: form.type || 'survey',
        active: newStatus === 'Active'
      };
      
      // Update form status
      await formsAPI.updateForm(formId, formData);
      
      // Update local state optimistically
      setForms(prev => prev.map(f => 
        f.id === formId ? { ...f, status: newStatus } : f
      ));
      
      setActiveDropdown(null);
    } catch (err) {
      setError('Failed to update form status. Please try again.');
      console.error('Error updating form status:', err);
    }
  };

  const filteredForms = forms.filter(form =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
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
            
            {/* Error Message */}
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
                      Delete Selected
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
                          <div>
                            <div 
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
                              onClick={() => navigate(`/forms/${form.id}`)}
                            >
                              {form.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {form.status === 'Active' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Inactive
                            </span>
                          )}
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
                                    onClick={() => handleStatusChange(form.id, 'Active')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Mark as Active
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(form.id, 'Inactive')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Mark as Inactive
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

      {/* Add/Edit Form Modal */}
      {(showAddForm || showEditForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {showEditForm ? newForm.name : 'Add Form'}
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
                
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.active}
                      onChange={(e) => setNewForm({...newForm, active: e.target.checked})}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      newForm.active ? 'bg-blue-600' : 'bg-gray-200'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        newForm.active ? 'translate-x-5' : 'translate-x-0.5'
                      } mt-0.5`}>
                      </div>
                    </div>
                  </label>
                  <span className="text-sm text-gray-700">This form is active</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setShowEditForm(false);
                  setEditingForm(null);
                  setNewForm({
                    name: '',
                    description: '',
                    type: 'survey',
                    active: true
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
    </div>
  );
}
