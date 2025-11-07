import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import formsAPI from '../services/formsApi';

export default function FormDetails() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'details');
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showEditQuestion, setShowEditQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedResponses, setSelectedResponses] = useState([]);
  const [selectAllResponses, setSelectAllResponses] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showSendForm, setShowSendForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [availableFormTypes, setAvailableFormTypes] = useState([]);
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [newTypeValue, setNewTypeValue] = useState('');
  const [allForms, setAllForms] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const [formDetails, setFormDetails] = useState({
    name: '',
    description: '',
    type: '',
    active: true
  });
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [responseFilter, setResponseFilter] = useState('pending');
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showResponseDetails, setShowResponseDetails] = useState(false);
  const [interests, setInterests] = useState([]);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [users, setUsers] = useState([]);
  const [interestedSearch, setInterestedSearch] = useState('');

  const [newQuestion, setNewQuestion] = useState({
    question: '',
    description: '',
    type: 'text',
    required: false,
    options: [],
    active: true
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

  const handleExportInterests = () => {
    const rows = [
      ['Form', 'Email', 'Current Plan', 'Requested on'],
      ...filteredInterests.map(item => [
        item.formName || '',
        item.email || '',
        item.currentPlan || '',
        item.sentOn || ''
      ])
    ];
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formDetails.name || 'form'}_interested.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Resolve access token (same approach as other pages)
  const getApiToken = () =>
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('access_token')) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('access_token')) ||
    (typeof window !== 'undefined' && (window.ACCESS_TOKEN || window.BEARER_TOKEN)) ||
    (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BEARER_TOKEN) || '';

  const fetchPlans = async () => {
    try {
      const data = await formsAPI.getPlans(getApiToken());
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const mapped = list.map(p => ({ id: p._id, name: p.name }));
      setPlans(mapped);
    } catch (e) {
      console.error('Error fetching plans', e);
      setPlans([]);
    }
  };

  const handlePlanChange = async (e) => {
    const planId = e.target.value;
    setSelectedPlanId(planId);
    try {
      await formsAPI.updateForm(formId, { planlink: planId }, getApiToken());
    } catch (err) {
      console.error('Failed to link plan', err);
      alert('Failed to link plan to form');
    }
  };

  const nameFromEmail = (em) => {
    if (!em || typeof em !== 'string') return '';
    const local = em.split('@')[0];
    const cleaned = local.replace(/[0-9]/g, '').replace(/[._-]+/g, ' ').trim();
    return cleaned || local;
  };

  const loadInterests = async () => {
    try {
      setLoadingInterests(true);
      const data = await formsAPI.getInterested(getApiToken());
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      // Show all interests as requested (no filtering by formId)
      const filtered = list;
      // Ensure auxiliary data exists
      let usersList = users;
      if (!usersList || usersList.length === 0) {
        const u = await formsAPI.getUsers(getApiToken());
        usersList = Array.isArray(u) ? u : (Array.isArray(u?.data) ? u.data : []);
        setUsers(usersList);
      }
      let plansList = plans;
      if (!plansList || plansList.length === 0) {
        const p = await formsAPI.getPlans(getApiToken());
        const mapped = (Array.isArray(p) ? p : (Array.isArray(p?.data) ? p.data : [])).map(pl => ({ id: pl._id, name: pl.name }));
        plansList = mapped;
        setPlans(mapped);
      }
      // Build quick lookups
      const usersMap = (usersList || []).reduce((acc, u) => { acc[u._id] = u; return acc; }, {});
      const plansMap = (plansList || []).reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {});
      const mapped = filtered.map((i, idx) => {
        const userObj = (i.userId && typeof i.userId === 'object') ? i.userId : usersMap[i.userId];
        const email = userObj?.email || i.email || '';
        const userPlan = (userObj && typeof userObj.plan === 'object' && userObj.plan?.name)
          ? userObj.plan.name
          : (userObj && typeof userObj.plan === 'string' ? plansMap[userObj.plan] : '');
        return ({
          id: i._id,
          userId: i.userId,
          formId: (i.formId && typeof i.formId === 'object') ? i.formId._id : (i.formId || i.form?._id),
          formName: (i.formId && typeof i.formId === 'object') ? i.formId.name : (i.formName || formDetails.name || 'Form'),
          email,
          currentPlan: userPlan || '-',
          interestedPlan: i.interestedPlan || '',
          createdAt: i.createdAt,
          sentOn: i.createdAt ? new Date(i.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '',
        });
      });
      setInterests(mapped);
    } catch (e) {
      console.error('Error loading interests', e);
      setInterests([]);
    } finally {
      setLoadingInterests(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await formsAPI.getUsers(getApiToken());
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setUsers(list);
    } catch (e) {
      console.error('Error fetching users', e);
      setUsers([]);
    }
  };

  const handleSendFormFromInterest = async (interest) => {
    try {
      const payload = {
        userId: (interest.userId && typeof interest.userId === 'object') ? interest.userId._id : interest.userId,
        formId: interest.formId,
        contextType: 'interest',
        contextId: interest.id,
      };
      await formsAPI.sendFormAssignment(payload, getApiToken());
      alert('Form sent to user');
    } catch (e) {
      console.error('Failed to send form from interest', e);
      alert('Failed to send form');
    }
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

  // Fetch available form types from API
  const fetchAvailableFormTypes = async () => {
    try {
      const allForms = await formsAPI.getAllForms(getApiToken());
      setAllForms(allForms);
      const uniqueTypes = [...new Set(allForms.map(form => form.type).filter(type => type))];
      setAvailableFormTypes(uniqueTypes);
    } catch (error) {
      console.error("Error fetching form types:", error);
      setAvailableFormTypes([]);
    }
  };

  useEffect(() => {
    if (formId) {
      loadFormData();
      fetchAvailableFormTypes();
      fetchPlans();
    }
  }, [formId]);

  useEffect(() => {
    if (activeTab === 'interested') {
      loadInterests();
      fetchUsers();
    }
  }, [activeTab, formId]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const formResponse = await formsAPI.getFormById(formId, getApiToken());
      
      setFormDetails({
        name: formResponse.name,
        description: formResponse.description || '',
        type: formResponse.type || '',
        active: formResponse.active !== undefined ? formResponse.active : true
      });
      // Preselect linked plan if present
      const linkedPlanId = typeof formResponse.planlink === 'object' ? formResponse.planlink?._id : (formResponse.planlink || '');
      if (linkedPlanId) setSelectedPlanId(linkedPlanId);
      
      const transformedQuestions = formResponse.fields?.map(field => ({
        id: field._id,
        question: field.question,
        description: field.description || '',
        type: field.type,
        status: field.active ? 'Active' : 'Inactive',
        required: field.required,
        options: field.options || [],
        active: field.active !== undefined ? field.active : true
      })) || [];
      
      setQuestions(transformedQuestions);
      
      try {
        const responsesData = await formsAPI.getBhmsFormResponses(formId, getApiToken());
        const transformedResponses = (Array.isArray(responsesData) ? responsesData : []).map((r, index) => {
          const nameFromEmail = (em) => {
            if (!em || typeof em !== 'string') return '';
            const local = em.split('@')[0];
            const cleaned = local.replace(/[0-9]/g, '').replace(/[._-]+/g, ' ').trim();
            return cleaned || local;
          };
          const customerName = nameFromEmail(r.submitters_email)
            || (r.submittedBy && typeof r.submittedBy === 'object' && (r.submittedBy.name || nameFromEmail(r.submittedBy.email)))
            || (typeof r.submittedBy === 'string' ? '' : '')
            || `User ${index + 1}`;
          return ({
            id: r._id,
            formId: r.formId,
            form: r.formName || (formResponse.name || 'Form'),
            formType: r.formType || formResponse.type,
            customer: customerName,
            status: r.status || 'pending',
            createdAt: r.createdAt,
            sentOn: new Date(r.createdAt).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            responses: Array.isArray(r.responses) ? r.responses : []
          });
        });
        setResponses(transformedResponses);
      } catch (responseError) {
        console.warn('No responses found for this form:', responseError);
        setResponses([]);
      }
      
    } catch (err) {
      setError('Failed to load form data. Please try again.');
      console.error('Error loading form data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.question.trim()) {
      setError('Question text is required');
      return;
    }
    
    try {
      setError('');
      
      const fieldData = {
        question: newQuestion.question,
        description: newQuestion.description || '',
        type: newQuestion.type,
        required: newQuestion.required,
        options: newQuestion.type === 'options' ? newQuestion.options.filter(option => option.trim() !== '') : [],
        active: newQuestion.active !== undefined ? newQuestion.active : true
      };
      
      await formsAPI.addFormField(formId, fieldData, getApiToken());
      await loadFormData();
      
      setShowAddQuestion(false);
      setNewQuestion({
        question: '',
        description: '',
        type: 'text',
        required: false,
        options: [],
        active: true
      });
    } catch (err) {
      setError('Failed to add question. Please try again.');
      console.error('Error adding question:', err);
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion({
      ...question,
      options: question.options || []
    });
    setNewQuestion({
      question: question.question,
      description: question.description,
      type: question.type,
      required: question.required,
      options: question.options || [],
      active: question.active
    });
    setShowEditQuestion(true);
    setActiveDropdown(null);
  };

  const handleUpdateQuestion = async () => {
    if (!newQuestion.question.trim()) {
      setError('Question text is required');
      return;
    }
    
    try {
      setError('');
      
      const fieldData = {
        question: newQuestion.question,
        description: newQuestion.description || '',
        type: newQuestion.type,
        required: newQuestion.required,
        options: newQuestion.type === 'options' ? newQuestion.options.filter(option => option.trim() !== '') : [],
        active: newQuestion.active !== undefined ? newQuestion.active : true
      };
      
      await formsAPI.updateFormField(formId, editingQuestion.id, fieldData, getApiToken());
      await loadFormData();
      
      setShowEditQuestion(false);
      setEditingQuestion(null);
      setNewQuestion({
        question: '',
        description: '',
        type: 'text',
        required: false,
        options: [],
        active: true
      });
    } catch (err) {
      setError('Failed to update question. Please try again.');
      console.error('Error updating question:', err);
    }
  };

  const handleBulkToggle = () => {
    setBulkMode(!bulkMode);
    setSelectedQuestions([]);
  };

  const handleSelectQuestion = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      setError('');
      
      await formsAPI.deleteFormField(formId, questionId, getApiToken());
      await loadFormData();
      
      setActiveDropdown(null);
    } catch (err) {
      setError('Failed to delete question. Please try again.');
      console.error('Error deleting question:', err);
    }
  };

  const handleFormTypeChange = (e) => {
    const value = e.target.value;
    if (value === '__new__') {
      setShowNewTypeInput(true);
      setNewTypeValue('');
      setFormDetails({...formDetails, type: ''});
    } else {
      setShowNewTypeInput(false);
      setFormDetails({...formDetails, type: value});
    }
  };

  const handleNewTypeValueChange = (e) => {
    const value = e.target.value;
    setNewTypeValue(value);
    setFormDetails({...formDetails, type: value});
  };

  const handleUpdateFormDetails = async () => {
    try {
      setError('');
      
      const formData = {
        name: formDetails.name,
        description: formDetails.description,
        type: formDetails.type,
        active: formDetails.active !== undefined ? formDetails.active : true
      };
      
      await formsAPI.updateForm(formId, formData, getApiToken());
      
      // Update available form types if new type was added
      if (formDetails.type && !availableFormTypes.includes(formDetails.type)) {
        setAvailableFormTypes([...availableFormTypes, formDetails.type]);
      }
      
      setShowNewTypeInput(false);
      setNewTypeValue('');
    } catch (err) {
      setError('Failed to update form details. Please try again.');
      console.error('Error updating form details:', err);
    }
  };

  const handleToggleFormStatus = async (newStatus) => {
    try {
      setError('');
      
      const formData = {
        name: formDetails.name,
        description: formDetails.description,
        type: formDetails.type,
        active: newStatus
      };
      
      await formsAPI.updateForm(formId, formData, getApiToken());
      setFormDetails({...formDetails, active: newStatus});
    } catch (err) {
      setError('Failed to toggle form status. Please try again.');
      console.error('Error toggling form status:', err);
    }
  };

  const handleOpenResponseDetails = (response) => {
    setSelectedResponse(response);
    setShowResponseDetails(true);
  };

  const handleApproveResponse = async (responseId) => {
    try {
      await formsAPI.updateResponseStatus(responseId, 'approved');
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, status: 'approved' } : r));
      if (selectedResponse && selectedResponse.id === responseId) {
        setSelectedResponse({ ...selectedResponse, status: 'approved' });
      }
    } catch (e) {
      console.error('Approve failed', e);
      alert('Failed to approve response');
    }
  };

  const handleRejectResponse = async (responseId) => {
    try {
      await formsAPI.updateResponseStatus(responseId, 'rejected');
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, status: 'rejected' } : r));
      if (selectedResponse && selectedResponse.id === responseId) {
        setSelectedResponse({ ...selectedResponse, status: 'rejected' });
      }
    } catch (e) {
      console.error('Reject failed', e);
      alert('Failed to reject response');
    }
  };

  const handleBulkStatus = async (status) => {
    if (selectedResponses.length === 0) return;
    try {
      await Promise.all(selectedResponses.map(id => formsAPI.updateResponseStatus(id, status)));
      setResponses(prev => prev.map(r => selectedResponses.includes(r.id) ? { ...r, status } : r));
      setSelectedResponses([]);
      setSelectAllResponses(false);
    } catch (e) {
      console.error('Bulk status update failed', e);
      alert('Failed to update selected responses');
    }
  };

  const handleSelectAllResponses = () => {
    if (selectAllResponses) {
      setSelectedResponses([]);
      setSelectAllResponses(false);
    } else {
      setSelectedResponses(responses.map(response => response.id));
      setSelectAllResponses(true);
    }
  };

  const handleSelectResponse = (responseId) => {
    const newSelected = selectedResponses.includes(responseId)
      ? selectedResponses.filter(id => id !== responseId)
      : [...selectedResponses, responseId];
    
    setSelectedResponses(newSelected);
    setSelectAllResponses(newSelected.length === responses.length);
  };

  const handleBulkDeleteResponses = async () => {
    if (selectedResponses.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedResponses.length} response(s)?`)) {
      return;
    }

    try {
      setError('');
      await formsAPI.bulkDeleteResponses(selectedResponses);
      await loadFormData();
      setSelectedResponses([]);
      setSelectAllResponses(false);
    } catch (err) {
      setError('Failed to delete responses. Please try again.');
      console.error('Error deleting responses:', err);
    }
  };

  const handleExportResponses = () => {
    const csvContent = [
      ['Form', 'Customer', 'Status', 'Sent On'],
      ...responses.map(response => [
        response.form,
        response.customer,
        response.status,
        response.sentOn
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formDetails.name}_responses.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const openSendFormModal = () => {
    setSendFormData({
      customer: '',
      customerEmail: '',
      form: formDetails.name,
      formId: formId,
      emailNotification: true
    });
    setShowSendForm(true);
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
      
      alert('Form sent successfully to customer!');
    } catch (err) {
      setError('Failed to send form. Please try again.');
      console.error('Error sending form:', err);
    }
  };

  const filteredQuestions = questions.filter(question =>
    question.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInterests = interests.filter(item => {
    const q = interestedSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (item.email || '').toLowerCase().includes(q) ||
      (item.currentPlan || '').toLowerCase().includes(q) ||
      (item.formName || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar currentPath="/forms" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading form details...</p>
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
          <div className="p-8">
            <div className="mb-6">
              <button 
                onClick={() => navigate('/forms')}
                className="text-blue-600 hover:text-blue-700 mb-2 text-sm"
              >
                ← Back to Forms
              </button>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">{formDetails.name || 'Form'}</h1>
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

      {/* Response Details Modal */}
      {showResponseDetails && selectedResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Response details</h2>
              <button onClick={() => setShowResponseDetails(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Form</div>
                  <div className="text-sm font-medium text-gray-900">{selectedResponse.form}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Form type</div>
                  <div className="text-sm text-gray-900">{selectedResponse.formType || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Submitted by</div>
                  <div className="text-sm text-gray-900">{selectedResponse.customer || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Created at</div>
                  <div className="text-sm text-gray-900">{selectedResponse.sentOn}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="text-sm text-gray-900 capitalize">{selectedResponse.status}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Answers</h3>
                <div className="border border-gray-200 rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-700">Question</th>
                        <th className="px-4 py-2 text-left text-gray-700">Answer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedResponse.responses || []).map((qa, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-900 align-top w-1/2">{qa.question}</td>
                          <td className="px-4 py-2 text-gray-700">{String(qa.answer)}</td>
                        </tr>
                      ))}
                      {(!selectedResponse.responses || selectedResponse.responses.length === 0) && (
                        <tr>
                          <td colSpan="2" className="px-4 py-4 text-gray-500">No answers found</td>
                        </tr>
                      )}
                {activeTab === 'interested' && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search..."
                            value={interestedSearch}
                            onChange={(e) => setInterestedSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 w-80 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={handleExportInterests}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2v8m0 0L5.5 7.5M8 10l2.5-2.5M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Export
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Form</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Current Plan</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Requested on</th>
                            <th className="px-4 py-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredInterests.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 text-sm text-gray-900">{item.formName}</td>
                              <td className="px-4 py-4 text-sm text-gray-700">{item.email || '-'}</td>
                              <td className="px-4 py-4 text-sm text-gray-700">{item.currentPlan || '-'}</td>
                              <td className="px-4 py-4 text-sm text-gray-700">{item.sentOn}</td>
                              <td className="px-4 py-4">
                                <div className="relative dropdown-container">
                                  <button
                                    onClick={() => setActiveDropdown(activeDropdown === `interest-${item.id}` ? null : `interest-${item.id}`)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                      <circle cx="8" cy="3" r="1.5"/>
                                      <circle cx="8" cy="8" r="1.5"/>
                                      <circle cx="8" cy="13" r="1.5"/>
                                    </svg>
                                  </button>
                                  {activeDropdown === `interest-${item.id}` && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                      <div className="py-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); handleSendFormFromInterest(item); }}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                          Send form
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredInterests.length === 0 && (
                            <tr>
                              <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">No interested requests found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {/* Footer removed: approvals handled via per-row menu */}
          </div>
        </div>
      )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'details'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'requests'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Requests & responses
                  </button>
                  <button
                    onClick={() => setActiveTab('interested')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'interested'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Interested
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Form details</h3>
                        <p className="text-sm text-gray-600">
                          Forms are a set of questions you can send to specific customers or publish online for users to complete.
                        </p>
                      </div>
                      
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={formDetails.name}
                            onChange={(e) => setFormDetails({...formDetails, name: e.target.value})}
                            onBlur={handleUpdateFormDetails}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                          </label>
                          <textarea
                            value={formDetails.description}
                            onChange={(e) => setFormDetails({...formDetails, description: e.target.value})}
                            onBlur={handleUpdateFormDetails}
                            className="w-full px-3 py-2 min-h-[100px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Form Type
                          </label>
                          <select
                            value={showNewTypeInput ? '__new__' : formDetails.type}
                            onChange={handleFormTypeChange}
                            onBlur={() => {
                              if (!showNewTypeInput) {
                                handleUpdateFormDetails();
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select a type</option>
                            {availableFormTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                            <option value="__new__">+ Add new type</option>
                          </select>
                          {showNewTypeInput && (
                            <div className="mt-2">
                              <input
                                type="text"
                                value={newTypeValue}
                                onChange={handleNewTypeValueChange}
                                placeholder="Enter new form type"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={handleUpdateFormDetails}
                                  className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                  Save Type
                                </button>
                                <button
                                  onClick={() => {
                                    setShowNewTypeInput(false);
                                    setNewTypeValue('');
                                    setFormDetails({...formDetails, type: ''});
                                  }}
                                  className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Linked Plan
                          </label>
                          <select
                            value={selectedPlanId}
                            onChange={handlePlanChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select a plan</option>
                            {plans.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formDetails.active}
                              onChange={(e) => handleToggleFormStatus(e.target.checked)}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              formDetails.active ? 'bg-blue-600' : 'bg-gray-200'
                            }`}>
                              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                                formDetails.active ? 'translate-x-5' : 'translate-x-0.5'
                              } mt-0.5`}>
                              </div>
                            </div>
                          </label>
                          <span className="text-sm text-gray-700">Form is active</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions</h3>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
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
                            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                              Filters
                              <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded">0</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleBulkToggle}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              Bulk actions
                            </button>
                            <button
                              onClick={() => setShowAddQuestion(true)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                              Add question
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-200">
                        {filteredQuestions.map((question) => (
                          <div key={question.id} className="p-6 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4 flex-1 pr-6">
                                {bulkMode && (
                                  <input
                                    type="checkbox"
                                    checked={selectedQuestions.includes(question.id)}
                                    onChange={() => handleSelectQuestion(question.id)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                                  />
                                )}
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                                    {question.question}
                                  </h4>
                                  <p className="text-sm text-gray-500">
                                    {question.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {question.type}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  question.status === 'Active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                                    <circle cx="4" cy="4" r="3" />
                                  </svg>
                                  {question.status}
                                </span>
                                <div className="relative dropdown-container">
                                  <button
                                    onClick={() => setActiveDropdown(activeDropdown === question.id ? null : question.id)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                      <circle cx="8" cy="3" r="1.5"/>
                                      <circle cx="8" cy="8" r="1.5"/>
                                      <circle cx="8" cy="13" r="1.5"/>
                                    </svg>
                                  </button>
                                  {activeDropdown === question.id && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                      <div className="py-1">
                                        <button 
                                          onClick={() => handleEditQuestion(question)}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                          Edit
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteQuestion(question.id)}
                                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'requests' && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search..."
                            value={interestedSearch}
                            onChange={(e) => setInterestedSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 w-80 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Status</label>
                          <select
                            value={responseFilter}
                            onChange={(e) => setResponseFilter(e.target.value)}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="all">All</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={handleExportInterests}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2v8m0 0L5.5 7.5M8 10l2.5-2.5M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Export
                        </button>
                        {selectedResponses.length > 0 && (
                          <button
                            onClick={handleBulkDeleteResponses}
                            className="px-3 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
                          >
                            Delete Selected ({selectedResponses.length})
                          </button>
                        )}
                        <button 
                          onClick={openSendFormModal}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Send form
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="w-12 px-4 py-3">
                              <input 
                                type="checkbox" 
                                checked={selectAllResponses}
                                onChange={handleSelectAllResponses}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Form
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Customer
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Sent on
                            </th>
                            <th className="px-4 py-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {responses
                            .filter(r => responseFilter === 'all' ? true : r.status === responseFilter)
                            .map((response) => (
                            <tr key={response.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenResponseDetails(response)}>
                              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedResponses.includes(response.id)}
                                  onChange={() => handleSelectResponse(response.id)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                                />
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900">{response.form}</td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-700">
                                      {response.customer.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </span>
                                  </div>
                                  <span className="text-sm text-gray-900">{response.customer}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                {response.status === 'pending' && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
                                )}
                                {response.status === 'approved' && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
                                )}
                                {response.status === 'rejected' && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-700">{response.sentOn}</td>
                              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                <div className="relative dropdown-container">
                                  <button
                                    onClick={() => setActiveDropdown(activeDropdown === `resp-${response.id}` ? null : `resp-${response.id}`)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                      <circle cx="8" cy="3" r="1.5"/>
                                      <circle cx="8" cy="8" r="1.5"/>
                                      <circle cx="8" cy="13" r="1.5"/>
                                    </svg>
                                  </button>
                                  {activeDropdown === `resp-${response.id}` && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                      <div className="py-1">
                                        {response.status !== 'approved' && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); handleApproveResponse(response.id); }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          >
                                            Approve
                                          </button>
                                        )}
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
                )}

                {activeTab === 'interested' && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search..."
                            value={interestedSearch}
                            onChange={(e) => setInterestedSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 w-80 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={handleExportInterests}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2v8m0 0L5.5 7.5M8 10l2.5-2.5M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Export
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Form</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Current Plan</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Requested on</th>
                            <th className="px-4 py-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredInterests.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 text-sm text-gray-900">{item.formName}</td>
                              <td className="px-4 py-4 text-sm text-gray-700">{item.email || '-'}</td>
                              <td className="px-4 py-4 text-sm text-gray-700">{item.currentPlan || '-'}</td>
                              <td className="px-4 py-4 text-sm text-gray-700">{item.sentOn}</td>
                              <td className="px-4 py-4">
                                <div className="relative dropdown-container">
                                  <button
                                    onClick={() => setActiveDropdown(activeDropdown === `interest-${item.id}` ? null : `interest-${item.id}`)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                      <circle cx="8" cy="3" r="1.5"/>
                                      <circle cx="8" cy="8" r="1.5"/>
                                      <circle cx="8" cy="13" r="1.5"/>
                                    </svg>
                                  </button>
                                  {activeDropdown === `interest-${item.id}` && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                      <div className="py-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); handleSendFormFromInterest(item); }}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                          Send form
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredInterests.length === 0 && (
                            <tr>
                              <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">No interested requests found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Send Form Modal */}
      {showSendForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Send form</h2>
              <button onClick={() => setShowSendForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <select
                  value={sendFormData.customerEmail}
                  onChange={(e) => setSendFormData({ ...sendFormData, customerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.email}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Form</label>
                <input
                  type="text"
                  value={formDetails.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="emailNotify"
                  type="checkbox"
                  checked={sendFormData.emailNotification}
                  onChange={(e) => setSendFormData({ ...sendFormData, emailNotification: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="emailNotify" className="text-sm text-gray-700">Send email notification</label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSendForm(false)}
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

      {/* Add Question Modal */}
      {showAddQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-900">Add question</h2>
                </div>
                <button
                  onClick={() => setShowAddQuestion(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Question details</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question
                  </label>
                  <input
                    type="text"
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your question"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newQuestion.description}
                    onChange={(e) => setNewQuestion({...newQuestion, description: e.target.value})}
                    className="w-full px-3 py-2 min-h-[80px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter question description"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newQuestion.required}
                      onChange={(e) => setNewQuestion({...newQuestion, required: e.target.checked})}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      newQuestion.required ? 'bg-blue-600' : 'bg-gray-200'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        newQuestion.required ? 'translate-x-5' : 'translate-x-0.5'
                      } mt-0.5`}>
                      </div>
                    </div>
                  </label>
                  <span className="text-sm text-gray-700">This question must be answered to submit the form.</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Question type
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'text', label: 'Text' },
                      { value: 'textarea', label: 'Long text' },
                      { value: 'options', label: 'Options menu' },
                      { value: 'date', label: 'Date' },
                      { value: 'file', label: 'File' },
                      { value: 'boolean', label: 'Yes/No' }
                    ].map((typeOption) => (
                      <label key={typeOption.value} className="flex items-center">
                        <input
                          type="radio"
                          name="questionType"
                          value={typeOption.value}
                          checked={newQuestion.type === typeOption.value}
                          onChange={(e) => setNewQuestion({...newQuestion, type: e.target.value, options: e.target.value === 'options' ? [''] : []})}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">{typeOption.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {newQuestion.type === 'options' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options
                    </label>
                    <div className="space-y-2">
                      {newQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newQuestion.options];
                              newOptions[index] = e.target.value;
                              setNewQuestion({...newQuestion, options: newOptions});
                            }}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {newQuestion.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOptions = newQuestion.options.filter((_, i) => i !== index);
                                setNewQuestion({...newQuestion, options: newOptions});
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M6 2L10 2M2 4L14 4M12 4L12 13C12 13.5523 11.5523 14 11 14L5 14C4.44772 14 4 13.5523 4 13L4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setNewQuestion({...newQuestion, options: [...newQuestion.options, '']});
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Add Option
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between flex-shrink-0">
              <button
                onClick={() => {
                  setShowAddQuestion(false);
                  setNewQuestion({
                    question: '',
                    description: '',
                    type: 'text',
                    required: false,
                    options: [],
                    active: true
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L2 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Close
              </button>
              <button
                onClick={handleAddQuestion}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {showEditQuestion && editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-900">Edit question</h2>
                </div>
                <button
                  onClick={() => {
                    setShowEditQuestion(false);
                    setEditingQuestion(null);
                    setNewQuestion({
                      question: '',
                      description: '',
                      type: 'text',
                      required: false,
                      options: [],
                      active: true
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Question details</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question
                  </label>
                  <input
                    type="text"
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your question"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newQuestion.description}
                    onChange={(e) => setNewQuestion({...newQuestion, description: e.target.value})}
                    className="w-full px-3 py-2 min-h-[80px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter question description"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newQuestion.required}
                      onChange={(e) => setNewQuestion({...newQuestion, required: e.target.checked})}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      newQuestion.required ? 'bg-blue-600' : 'bg-gray-200'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        newQuestion.required ? 'translate-x-5' : 'translate-x-0.5'
                      } mt-0.5`}>
                      </div>
                    </div>
                  </label>
                  <span className="text-sm text-gray-700">This question must be answered to submit the form.</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Question type
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'text', label: 'Text' },
                      { value: 'textarea', label: 'Long text' },
                      { value: 'options', label: 'Options menu' },
                      { value: 'date', label: 'Date' },
                      { value: 'file', label: 'File' },
                      { value: 'boolean', label: 'Yes/No' }
                    ].map((typeOption) => (
                      <label key={typeOption.value} className="flex items-center">
                        <input
                          type="radio"
                          name="questionTypeEdit"
                          value={typeOption.value}
                          checked={newQuestion.type === typeOption.value}
                          onChange={(e) => setNewQuestion({...newQuestion, type: e.target.value, options: e.target.value === 'options' ? (newQuestion.options.length > 0 ? newQuestion.options : ['']) : []})}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">{typeOption.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {newQuestion.type === 'options' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options
                    </label>
                    <div className="space-y-2">
                      {newQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newQuestion.options];
                              newOptions[index] = e.target.value;
                              setNewQuestion({...newQuestion, options: newOptions});
                            }}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {newQuestion.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOptions = newQuestion.options.filter((_, i) => i !== index);
                                setNewQuestion({...newQuestion, options: newOptions});
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M6 2L10 2M2 4L14 4M12 4L12 13C12 13.5523 11.5523 14 11 14L5 14C4.44772 14 4 13.5523 4 13L4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setNewQuestion({...newQuestion, options: [...newQuestion.options, '']});
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Add Option
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between flex-shrink-0">
              <button
                onClick={() => {
                  setShowEditQuestion(false);
                  setEditingQuestion(null);
                  setNewQuestion({
                    question: '',
                    description: '',
                    type: 'text',
                    required: false,
                    options: [],
                    active: true
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L2 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Close
              </button>
              
              <button
                onClick={handleUpdateQuestion}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save changes
              </button>
            </div>
          </div>
         </div>
          )}
    </div>
  );
}