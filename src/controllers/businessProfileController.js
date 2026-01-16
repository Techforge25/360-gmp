const BusinessProfile = require("../models/businessProfileSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createBusinessProfileSchema, updateBusinessProfileSchema } = require("../validations/businessProfileVaidator");
const User = require("../models/users");

const createBusinessProfile = asyncHandler(async (request, response) => {
    // Validate
    const { error, value } = createBusinessProfileSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Profile payload
    const profileData = { ...value, ownerUserId: request.user._id };
    const profile = await BusinessProfile.create(profileData);
    if(!profile) throw new ApiError(500, "Failed to create business profile");

    // Update user status
    const user = await User.findByIdAndUpdate(profile.userId, { role:"business", isNewToPlatform:false }, { new:true, lean:true });
    if(!user) throw new ApiError(500, "Failed to update user status upon business profile creation");
    return response.status(201).json(new ApiResponse(201, { profile, isNewToPlatform:user.isNewToPlatform }, "Business profile has been created"));
});

// Fetch business profiles
const fetchBusinessProfiles = asyncHandler(async (request, response) => {
    const profiles = await BusinessProfile.find().lean();
    return response.status(200).json(new ApiResponse(200, profiles, "Business profiles fetched successfully"));
});

const updateBusinessProfile = asyncHandler(async (request, response) => {
    // Validate
    const { error, value } = updateBusinessProfileSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Find and update profile
    const profile = await BusinessProfile.findOneAndUpdate(
        { ownerUserId: request.user._id },
        { $set: value },
        { new: true, runValidators: true }
    );
    
    if(!profile) throw new ApiError(404, "Business profile not found");

    return response.status(200).json(new ApiResponse(200, profile, "Business profile has been updated"));
});

module.exports = { createBusinessProfile, fetchBusinessProfiles, updateBusinessProfile };