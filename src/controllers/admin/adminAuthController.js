const { cookieOptions } = require("../../constants");
const Admin = require("../../models/adminModel");
const { generateAdminAccessToken, generateAdminRefreshToken } = require("../../utils/adminAccessToken");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../utils/validate");
const { adminLoginValidationSchema } = require("../../validations/adminAuthValidator");

// Admin login
const adminLogin = asyncHandler(async (request, response) => {
    // Get validated payload
    const { username, password } = validate(adminLoginValidationSchema, request.body);

    // Find admin
    const admin = await Admin.findOne({ username });
    if(!admin) throw new ApiError(400, "Invalid username or password");

    // Match password
    const isMatched = await admin.matchPassword(password);
    if(!isMatched) throw new ApiError(400, "Invalid username or password");

    // Generate access & refresh tokens
    const accessToken = generateAdminAccessToken({ _id: admin._id, role: admin.role });
    const refreshToken = generateAdminRefreshToken({ _id: admin._id });

    // Validate tokens
    if(!accessToken) throw new ApiError(500, "Failed to generate admin access token");
    if(!refreshToken) throw new ApiError(500, "Failed to generate admin refresh token");

    // Save refresh token
    admin.refreshToken = refreshToken;
    await admin.save();

    // Response
    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { username: admin.username, accessToken, refreshToken }, "Admin login successful"));
});

module.exports = { adminLogin };