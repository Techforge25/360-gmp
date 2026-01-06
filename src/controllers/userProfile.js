const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createUserProfileSchema } = require("../validations/userProfile");

const createUserProfile = asyncHandler(async (request, response) => {
    // Validate
    const { error, value } = createUserProfileSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Profile payload
    const profileData = { ...value, userId: request.user._id };
    const profile = await UserProfile.create(profileData);
    if(!profile) throw new ApiError(500, "Failed to create user profile");

    return response.status(201).json(new ApiResponse(201, profile, "User profile has been created"));
});

module.exports = { createUserProfile };