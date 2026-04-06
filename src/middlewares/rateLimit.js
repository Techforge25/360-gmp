const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

// Limit the requests
const limitRequest = ({ minutes = 1, maxRequests = 10, message = "Too many requests, please try again later" }) => {
    const limiter = rateLimit({
        windowMs: 1000 * 60 * minutes,
        max: maxRequests, // Max requests per IP per window
        handler: () => {
            throw new ApiError(429, message);
        }
    });
    return limiter;
};

module.exports = limitRequest;