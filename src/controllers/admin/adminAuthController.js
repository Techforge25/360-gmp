const { cookieOptions } = require("../../constants");
const Admin = require("../../models/adminModel");
const { generateAdminAccessToken, generateAdminRefreshToken, 
getAdminRefreshToken, verifyAdminRefreshToken } = require("../../utils/adminAccessToken");
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

    // Save refresh token in db
    admin.refreshToken = refreshToken;
    await admin.save();

    // Response
    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { username: admin.username }, "Admin login successful"));
});

// Admin logout
const adminLogout = asyncHandler(async (request, response) => {
    const adminId = request.admin._id;

    // Clear refresh token in db
    const admin = await Admin.findByIdAndUpdate(adminId, { refreshToken:null }, { new:true, lean:true }).select("_id");
    if(!admin) throw new ApiError(500, "Failed to clear refresh token from db");

    // Response
    return response.status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "Logout successful"));
});

// Refresh token
const adminRefreshToken = asyncHandler(async (request, response) => {
    // Get token
    const token = getAdminRefreshToken(request);
    if(!token) throw new ApiError(401, "Unauthorized! Refresh token is missing");

    // Verify refresh token
    const payload = verifyAdminRefreshToken(token);
    if(!payload) throw new ApiError(401, "Unauthorized! Invalid refresh token");

    // Find admin
    const admin = await Admin.findById(payload._id).select("_id role refreshToken");
    if(!admin) throw new ApiError(404, "Admin not found associated with the provided refresh token");

    // Compare tokens
    if(admin.refreshToken !== token) throw new ApiError(400, "Refresh token mismatch");

    // Generate tokens
    const accessToken = generateAdminAccessToken({ _id: admin._id, role: admin.role });
    const refreshToken = generateAdminRefreshToken({ _id: admin._id });

    // Validate
    if(!accessToken) throw new ApiError(400, "Failed to re-generate admin access token");
    if(!refreshToken) throw new ApiError(400, "Failed to re-generate admin refresh token");

    // Save to db
    admin.refreshToken = refreshToken;
    await admin.save(); 

    // Response
    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, null, "Refresh token for admin has been issued"));
});

module.exports = { adminLogin, adminLogout, adminRefreshToken };