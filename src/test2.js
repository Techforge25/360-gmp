const axios = require('axios');

// Example usage
const shipmentData = {
    orderId: "12345",
    recipient: "John Doe",
    address: "123 Main St, City, Country",
    weightKg: 5
};

// Replace with actual Maersk API environment URL
const MAERSK_API_URL = 'https://api.maersk.com/shipments'; 

const test = async () => {
    try 
    {
        // 1. Get Authentication Token (OAuth 2.0)
        // In production, cache this token until expiration
        const tokenResponse = await axios.post('https://api-stage.maersk.com/oauth2/access_token', {
            grant_type: 'client_credentials' 
        }, 
        {
            headers: {
                'Authorization': 'Basic ' + Buffer.from('YOUR_CLIENT_ID:YOUR_CLIENT_SECRET').toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const token = tokenResponse.data.access_token;

        // 2. Call Maersk API
        const response = await axios.post(MAERSK_API_URL, shipmentData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'ApiKey': 'YOUR_API_KEY' // Usually required for Visibility/Shipment APIs
            }
        });

        // 3. Return Response
        return response.data;
    } 
    catch(error) 
    {
        console.error('Error creating shipment:', error.response ? error.response.data : error.message);
        throw error; // Re-throw to handle in calling function
    }
};