const { cookieOptions } = require("../constants");
const User = require("../models/users");
const { generateAccessToken } = require("../utils/accessToken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { userSignupSchema } = require("../validations/user");

// User signup
const userSignup = asyncHandler(async (request, response) => {
    // Validate
    const { email, passwordHash } = validate(userSignupSchema, request.body);
    const user = await User.create({ email, passwordHash });
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

    // Generate access token
    const accessToken = generateAccessToken(user);
    if(!accessToken) throw new ApiError(500, "Failed to generate access token");
    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, null, "Login successful"));
});

module.exports = { userSignup, userLogin };