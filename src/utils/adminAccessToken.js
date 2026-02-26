const jwt = require("jsonwebtoken");
const { ADMIN_ACCESS_TOKEN_SECRET, ADMIN_ACCESS_TOKEN_EXPIRY, ADMIN_REFRESH_TOKEN_SECRET, ADMIN_REFRESH_TOKEN_EXPIRY } = process.env;

// Generate admin access token
const generateAdminAccessToken = (payload) => {
    if(!payload) return null;
    try 
    {
        return jwt.sign({
            _id:payload._id,
            role:payload.role,
        }, ADMIN_ACCESS_TOKEN_SECRET, { expiresIn:ADMIN_ACCESS_TOKEN_EXPIRY });
    } 
    catch(error) 
    {
        console.log("Failed to generate admin access token", error.message);
        return null;
    }
};

// Verify admin access token
const verifyAdminAccessToken = (accessToken) => {
    if(!accessToken) return null;
    try 
    {
        return jwt.verify(accessToken, ADMIN_ACCESS_TOKEN_SECRET);
    } 
    catch(error) 
    {
        console.log("Failed to verify admin access token", error.message);
        return null;
    }
};

// Get admin access token
const getAdminAccessToken = (request) => {
    if(!request) return null;
    try
    {
        const accessToken = request.cookies?.adminAccessToken || request.signedCookies?.adminAccessToken;
        return accessToken;
    }
    catch(error)
    {
        console.log("Failed to extract admin access token", error.message);
        return null;
    }
};

// Generate admin refresh token
const generateAdminRefreshToken = (payload) => {
    if(!payload) return null;
    try 
    {
        return jwt.sign({
            _id:payload._id,
        }, ADMIN_REFRESH_TOKEN_SECRET, { expiresIn:ADMIN_REFRESH_TOKEN_EXPIRY });
    } 
    catch(error) 
    {
        console.log("Failed to generate admin refresh token", error.message);
        return null;
    }
};

// Verify admin refresh token
const verifyAdminRefreshToken = (refreshToken) => {
    if(!refreshToken) return null;
    try 
    {
        return jwt.verify(refreshToken, ADMIN_REFRESH_TOKEN_SECRET);
    } 
    catch(error) 
    {
        console.log("Failed to verify admin refresh token", error.message);
        return null;
    }
};

// Get admin refresh token
const getAdminRefreshToken = (request) => {
    if(!request) return null;
    try
    {
        const refreshToken = request.cookies?.adminRefreshToken || request.signedCookies?.adminRefreshToken;
        return refreshToken;
    }
    catch(error)
    {
        console.log("Failed to extract admin refresh token", error.message);
        return null;
    }
};

module.exports = { 
    generateAdminAccessToken, verifyAdminAccessToken, getAdminAccessToken,
    generateAdminRefreshToken, verifyAdminRefreshToken, getAdminRefreshToken
};