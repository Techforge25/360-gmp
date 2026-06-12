const { getAccessToken, verifyAccessToken } = require("../utils/accessToken");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// Authentication
const authentication = asyncHandler((request, response, next) => {
    const accessToken = getAccessToken(request);
    // if(!accessToken) throw new ApiError(401, "Unauthorized!");
    if(!accessToken) return response.status(303).redirect(`${process.env.FRONTEND_URL}/login`);

    // Verify
    const user = verifyAccessToken(accessToken);
    // if(!user) throw new ApiError(401, "Invalid access token");
    if(!user) return response.status(303).redirect(`${process.env.FRONTEND_URL}/login`);

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