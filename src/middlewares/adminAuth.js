const { frontendURL } = require("../constants");
const { getAdminAccessToken, verifyAdminAccessToken } = require("../utils/adminAccessToken");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Admin Authentication
const adminAuthentication = asyncHandler((request, response, next) => {
    const accessToken = getAdminAccessToken(request);
    if(!accessToken)
    {
        return response.status(401)
        .json(new ApiResponse(401, { redirectURL: `${frontendURL}/login` }, "Unauthorized! Access token is missing"));
    }

    // Verify
    const admin = verifyAdminAccessToken(accessToken);
    if(!admin)
    {
        return response.status(401)
        .json(new ApiResponse(401, { redirectURL: `${frontendURL}/login` }, "Unauthorized! Invalid access token"));
    }

    // Pass through
    request.admin = admin;
    return next();
});

// Admin Authorization based on role
const adminAuthorization = (roles = []) => {
    return (request, response, next) => {
        if(!request.admin)
        {
            return response.status(401)
            .json(new ApiResponse(401, { redirectURL: `${frontendURL}/login` }, "Unauthorized!"));
        }

        if(!roles.includes(request.admin.role))
        {
            return response.status(403)
            .json(new ApiResponse(403, { redirectURL: `${frontendURL}/forbidden` }, "Access denied!"));
        }
        return next();
    }
};

// Grant access to module
const grantAccessTo = (moduleName) => {
    return (request, response, next) => {
        // Bypass for super admin
        if(request.admin.role === "superAdmin") return next();

        // Allow module
        if(!request.admin.allowedModules.includes(moduleName))
        {
            return response.status(403)
            .json(new ApiResponse(403, { redirectURL: `${frontendURL}/forbidden` }, "Access denied!"));
        }
        return next();
    }
};

module.exports = { adminAuthentication, adminAuthorization, grantAccessTo };