const jwt = require("jsonwebtoken");
const { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRY } = process.env;

// Generate access token
const generateAccessToken = (payload) => {
    if(!payload) return null;
    try 
    {
        return jwt.sign({
            _id:payload._id,
            role:payload.role,
            profiles: payload.profiles || {}
        }, ACCESS_TOKEN_SECRET, { expiresIn:ACCESS_TOKEN_EXPIRY });
    } 
    catch(error) 
    {
        console.log("Failed to generate access token", error.message);
        return null;
    }
};

// Verify access token
const verifyAccessToken = (accessToken) => {
    if(!accessToken) return null;
    try 
    {
        return jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    } 
    catch(error) 
    {
        console.log("Failed to verify access token", error.message);
        return null;
    }
};

// Get access token
const getAccessToken = (request) => {
    if(!request) return null;
    try
    {
        const accessToken = request.cookies?.accessToken || request.signedCookies?.accessToken || request.headers['authorization']?.split(" ")?.[1];
        return accessToken;
    }
    catch(error)
    {
        console.log("Failed to extract access token", error.message);
        return null;
    }
};

// Generate refresh token
const generateRefreshToken = (payload) => {
    if(!payload) return null;
    try 
    {
        return jwt.sign({
            _id:payload._id,
        }, REFRESH_TOKEN_SECRET, { expiresIn:REFRESH_TOKEN_EXPIRY });
    } 
    catch(error) 
    {
        console.log("Failed to generate refresh token", error.message);
        return null;
    }
};

// Verify refresh token
const verifyRefreshToken = (refreshToken) => {
    if(!refreshToken) return null;
    try 
    {
        return jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } 
    catch(error) 
    {
        console.log("Failed to verify refresh token", error.message);
        return null;
    }
};

// Get refresh token
const getRefreshToken = (request) => {
    if(!request) return null;
    try
    {
        const refreshToken = request.cookies?.refreshToken || request.signedCookies?.refreshToken;
        return refreshToken;
    }
    catch(error)
    {
        console.log("Failed to extract refresh token", error.message);
        return null;
    }
};

module.exports = { 
    generateAccessToken, verifyAccessToken, getAccessToken,
    generateRefreshToken, verifyRefreshToken, getRefreshToken
};