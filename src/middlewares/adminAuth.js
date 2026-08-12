const { adminFrontendURL, cookieOptions, superAdminId } = require("../constants");
const { getAdminAccessToken, verifyAdminAccessToken } = require("../utils/adminAccessToken");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Admin Authentication
const adminAuthentication = asyncHandler((request, response, next) => {
    const accessToken = getAdminAccessToken(request);
    if(!accessToken)
    {
        return response.status(401)
        .json(new ApiResponse(401, { redirectURL: `${adminFrontendURL}/login` }, "Unauthorized! Access token is missing"));
    }

    // Verify
    const admin = verifyAdminAccessToken(accessToken);
    if(!admin)
    {
        return response.status(401)
        .json(new ApiResponse(401, { redirectURL: `${adminFrontendURL}/login` }, "Unauthorized! Invalid access token"));
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
            .json(new ApiResponse(401, { redirectURL: `${adminFrontendURL}/login` }, "Unauthorized!"));
        }

        // Bypass for super admin
        if(request.admin._id === superAdminId) return next();        

        if(!roles.includes(request.admin.role))
        {
            return response.status(403)
            .json(new ApiResponse(403, { redirectURL: `${adminFrontendURL}/forbidden` }, "Access denied!"));
        }
        return next();
    }
};

// Strict authorization for super admin
const authorizeSuperAdmin = asyncHandler((request, response, next) => {
    const adminId = request.admin._id;
    if(adminId !== superAdminId)
    {
        return response.status(403)
        .json(new ApiResponse(403, { redirectURL: `${adminFrontendURL}/forbidden` }, "Access denied!"));        
    }
    return next();
});

// Grant access to module
const grantAccessTo = (moduleName) => {
    return (request, response, next) => {
        const { _id: adminId, allowedModules } = request.admin;

        // Bypass for super admin
        if(adminId === superAdminId) return next();

        // Allow module
        const hasAccess = allowedModules.some(m => m.module === moduleName);
        if(!hasAccess)
        {
            return response.status(403)
            .json(new ApiResponse(403, { redirectURL: `${adminFrontendURL}/forbidden`, hasAccess }, "Access denied!"));
        }
        return next();
    }
};

module.exports = { adminAuthentication, adminAuthorization, authorizeSuperAdmin, grantAccessTo };