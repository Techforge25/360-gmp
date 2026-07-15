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

    // Get IP (IPv4)
    const ip = request.headers["x-real-ip"];
    const key = `invalidCredetialsAttempts:${ip}`;

    // Check total attempts
    const totalAttempts = await getCache(key);
    if(totalAttempts >= 5) throw new ApiError(429, "Too many failed login attempts. Please try again after 5 minutes");    

    // Find admin
    const admin = await Admin.findOne({ username });
    if(!admin)
    {
        const attempts = await redis.incr(key);

        // Set expiry only on first failed attempt
        if(attempts === 1) await redis.expire(key, 60 * 5); // 5 minutes
        throw new ApiError(400, "Invalid credentials");
    }

    // Match password
    const isMatched = await admin.matchPassword(password);
    if(!isMatched)
    {
        const attempts = await redis.incr(key);

        // Set expiry only on first failed attempt
        if(attempts === 1) await redis.expire(key, 60 * 5); // 5 minutes       
        throw new ApiError(400, "Invalid credentials");
    }

    // Delete attempts from redis cache
    await deleteCache(key);

    // Generate access & refresh tokens
    const accessToken = generateAdminAccessToken(admin);
    const refreshToken = generateAdminRefreshToken(admin);

    // Validate tokens
    if(!accessToken) throw new ApiError(500, "Failed to generate access token");
    if(!refreshToken) throw new ApiError(500, "Failed to generate refresh token");

    // Save refresh token to db
    admin.refreshToken = refreshToken;
    admin.save();

    // Response
    return response.status(200)
    .cookie("adminAccessToken", accessToken, cookieOptions)
    .cookie("adminRefreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, null, "Login successful!"));
});

// Auth me
const adminAuthCheck = asyncHandler(async (request, response) => {
    const adminId = request.admin._id;
    
    // Response
    return response.status(200).json(new ApiResponse(200, { adminId }, "Authenticated"));
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
    const admin = await Admin.findById(payload._id);
    if(!admin) throw new ApiError(404, "Admin not found associated with the provided refresh token");

    // Compare tokens
    if(admin.refreshToken !== token) throw new ApiError(400, "Refresh token mismatch");

    // Generate tokens
    const accessToken = generateAdminAccessToken(admin);
    const refreshToken = generateAdminRefreshToken(admin);

    // Validate
    if(!accessToken) throw new ApiError(500, "Failed to re-generate admin access token");
    if(!refreshToken) throw new ApiError(500, "Failed to re-generate admin refresh token");

    // Save to db
    admin.refreshToken = refreshToken;
    await admin.save(); 

    // Response
    return response.status(200)
    .cookie("adminAccessToken", accessToken, cookieOptions)
    .cookie("adminRefreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, null, "Refresh token for admin has been issued"));
});

// Admin logout
const adminLogout = asyncHandler(async (request, response) => {
    const adminId = request.admin._id;

    // Clear refresh token in db
    const admin = await Admin.findByIdAndUpdate(adminId, { $set:{ refreshToken: null } });
    if(!admin) throw new ApiError(500, "Failed to clear refresh token from db");

    // Response
    return response.status(200)
    .clearCookie("adminAccessToken", cookieOptions)
    .clearCookie("adminRefreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "Logout successful"));
});

module.exports = { adminLogin, adminAuthCheck, adminRefreshToken, adminLogout };