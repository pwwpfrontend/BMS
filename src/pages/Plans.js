import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function Plans() {
  const [plans, setPlans] = useState([
    {
      id: 1,
      name: 'InnoBuddies',
      workspace: 'CUHK InnoPort',
      price: 'HK$0.00',
      frequency: 'every 24 months',
      status: 'Published'
    },
    {
      id: 2,
      name: 'InnoPeers',
      workspace: 'CUHK InnoPort',
      price: 'HK$0.00',
      frequency: 'every 24 months',
      status: 'Published'
    },
    {
      id: 3,
      name: 'InnoPeers+',
      workspace: 'CUHK InnoPort',
      price: 'HK$0.00',
      frequency: 'every 24 months',
      status: 'Internal'
    },
    {
      id: 4,
      name: 'Staff',
      workspace: 'CUHK InnoPort',
      price: 'HK$0.00',
      frequency: 'every 24 months',
      status: 'Internal'
    }
  ]);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newPlan, setNewPlan] = useState({
    name: '',
    kind: 'Other Plan',
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

  const handleBulkToggle = () => {
    setBulkMode(!bulkMode);
    setSelectedPlans([]);
  };

  const handleSelectPlan = (planId) => {
    setSelectedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const handleDeleteSelected = () => {
    setPlans(prev => prev.filter(plan => !selectedPlans.includes(plan.id)));
    setSelectedPlans([]);
    setBulkMode(false);
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Workspace', 'Price', 'Frequency', 'Status'],
      ...plans.map(plan => [
        plan.name,
        plan.workspace,
        plan.price,
        plan.frequency,
        plan.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plans.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddPlan = () => {
    const plan = {
      id: plans.length + 1,
      name: newPlan.name,
      workspace: 'CUHK InnoPort',
      price: `HK$${parseFloat(newPlan.price).toFixed(2)}`,
      frequency: `every ${newPlan.every} ${newPlan.period}`,
      status: 'Published'
    };
    setPlans([...plans, plan]);
    setShowAddPlan(false);
    setNewPlan({
      name: '',
      kind: 'Other Plan',
      price: '',
      every: '24',
      period: 'months',
      discount: 'no',
      discountPercent: '20',
      description: ''
    });
  };

  const handleEditPlan = () => {
    setPlans(prev => prev.map(plan => 
      plan.id === editingPlan.id 
        ? {
            ...plan,
            name: newPlan.name,
            price: `HK$${parseFloat(newPlan.price).toFixed(2)}`,
            frequency: `every ${newPlan.every} ${newPlan.period}`
          }
        : plan
    ));
    setShowEditPlan(false);
    setEditingPlan(null);
    setNewPlan({
      name: '',
      kind: 'Other Plan',
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
    setNewPlan({
      name: plan.name,
      kind: 'Other Plan',
      price: plan.price.replace('HK$', ''),
      every: plan.frequency.match(/\d+/)[0],
      period: 'months',
      discount: 'no',
      discountPercent: '20',
      description: 'Enjoy FREE Membership!\nAll new members by default are admitted to this tier'
    });
    setShowEditPlan(true);
    setActiveDropdown(null);
  };

  const handleStatusChange = (planId, newStatus) => {
    setPlans(prev => prev.map(plan => 
      plan.id === planId ? { ...plan, status: newStatus } : plan
    ));
    setActiveDropdown(null);
  };

  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar currentPath="/plans" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Plans</h1>
                <p className="text-sm text-gray-500 mt-1">All Plans</p>
              </div>
            </div>

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
                  {bulkMode && selectedPlans.length > 0 && (
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
                    onClick={() => setShowAddPlan(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Add Plan
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Frequency</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50">
                        {bulkMode && (
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedPlans.includes(plan.id)}
                              onChange={() => handleSelectPlan(plan.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                        )}
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/>
                                <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                              </svg>
                              {plan.workspace}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{plan.price}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">{plan.frequency}</td>
                        <td className="px-4 py-4">
                          {plan.status === 'Published' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Internal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative">
                            <button
                              onClick={() => setActiveDropdown(activeDropdown === plan.id ? null : plan.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="8" cy="3" r="1.5"/>
                                <circle cx="8" cy="8" r="1.5"/>
                                <circle cx="8" cy="13" r="1.5"/>
                              </svg>
                            </button>
                            {activeDropdown === plan.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => openEditModal(plan)}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(plan.id, 'Published')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Mark as Published
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(plan.id, 'Internal')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Mark as Internal
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

      {/* Add/Edit Plan Modal */}
      {(showAddPlan || showEditPlan) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {showEditPlan ? newPlan.name : 'InnoBuddies'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">CUHK InnoPort</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plan name
                    </label>
                    <input
                      type="text"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plan kind
                    </label>
                    <select
                      value={newPlan.kind}
                      onChange={(e) => setNewPlan({...newPlan, kind: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Other Plan</option>
                      <option>Membership</option>
                      <option>Subscription</option>
                    </select>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Pricing</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Plans can be priced per any number of weeks or months. Customers with an active contract for this plan will be invoiced this amount every this number of months or weeks.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price
                      </label>
                      <input
                        type="text"
                        value={newPlan.price}
                        onChange={(e) => setNewPlan({...newPlan, price: e.target.value})}
                        placeholder="HK$0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        &nbsp;
                      </label>
                      <select
                        value={newPlan.period}
                        onChange={(e) => setNewPlan({...newPlan, period: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="months">months</option>
                        <option value="weeks">weeks</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Discounts</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select if customers in this plan are eligible to discounts when making bookings, purchasing passes or other charges.
                  </p>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="discount"
                        value="no"
                        checked={newPlan.discount === 'no'}
                        onChange={(e) => setNewPlan({...newPlan, discount: e.target.value})}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        Members in this plan do not get a discount in their bookings
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="discount"
                        value="yes"
                        checked={newPlan.discount === 'yes'}
                        onChange={(e) => setNewPlan({...newPlan, discount: e.target.value})}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-3 text-sm text-gray-700 flex items-center gap-2">
                        Members in this plan get
                        <select
                          value={newPlan.discountPercent}
                          onChange={(e) => setNewPlan({...newPlan, discountPercent: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={newPlan.discount === 'no'}
                        >
                          <option>20%</option>
                          <option>10%</option>
                          <option>30%</option>
                          <option>50%</option>
                        </select>
                        off their bookings
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan description
                  </label>
                  <div className="border border-gray-300 rounded-md">
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M5 8h10M5 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded italic">
                        <span className="text-sm font-serif">i</span>
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded underline">
                        <span className="text-sm">U</span>
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M5 10h10M10 5v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M6 7h8M8 10h6M6 13h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M7 9l1 2 2-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M8 10h4M10 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    <textarea
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                      className="w-full px-3 py-2 min-h-[120px] focus:outline-none"
                      placeholder="Enter plan description..."
                    />
                  </div>
                  {newPlan.description && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <div className="text-sm font-semibold text-blue-900 mb-1">
                        {newPlan.description.split('\n')[0]}
                      </div>
                      <div className="text-sm text-gray-600">
                        {newPlan.description.split('\n')[1]}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddPlan(false);
                  setShowEditPlan(false);
                  setEditingPlan(null);
                  setNewPlan({
                    name: '',
                    kind: 'Other Plan',
                    price: '',
                    every: '24',
                    period: 'months',
                    discount: 'no',
                    discountPercent: '20',
                    description: ''
                  });
                }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Discard Changes
              </button>
              <button
                onClick={showEditPlan ? handleEditPlan : handleAddPlan}
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