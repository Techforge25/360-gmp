// Get otp key
const getOTPKey = (email) => `otp:${email}`;

// Get otp key
const getResetPasswordKey = (email) => `resetPassword:${email}`;


module.exports = { getOTPKey, getResetPasswordKey };