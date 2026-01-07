const { cookieOptions } = require("../constants");
const { generateAccessToken } = require("../utils/accessToken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Refresh token
const refreshToken = asyncHandler((request, response) => {
    const { _id } = request.user;
    const role = request.query?.role || null;
    if(!role) throw new ApiError(400, "Role is required for refreshing a token");
    if(role.toLowerCase() !== "user" && role.toLowerCase() !== "business") throw new ApiError(400, "Invalid role");

    // Generate a new token
    const payload = { _id, role };
    const accessToken = generateAccessToken(payload);
    if(!accessToken) throw new ApiError(500, "Failed to generate access token");

    return response.status(200)
    .clearCookie("accessToken", cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, null, `Access token has been refreshed! role has changed to ${role}`));
});

module.exports = { refreshToken };