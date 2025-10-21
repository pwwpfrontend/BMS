import { useState, useEffect, useRef } from 'react';

// Sidebar component - import from your actual component
import Sidebar from '../components/Sidebar';

const BASE_URL = 'https://njs-01.optimuslab.space';

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
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const editorRef = useRef(null);
  
  const [newPlan, setNewPlan] = useState({
    name: '',
    formType: '',
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

  // Fetch all plans
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/bhms/plans`);
      const data = await response.json();
      
      const formattedPlans = data.map(plan => ({
        id: plan._id,
        name: plan.name,
        formType: plan.formType,
        price: `HK$${plan.price.toFixed(2)}`,
        frequency: `every ${plan.durationMonths} ${plan.durationMonths === 1 ? 'month' : 'months'}`,
        status: plan.active ? 'Published' : 'Internal',
        description: plan.description,
        discountPercent: plan.discountPercent,
        durationMonths: plan.durationMonths,
        rawData: plan
      }));
      
      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all forms
  const fetchForms = async () => {
    try {
      const response = await fetch(`${BASE_URL}/bhms/forms`);
      const data = await response.json();
      setForms(data);
      
      // Extract unique form types
      const uniqueTypes = [...new Set(data.map(form => form.type).filter(Boolean))];
      setFormTypes(uniqueTypes);
    } catch (error) {
      console.error('Error fetching forms:', error);
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
        await fetch(`${BASE_URL}/bhms/plans/${planId}`, { method: 'DELETE' });
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
        frequency: 'monthly',
        durationMonths: durationMonths,
        discountPercent: newPlan.discount === 'yes' ? parseInt(newPlan.discountPercent) : 0,
        formType: newPlan.formType,
        active: true
      };

      const response = await fetch(`${BASE_URL}/bhms/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planData)
      });

      if (!response.ok) throw new Error('Failed to create plan');

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
        frequency: 'monthly',
        durationMonths: durationMonths,
        discountPercent: newPlan.discount === 'yes' ? parseInt(newPlan.discountPercent) : 0,
        formType: newPlan.formType,
        active: editingPlan.status === 'Published'
      };

      const response = await fetch(`${BASE_URL}/bhms/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planData)
      });

      if (!response.ok) throw new Error('Failed to update plan');

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
      price: '',
      every: '24',
      period: 'months',
      discount: 'no',
      discountPercent: '20',
      description: ''
    });
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    
    // Calculate period from durationMonths
    let every = plan.durationMonths;
    let period = 'months';
    
    if (plan.durationMonths >= 12 && plan.durationMonths % 12 === 0) {
      every = plan.durationMonths / 12;
      period = 'years';
    }

    setNewPlan({
      name: plan.name,
      formType: plan.formType || '',
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
      
      const response = await fetch(`${BASE_URL}/bhms/plans/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...plan.rawData,
          active: active
        })
      });

      if (!response.ok) throw new Error('Failed to update status');

      await fetchPlans();
      setActiveDropdown(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleFormTypeChange = (formType) => {
    setNewPlan(prev => ({ ...prev, formType }));
  };

  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt('Enter the URL:');
    if (url) {
      applyFormat('createLink', url);
    }
  };

  const showColorPickerModal = (type, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setColorPickerPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });
    setShowColorPicker(type);
  };

  const applyColor = (color) => {
    if (showColorPicker === 'text') {
      applyFormat('foreColor', color);
    } else if (showColorPicker === 'background') {
      applyFormat('hiliteColor', color);
    }
    setShowColorPicker(null);
  };

  const handleEditorInput = (e) => {
    const content = e.currentTarget.innerHTML;
    setNewPlan(prev => ({...prev, description: content}));
  };

  // Check if form is valid for saving
  const isFormValid = () => {
    return newPlan.name.trim() !== '' && 
           newPlan.price !== '' && 
           newPlan.formType !== '';
  };

  const colorPresets = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];

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
                    onClick={() => setShowAddPlan(true)}
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

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60]" onClick={() => setShowColorPicker(null)}>
          <div className="bg-white rounded-lg shadow-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {showColorPicker === 'text' ? 'Text Color' : 'Background Color'}
              </h3>
              <button onClick={() => setShowColorPicker(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {colorPresets.map(color => (
                <button
                  key={color}
                  onClick={() => applyColor(color)}
                  className="w-12 h-12 rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Color</label>
              <input
                type="color"
                className="w-full h-10 rounded cursor-pointer"
                onChange={(e) => applyColor(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Plan Modal */}
      {(showAddPlan || showEditPlan) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
            <div className="sticky top-0 bg-white px-7 py-5 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
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
                      Form Type
                    </label>
                    <select
                      value={newPlan.formType}
                      onChange={(e) => handleFormTypeChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select form type</option>
                      {formTypes.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
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
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="discount"
                        value="no"
                        checked={newPlan.discount === 'no'}
                        onChange={(e) => setNewPlan({...newPlan, discount: e.target.value})}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        Members in this plan do not get a discount in their bookings
                      </span>
                    </label>
                    
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="discount"
                        value="yes"
                        checked={newPlan.discount === 'yes'}
                        onChange={(e) => setNewPlan({...newPlan, discount: e.target.value})}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                      />
                      <span className="ml-3 text-sm text-gray-700 flex items-center gap-2 flex-wrap">
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
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyFormat('bold')}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Bold"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M5 3h5a3 3 0 013 3 3 3 0 01-3 3H5V3zM5 9h6a3 3 0 013 3 3 3 0 01-3 3H5V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('italic')}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700 italic font-serif"
                        title="Italic"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M8 3h6M4 15h6M11 3l-4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('underline')}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Underline"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M5 3v6a4 4 0 008 0V3M3 15h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('strikeThrough')}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Strikethrough"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M3 9h12M6 6c0-1.5 1.5-3 3-3s3 1.5 3 3M6 12c0 1.5 1.5 3 3 3s3-1.5 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <div className="w-px h-5 bg-gray-300 mx-1"></div>
                      <button
                        type="button"
                        onClick={() => applyFormat('insertOrderedList')}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Numbered List"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M7 4h8M7 9h8M7 14h8M3 4h1M3 9h1M3 14h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('insertUnorderedList')}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Bullet List"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <circle cx="3" cy="4.5" r="1" fill="currentColor"/>
                          <circle cx="3" cy="9" r="1" fill="currentColor"/>
                          <circle cx="3" cy="13.5" r="1" fill="currentColor"/>
                          <path d="M7 4.5h8M7 9h8M7 13.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <div className="w-px h-5 bg-gray-300 mx-1"></div>
                      <button
                        type="button"
                        onClick={() => applyFormat('justifyLeft')}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Align Left"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M3 4h12M3 9h8M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('justifyCenter')}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Align Center"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M3 4h12M5 9h8M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('justifyRight')}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Align Right"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M3 4h12M7 9h8M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <div className="w-px h-5 bg-gray-300 mx-1"></div>
                      <button
                        type="button"
                        onClick={(e) => showColorPickerModal('text', e)}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Text Color"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M4 14l5-12 5 12M6 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <rect x="3" y="15" width="12" height="2" fill="currentColor"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => showColorPickerModal('background', e)}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Background Color"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M5 8l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={insertLink}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Insert Link"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M8 10a3 3 0 003 3h3a3 3 0 100-6h-3M10 8a3 3 0 00-3-3H4a3 3 0 100 6h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('removeFormat')}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                        title="Clear Formatting"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handleEditorInput}
                      dangerouslySetInnerHTML={{ __html: newPlan.description }}
                      className="min-h-[150px] max-h-[300px] overflow-y-auto px-4 py-3 focus:outline-none text-sm text-gray-900"
                      style={{ 
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                      }}
                    />
                  </div>
                  {newPlan.description && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Preview:</p>
                      <div 
                        className="text-sm text-gray-700"
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