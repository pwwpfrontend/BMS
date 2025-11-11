import { useState, useEffect } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, ContentState, convertToRaw, convertFromHTML } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

import Sidebar from '../components/Sidebar';

const BASE_URL = 'https://njs-01.optimuslab.space/booking_features';

function getAuthHeaders() {
  // Use the access_token issued for the backend API; avoid id_token/token keys
  const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('access_token'))
    || (typeof localStorage !== 'undefined' && localStorage.getItem('access_token'));
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [forms, setForms] = useState([]);
  const [formTypes, setFormTypes] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [currentFontSize, setCurrentFontSize] = useState(14);
  
  const [newPlan, setNewPlan] = useState({
    name: '',
    formType: '',
    selectedFormId: '',
    price: '',
    every: '24',
    period: 'months',
    discount: 'no',
    discountPercent: '20',
    description: ''
  });

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/plans`, { headers: { Accept: 'application/json', ...getAuthHeaders() } });
      const data = await response.json();
      const plansArray = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      
      const formattedPlans = plansArray.map(plan => ({
        id: plan._id,
        name: plan.name,
        formType: plan.formType,
        price: `HK$${Number(plan.price ?? 0).toFixed(2)}`,
        frequency: `every ${Number(plan.durationMonths ?? 1)} ${Number(plan.durationMonths ?? 1) === 1 ? 'month' : 'months'}`,
        status: Boolean(plan.active) ? 'Published' : 'Internal',
        description: plan.description,
        discountPercent: Number(plan.discountPercent ?? 0),
        durationMonths: Number(plan.durationMonths ?? 1),
        rawData: plan
      }));
      
      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const response = await fetch(`${BASE_URL}/forms`, { headers: { Accept: 'application/json', ...getAuthHeaders() } });
      const data = await response.json();
      const formsArray = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setForms(formsArray);
      
      const uniqueTypes = [...new Set(formsArray.map(form => form.type).filter(Boolean))];
      setFormTypes(uniqueTypes);
    } catch (error) {
      console.error('Error fetching forms:', error);
      setForms([]);
      setFormTypes([]);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchForms();
  }, []);

  const handleBulkToggle = () => {
    setBulkMode(!bulkMode);
    setSelectedPlans([]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPlans(filteredPlans.map(plan => plan.id));
    } else {
      setSelectedPlans([]);
    }
  };

  const handleSelectPlan = (planId) => {
    setSelectedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedPlans.length} plan(s)?`)) {
      return;
    }

    try {
      for (const planId of selectedPlans) {
        await fetch(`${BASE_URL}/plans/${planId}`, { method: 'DELETE', headers: { Accept: 'application/json', ...getAuthHeaders() } });
      }
      
      await fetchPlans();
      setSelectedPlans([]);
      setBulkMode(false);
    } catch (error) {
      console.error('Error deleting plans:', error);
      alert('Failed to delete plans');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Form Type', 'Price', 'Frequency', 'Status'],
      ...plans.map(plan => [
        plan.name,
        plan.formType,
        plan.price,
        plan.frequency,
        plan.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plans-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddPlan = async () => {
    try {
      let durationMonths = parseInt(newPlan.every);
      if (newPlan.period === 'weeks') {
        durationMonths = Math.round(durationMonths / 4);
      } else if (newPlan.period === 'years') {
        durationMonths = durationMonths * 12;
      }

      const planData = {
        name: newPlan.name,
        description: newPlan.description,
        price: parseFloat(newPlan.price || 0),
        formType: newPlan.formType,
        frequency: 'monthly',
        durationMonths: durationMonths,
        discountPercent: newPlan.discount === 'yes' ? parseInt(newPlan.discountPercent) : 0,
        active: true
      };

      const response = await fetch(`${BASE_URL}/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(planData)
      });

      if (!response.ok) {
        let msg = 'Failed to create plan';
        try { msg = (await response.json()).message || msg; } catch {
          try { msg = await response.text() || msg; } catch {}
        }
        throw new Error(msg);
      }

      await fetchPlans();
      setShowAddPlan(false);
      resetForm();
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('Failed to create plan');
    }
  };

  const handleEditPlan = async () => {
    try {
      let durationMonths = parseInt(newPlan.every);
      if (newPlan.period === 'weeks') {
        durationMonths = Math.round(durationMonths / 4);
      } else if (newPlan.period === 'years') {
        durationMonths = durationMonths * 12;
      }

      const planData = {
        name: newPlan.name,
        description: newPlan.description,
        price: parseFloat(newPlan.price || 0),
        formType: newPlan.formType,
        frequency: 'monthly',
        durationMonths: durationMonths,
        discountPercent: newPlan.discount === 'yes' ? parseInt(newPlan.discountPercent) : 0,
        active: editingPlan.status === 'Published'
      };

      const response = await fetch(`${BASE_URL}/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(planData)
      });

      if (!response.ok) {
        let msg = 'Failed to update plan';
        try { msg = (await response.json()).message || msg; } catch {
          try { msg = await response.text() || msg; } catch {}
        }
        throw new Error(msg);
      }

      await fetchPlans();
      setShowEditPlan(false);
      setEditingPlan(null);
      resetForm();
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Failed to update plan');
    }
  };

  const resetForm = () => {
    setNewPlan({
      name: '',
      formType: '',
      selectedFormId: '',
      price: '',
      every: '24',
      period: 'months',
      discount: 'no',
      discountPercent: '20',
      description: ''
    });
    setEditorState(EditorState.createEmpty());
    setCurrentFontSize(14);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    
    let every = plan.durationMonths;
    let period = 'months';
    
    if (plan.durationMonths >= 12 && plan.durationMonths % 12 === 0) {
      every = plan.durationMonths / 12;
      period = 'years';
    }

    if (plan.description) {
      const blocksFromHTML = convertFromHTML(plan.description);
      const contentState = ContentState.createFromBlockArray(
        blocksFromHTML.contentBlocks,
        blocksFromHTML.entityMap
      );
      setEditorState(EditorState.createWithContent(contentState));
    } else {
      setEditorState(EditorState.createEmpty());
    }

    setNewPlan({
      name: plan.name,
      formType: plan.formType || '',
      selectedFormId: (forms.find(f => f.type === (plan.formType || ''))?._id) || '',
      price: plan.price.replace('HK$', ''),
      every: String(every),
      period: period,
      discount: plan.discountPercent > 0 ? 'yes' : 'no',
      discountPercent: String(plan.discountPercent || 20),
      description: plan.description || ''
    });
    setShowEditPlan(true);
    setActiveDropdown(null);
  };

  const handleStatusChange = async (planId, newStatus) => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      const active = newStatus === 'Published';
      
      const response = await fetch(`${BASE_URL}/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          ...plan.rawData,
          active: active
        })
      });

      if (!response.ok) {
        let msg = 'Failed to update status';
        try { msg = (await response.json()).message || msg; } catch {}
        throw new Error(msg);
      }

      await fetchPlans();
      setActiveDropdown(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleFormSelectChange = (formId) => {
    const selected = forms.find(f => f._id === formId);
    setNewPlan(prev => ({ ...prev, selectedFormId: formId, formType: selected?.type || '' }));
  };

  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onEditorStateChange = (newEditorState) => {
    setEditorState(newEditorState);
    const html = draftToHtml(convertToRaw(newEditorState.getCurrentContent()));
    setNewPlan(prev => ({ ...prev, description: html }));
  };

  const handleFontSizeIncrease = () => {
    if (currentFontSize < 48) {
      setCurrentFontSize(prev => prev + 2);
    }
  };

  const handleFontSizeDecrease = () => {
    if (currentFontSize > 8) {
      setCurrentFontSize(prev => prev - 2);
    }
  };

  const isFormValid = () => {
    return newPlan.name.trim() !== '' && 
           newPlan.price !== '' && 
           newPlan.formType !== '';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar currentPath="/plans" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">Plans</h1>
                <p className="text-sm text-gray-500 mt-1">All Plans</p>
              </div>
              <div className="text-lg font-medium text-gray-700">{currentTime}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Sort
                  </button>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2.5 w-96 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBulkToggle}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg ${
                      bulkMode 
                        ? 'bg-gray-200 text-gray-900 border-gray-400' 
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="11" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="2" y="11" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="11" y="11" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    Bulk actions
                  </button>
                  {bulkMode && selectedPlans.length > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Delete Selected ({selectedPlans.length})
                    </button>
                  )}
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 2v10m0 0L6 9m3 3l3-3M3 13v1.5A1.5 1.5 0 004.5 16h9a1.5 1.5 0 001.5-1.5V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Export
                  </button>
                  <button
                    onClick={() => {
                      setShowAddPlan(true);
                      setEditorState(EditorState.createEmpty());
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 3.5v11M3.5 9h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Add Plan
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3.5 text-left">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {bulkMode && (
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300"
                              checked={selectedPlans.length === filteredPlans.length && filteredPlans.length > 0}
                              onChange={handleSelectAll}
                            />
                          )}
                          <span>Name</span>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 4v6M4.5 7.5L7 10l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Frequency</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3.5 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          Loading plans...
                        </td>
                      </tr>
                    ) : filteredPlans.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          No plans found
                        </td>
                      </tr>
                    ) : (
                      filteredPlans.map((plan) => (
                        <tr 
                          key={plan.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={(e) => {
                            if (!e.target.closest('input') && !e.target.closest('button')) {
                              openEditModal(plan);
                            }
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {bulkMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedPlans.includes(plan.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleSelectPlan(plan.id);
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{plan.name}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M7 12.5A5.5 5.5 0 107 1.5a5.5 5.5 0 000 11zm0-2.75v-2.5M7 4.5h.005" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                  </svg>
                                  {plan.formType}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{plan.price}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{plan.frequency}</td>
                          <td className="px-6 py-4">
                            {plan.status === 'Published' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                                  <circle cx="4" cy="4" r="3"/>
                                </svg>
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M6 3v3m0 2h.01M11 6A5 5 0 111 6a5 5 0 0110 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                Internal
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(activeDropdown === plan.id ? null : plan.id);
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1"
                              >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                  <circle cx="10" cy="4" r="1.5"/>
                                  <circle cx="10" cy="10" r="1.5"/>
                                  <circle cx="10" cy="16" r="1.5"/>
                                </svg>
                              </button>
                              {activeDropdown === plan.id && (
                                <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                  <div className="py-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(plan);
                                      }}
                                      className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      Edit
                                    </button>
                                    {plan.status !== 'Published' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(plan.id, 'Published');
                                        }}
                                        className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        Mark as Published
                                      </button>
                                    )}
                                    {plan.status !== 'Internal' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(plan.id, 'Internal');
                                        }}
                                        className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        Mark as Internal
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Rows per page:</span>
                  <select className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>15</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded hover:bg-gray-100" disabled>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M12.5 15l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-orange-500">1</span>
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded hover:bg-gray-100" disabled>
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

      {/* Add/Edit Plan Modal */}
      {(showAddPlan || showEditPlan) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
            <div className="sticky top-0 bg-white px-7 py-5 border-b border-gray-200 flex justify-between items-center rounded-t-xl z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {showEditPlan ? newPlan.name || 'Edit Plan' : 'Create New Plan'}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setShowAddPlan(false);
                  setShowEditPlan(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="px-7 py-6 max-h-[calc(90vh-180px)] overflow-y-auto">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Plan name
                    </label>
                    <input
                      type="text"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                      placeholder="Enter plan name"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Associate form
                    </label>
                    <select
                      value={newPlan.selectedFormId}
                      onChange={(e) => handleFormSelectChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a form</option>
                      {forms.map((form) => (
                        <option key={form._id} value={form._id}>
                          {form.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Pricing</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Plans can be priced per any number of weeks, months or years. Customers with an active contract for this plan will be invoiced this amount every this number of periods.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (HK$)
                      </label>
                      <input
                        type="number"
                        value={newPlan.price}
                        onChange={(e) => setNewPlan({...newPlan, price: e.target.value})}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Every
                      </label>
                      <input
                        type="number"
                        value={newPlan.every}
                        onChange={(e) => setNewPlan({...newPlan, every: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Period
                      </label>
                      <select
                        value={newPlan.period}
                        onChange={(e) => setNewPlan({...newPlan, period: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="weeks">weeks</option>
                        <option value="months">months</option>
                        <option value="years">years</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Discounts</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select if customers in this plan are eligible to discounts when making bookings, purchasing passes or other charges.
                  </p>
                  
                  <div className="space-y-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="discount"
                        value="no"
                        checked={newPlan.discount === 'no'}
                        onChange={(e) => setNewPlan({...newPlan, discount: e.target.value})}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        Members in this plan do not get a discount in their bookings
                      </span>
                    </label>
                    
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="discount"
                        value="yes"
                        checked={newPlan.discount === 'yes'}
                        onChange={(e) => setNewPlan({...newPlan, discount: e.target.value})}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 flex items-center gap-2">
                        Members in this plan get
                        <div className="relative inline-block">
                          <input
                            type="number"
                            value={newPlan.discountPercent}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                                setNewPlan({...newPlan, discountPercent: val});
                              }
                            }}
                            disabled={newPlan.discount === 'no'}
                            className="w-20 px-3 py-1.5 pr-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="20"
                            min="0"
                            max="100"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">%</span>
                        </div>
                        off their bookings
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Plan description
                  </label>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <Editor
                      editorState={editorState}
                      onEditorStateChange={onEditorStateChange}
                      wrapperClassName="demo-wrapper"
                      editorClassName="demo-editor"
                      editorStyle={{ fontSize: `${currentFontSize}px` }}
                      toolbar={{
                        options: ['inline', 'list', 'textAlign'],
                        inline: {
                          options: ['bold', 'italic', 'underline', 'strikethrough']
                        },
                        list: {
                          options: ['unordered', 'ordered']
                        },
                        textAlign: {
                          options: ['left', 'center', 'right', 'justify']
                        }
                      }}
                      toolbarCustomButtons={[
                        <button
                          key="font-decrease"
                          onClick={handleFontSizeDecrease}
                          disabled={currentFontSize <= 8}
                          className="rdw-option-wrapper"
                          title="Decrease Font Size"
                          style={{ border: 'none', padding: '7px', minWidth: '35px' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <text x="2" y="14" fontSize="12" fontWeight="bold" fill="currentColor">A-</text>
                          </svg>
                        </button>,
                        <div key="font-size-display" className="rdw-option-wrapper" style={{ border: 'none', padding: '7px', minWidth: '35px', cursor: 'default' }}>
                          <span style={{ fontSize: '11px', fontWeight: '500' }}>{currentFontSize}px</span>
                        </div>,
                        <button
                          key="font-increase"
                          onClick={handleFontSizeIncrease}
                          disabled={currentFontSize >= 48}
                          className="rdw-option-wrapper"
                          title="Increase Font Size"
                          style={{ border: 'none', padding: '7px', minWidth: '35px' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <text x="2" y="14" fontSize="14" fontWeight="bold" fill="currentColor">A+</text>
                          </svg>
                        </button>
                      ]}
                    />
                  </div>
                  {newPlan.description && newPlan.description !== '<p></p>\n' && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Preview:</p>
                      <div 
                        className="prose prose-sm max-w-none text-sm text-gray-700"
                        dangerouslySetInnerHTML={{ __html: newPlan.description }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-7 py-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowAddPlan(false);
                  setShowEditPlan(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Discard Changes
              </button>
              <button
                onClick={showEditPlan ? handleEditPlan : handleAddPlan}
                disabled={!isFormValid()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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