const { getAdminAccessToken, verifyAdminAccessToken } = require("../utils/adminAccessToken");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// Admin Authentication
const adminAuthentication = asyncHandler((request, response, next) => {
    const accessToken = getAdminAccessToken(request);
    if(!accessToken) throw new ApiError(401, "Unauthorized!");

    // Verify
    const admin = verifyAdminAccessToken(accessToken);
    if(!admin) throw new ApiError(401, "Invalid access token");

    // Pass through
    request.admin = admin;
    return next();
});

// Admin Authorization based on role
const adminAuthorization = (roles = []) => {
    return (request, response, next) => {
        if(!request.admin) throw new ApiError(401, "Unauthorized!");
        if(!roles.includes(request.admin?.role)) throw new ApiError(403, "Access denied");
        return next();
    }
};

module.exports = { adminAuthentication, adminAuthorization };