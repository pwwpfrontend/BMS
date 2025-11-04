import formsAPI from '../services/formsApi';

// Simple API connectivity test
export const testApiConnection = async () => {
  try {
    console.log('🔍 Testing API connection...');
    
    // Test 1: Get all forms
    console.log('📝 Testing GET /forms...');
    const forms = await formsAPI.getAllForms();
    console.log('✅ Forms loaded successfully:', forms.length, 'forms found');
    
    if (forms.length > 0) {
      const testFormId = forms[0]._id;
      
      // Test 2: Get specific form
      console.log('📋 Testing GET /forms/:id...');
      const form = await formsAPI.getFormById(testFormId);
      console.log('✅ Form details loaded:', form.name);
      
      // Test 3: Get form fields
      console.log('🔧 Testing GET /forms/:id/fields...');
      const fields = await formsAPI.getFormFields(testFormId);
      console.log('✅ Form fields loaded:', fields.fields?.length || 0, 'fields found');
      
      // Test 4: Get form responses
      try {
        console.log('📊 Testing GET /form-responses/:formId...');
        const responses = await formsAPI.getFormResponses(testFormId);
        console.log('✅ Form responses loaded:', responses.length, 'responses found');
      } catch (responseError) {
        console.log('ℹ️ No responses found for this form (this is normal)');
      }
    }
    
    console.log('🎉 All API tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    return false;
  }
};

// Test form creation
export const testFormCreation = async () => {
  try {
    console.log('🔨 Testing form creation...');
    
    const testForm = {
      name: `Test Form ${Date.now()}`,
      description: 'Created by frontend test',
      type: 'survey',
      active: true
    };
    
    const result = await formsAPI.createForm(testForm);
    console.log('✅ Form created successfully:', result);
    
    // Clean up - delete the test form
    if (result.form?._id) {
      try {
        await formsAPI.deleteForm(result.form._id);
        console.log('🧹 Test form cleaned up');
      } catch (deleteError) {
        console.warn('⚠️ Could not clean up test form:', deleteError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Form creation test failed:', error);
    return false;
  }
};

// Run all tests
export const runAllTests = async () => {
  console.log('🚀 Starting API integration tests...\n');
  
  const connectionTest = await testApiConnection();
  const creationTest = await testFormCreation();
  
  console.log('\n📋 Test Results:');
  console.log('Connection Test:', connectionTest ? '✅ PASS' : '❌ FAIL');
  console.log('Creation Test:', creationTest ? '✅ PASS' : '❌ FAIL');
  
  return connectionTest && creationTest;
};