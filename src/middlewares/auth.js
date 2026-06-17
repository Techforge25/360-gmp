const { getAccessToken, verifyAccessToken } = require("../utils/accessToken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Redirect url
const redirectURL = `http://localhost:3000`;

// Authentication
const authentication = asyncHandler((request, response, next) => {
    const accessToken = getAccessToken(request);
    if(!accessToken) return response.status(401).json(new ApiResponse(401, { redirectURL }, "Unauthorized!"));

    // Verify
    const user = verifyAccessToken(accessToken);
    if(!user) return response.status(401).json(new ApiResponse(401, { redirectURL }, "Unauthorized"));

    // Pass through
    request.user = user;
    return next();
});

// Authorization based on role
const authorization = (roles = []) => {
    return (request, response, next) => {
        if(!request.user) throw new ApiError(401, "Login required!");
        if(!roles.includes(request.user?.role)) throw new ApiError(403, "Access denied");
        return next();
    }
};

module.exports = { authentication, authorization };