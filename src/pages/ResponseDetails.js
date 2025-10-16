import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import formsAPI from '../services/formsApi';

export default function ResponseDetails() {
  const { formId, responseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responseDetails, setResponseDetails] = useState(null);
  const [formDetails, setFormDetails] = useState(null);

  // Load response data on component mount
  useEffect(() => {
    if (formId && responseId) {
      loadResponseData();
    }
  }, [formId, responseId]);

  const loadResponseData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load form details and response data in parallel
      const [formResponse, detailedResponse] = await Promise.all([
        formsAPI.getFormById(formId),
        formsAPI.getResponseDetails(formId, responseId)
      ]);
      
      // Set form details
      setFormDetails({
        name: formResponse.name,
        description: formResponse.description || '',
        type: formResponse.type || 'survey',
        active: formResponse.active
      });
      
      if (detailedResponse) {
        const responseData = {
          formRequest: {
            customer: detailedResponse.submittedBy || 'Anonymous User',
            form: formResponse.name,
            sentOn: new Date(detailedResponse.createdAt).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
          },
          answers: detailedResponse.responses?.map(resp => ({
            question: resp.question,
            answer: typeof resp.answer === 'boolean' ? (resp.answer ? 'Yes' : 'No') : resp.answer,
            id: resp._id
          })) || []
        };
        
        setResponseDetails(responseData);
      } else {
        setError('Response not found');
      }
      
    } catch (err) {
      setError('Failed to load response details. Please try again.');
      console.error('Error loading response details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar currentPath="/forms" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading response details...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar currentPath="/forms" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Response</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => navigate(`/forms/${formId}`, { state: { activeTab: 'requests' } })}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Back to Form
              </button>
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
                onClick={() => navigate(`/forms/${formId}`, { state: { activeTab: 'requests' } })}
                className="text-blue-600 hover:text-blue-700 mb-2 text-sm"
              >
                ← Back to {formDetails?.name || 'Form'}
              </button>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">Response Details</h1>
              <p className="text-sm text-gray-500">{formDetails?.name}</p>
            </div>

            {responseDetails && (
              <div className="space-y-6">
                {/* Form Request Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Form request</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Select the form you want to send to the customer. Their responses are available below once they complete the form.
                    </p>
                  </div>
                  
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Customer
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                          {responseDetails.formRequest.customer}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Form
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                          {responseDetails.formRequest.form}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sent on
                        </label>
                        <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {responseDetails.formRequest.sentOn}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Answers Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Answers</h3>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search..."
                          className="pl-9 pr-4 py-2 w-64 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                        Filters
                        <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded">0</span>
                      </button>
                      <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 2v8m0 0L5.5 7.5M8 10l2.5-2.5M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {responseDetails.answers.map((answer, index) => (
                      <div key={answer.id || index} className="px-6 py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-6">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-4 mt-1"
                            />
                            <div className="inline-block">
                              <h4 className="text-sm font-medium text-gray-900 mb-1">
                                {answer.question}
                              </h4>
                              <p className="text-sm text-gray-700 font-medium">
                                {answer.answer}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <button
                    onClick={() => navigate(`/forms/${formId}`, { state: { activeTab: 'requests' } })}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 12L2 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Back to Form
                  </button>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 2L10 2M2 4L14 4M12 4L12 13C12 13.5523 11.5523 14 11 14L5 14C4.44772 14 4 13.5523 4 13L4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Delete
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v8m0 0L5.5 7.5M8 10l2.5-2.5M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Save changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}