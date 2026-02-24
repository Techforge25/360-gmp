# SMS FLOW USING TWILIO

### Installation
```bash
npm install twilio
```

---

`.env`
```javascript
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

`src/service/sms.js`
```javascript
const twilio = require('twilio');
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

// Initialize twilio
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Send SMS helper
const sendSMS = async (to, message) => {
    client.messages.create({
        from: TWILIO_PHONE_NUMBER,
        to: to,
        body: message
    })
    .then(message => console.log(message.sid))
    .catch(error => console.error(error)); 
};

module.exports = { sendSMS };
```