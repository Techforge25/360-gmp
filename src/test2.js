require('dotenv').config();
const axios = require('axios');

// Example usage
const shipmentData = {
    orderId: "12345",
    recipient: "John Doe",
    address: "123 Main St, City, Country",
    weightKg: 5
};

// Production URLs
// const MAERSK_API_URL = 'https://api.maersk.com/shipments'; 
// const TOKEN_ENDPOINT = 'https://api-maersk.com/customer-identity/oauth/v2/access_token';

// Staging URLs
const MAERSK_API_URL = 'https://api-stage.maersk.com/shipments';
const TOKEN_ENDPOINT = 'https://api-stage.maersk.com/customer-identity/oauth/v2/access_token';

const test = async () => {
    try 
    {
        // Get Authentication Token (OAuth 2.0)
        const tokenResponse = await axios.post(TOKEN_ENDPOINT, {
            grant_type: 'client_credentials' 
        }, 
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Consumer-Key': process.env.MAERSK_CLIENT_ID,
                'Consumer-Secret': process.env.MAERSK_CLIENT_SECRET
            }
        });
        const token = tokenResponse.data.access_token;

        // Call Maersk API
        const response = await axios.post(MAERSK_API_URL, shipmentData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Consumer-Key': process.env.MAERSK_CLIENT_ID,
                'Consumer-Secret': process.env.MAERSK_CLIENT_SECRET,
                'ApiKey': process.env.MAERSK_INTEGRATION_ID
            }
        });

        // Return Response
        return response.data;
    } 
    catch(error) 
    {
        console.error('Error creating shipment:', error.response ? error.response.data : error.message);
        throw error;
    }
};

test()
.then(response => console.log(response))
.catch(error => console.error('Test failed:', error.message));