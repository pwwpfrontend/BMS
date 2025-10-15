const BASE_URL = 'http://optimus-india-njs-01.netbird.cloud:4000/booking_system';

export async function apiRequest(path, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${BASE_URL}${path}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Request failed');
        }
        
        return data;
    } catch (err) {
        console.error('API Error:', err);
        throw err;
    }
}