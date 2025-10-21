const BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

export async function apiRequest(path, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        console.log(`Making ${method} request to: ${BASE_URL}${path}`);
        
        const response = await fetch(`${BASE_URL}${path}`, options);
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            console.error('Non-JSON response:', textResponse);
            throw new Error(`API returned non-JSON response (${response.status} ${response.statusText}). Response: ${textResponse.substring(0, 200)}...`);
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
        }
        
        return data;
    } catch (err) {
        console.error('API Error:', err);
        
        // Handle network errors
        if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
            throw new Error('Network error: Unable to connect to API server. Please check your internet connection and server status.');
        }
        
        throw err;
    }
}