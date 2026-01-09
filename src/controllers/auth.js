const { cookieOptions } = require("../constants");
const BusinessProfile = require("../models/businessProfileSchema");
const UserProfile = require("../models/userProfile");
const User = require("../models/users");
const { generateAccessToken } = require("../utils/accessToken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { getUserProfile, getBusinessProfile } = require("../utils/getProfiles");
const validate = require("../utils/validate");
const { userSignupSchema } = require("../validations/user");

// User signup
const userSignup = asyncHandler(async (request, response) => {
    // Validate
    const { email, passwordHash } = validate(userSignupSchema, request.body);
    const user = await User.create({ email, passwordHash, role:null });
    if(!user) throw new ApiError(500, "Unable to signup");

    return response.status(201).json(new ApiResponse(201, null, "Signup successful"));
});

// User login
const userLogin = asyncHandler(async (request, response) => {
    const { email, passwordHash } = request.body;
    if(!email) throw new ApiError(400, "Email is required");
    if(!passwordHash) throw new ApiError(400, "Password is required");

    // Find user
    const user = await User.findOne({ email });
    if(!user) throw new ApiError(400, "Invalid credentials");

    // Match password
    const isMatched = await user.matchPassword(passwordHash);
    if(!isMatched) throw new ApiError(400, "Invalid credentials");

    // Find profiles
    const [businessProfile, userProfile] = await Promise.all([
        BusinessProfile.findOne({ ownerUserId:user._id }).lean(),
        UserProfile.findOne({ userId:user._id }).lean()
    ]);

    // Payload based on role
    const profilePayload = user.role === "user" ? userProfile : businessProfile;

    // Generate access token
    const accessToken = generateAccessToken(user);
    if(!accessToken) throw new ApiError(500, "Failed to generate access token");
    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, { profilePayload, accessToken, role:user.role, isNew:user.isNew }, "Login successful"));
});

// Logout
const logout = asyncHandler(async (request, response) => {
    return response.status(200)
    .clearCookie("accessToken", cookieOptions)
    .json(new ApiResponse(200, null, "Logout successful"));
});

// Refresh token
const refreshToken = asyncHandler(async (request, response) => {
    const { _id } = request.user;
    const role = request.query?.role || null;
    if(!role) throw new ApiError(400, "Role is required for refreshing a token");
    if(role.toLowerCase() !== "user" && role.toLowerCase() !== "business") throw new ApiError(400, "Invalid role");

    // Check if user profile actually exist before switching
    if(role.toLowerCase() === "user")
    {
        const userProfile = await getUserProfile(_id);
        if(!userProfile) throw new ApiError(404, "User profile not found! Please create user profile first");
    }

    // Check if business profile actually exist before switching
    if(role.toLowerCase() === "business")
    {
        const businessProfile = await getBusinessProfile(_id);
        if(!businessProfile) throw new ApiError(404, "Business profile not found! Please create business profile first");
    }    

    // Save to db
    const user = await User.findByIdAndUpdate(_id, { role }, { new:true, lean:true }).select("role");
    if(!user) throw new ApiError(400, "Failed to update role in db.");

    // Find profiles
    const [businessProfile, userProfile] = await Promise.all([
        BusinessProfile.findOne({ ownerUserId:user._id }).lean(),
        UserProfile.findOne({ userId:user._id }).lean()
    ]);

    console.log("Business", businessProfile);
    console.log("User", userProfile);

    // Payload based on role
    const profilePayload = user.role === "user" ? userProfile : businessProfile;    
    console.log("Profile payload", profilePayload);

    // Generate a new token
    const payload = { _id, role };
    const accessToken = generateAccessToken(payload);
    if(!accessToken) throw new ApiError(500, "Failed to generate access token");

    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, { profilePayload }, `Access token has been refreshed! role has changed to ${role}`));
});

module.exports = { userSignup, userLogin, logout, refreshToken };