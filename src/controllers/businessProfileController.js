const BusinessProfile = require("../models/businessProfileSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createBusinessProfileSchema, updateBusinessProfileSchema } = require("../validations/businessProfileVaidator");
const User = require("../models/users");
const Wallet = require("../models/walletModel");

// Create business
const createBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Check if user has already created BusinessProfile
    const existingProfile = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id").lean();
    if(existingProfile) throw new ApiError(400, "You have already created a business profile");

    // Validate
    const { error, value } = createBusinessProfileSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Prepare profile payload
    const profileData = { ...value, ownerUserId:userId };

    // Create profile
    const profile = await BusinessProfile.create(profileData);
    if(!profile) throw new ApiError(500, "Failed to create business profile");

    // Executes queries parallel
    const [wallet, user] = await Promise.all([
        Wallet.create({ ownerId:profile._id, ownerModel:"BusinessProfile" }),
        User.findByIdAndUpdate(userId, { role:"business", isNewToPlatform:false }, { new:true, lean:true })
    ]);

    // Validate
    if(!wallet) throw new ApiError(500, "Failed to setup wallet account business");
    if(!user) throw new ApiError(500, "Failed to update user status upon business profile creation");

    // Response
    return response.status(201).json(new ApiResponse(201, { profile, isNewToPlatform:user.isNewToPlatform }, "Business profile has been created"));
});

// Fetch business profiles
const fetchBusinessProfiles = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search, industry, country } = request.query;

    // Filters
    const filter = {};
    if(search) filter.companyName = { $regex:search, $options:"i" };
    if(industry) filter.primaryIndustry = { $regex:industry, $options:"i" };
    if(country) filter["location.country"] = { $regex: country, $options: "i" };

    // Fetch
    const profiles = await BusinessProfile.paginate(filter, { page, limit });
    if(!profiles.docs?.length) return response.status(200).json(new ApiResponse(200, profiles, "No business profiles found"));

    // Response
    return response.status(200).json(new ApiResponse(200, profiles, "Business profiles fetched successfully"));
});

// Fetch my business
const fetchMyBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get business
    const businessProfile = await BusinessProfile.findOne({ ownerUserId:userId }).select("-updatedAt -__v").lean();
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfile, "Business profile has been fetched successfully"));
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

    // Response
    return response.status(200).json(new ApiResponse(200, profile, "Business profile has been updated"));
});

// Delete my business profile
const deleteMyBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get business
    const businessProfile = await BusinessProfile.findOneAndDelete({ ownerUserId:userId }).select("_id").lean();
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfile, "Business profile has been deleted successfully"));
});

// Get direction
const getDirection = asyncHandler(async (request, response) => {
    const { businessId } = request.params;

    // Find business profile
    const businessProfile = await BusinessProfile.findById(businessId).select("-_id location").lean();
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfile, "Location has been fetched"));
});

// Fetch latest business for market place
const fetchLatestBusiness = asyncHandler(async (request, response) => {
    // Get business
    const business = await BusinessProfile.find({}).limit(10).lean();

    // Response
    return response.status(200).json(new ApiResponse(200, business, "Latest Business has been fetched successfully"));
});

module.exports = { createBusinessProfile, fetchBusinessProfiles, fetchMyBusinessProfile, 
updateBusinessProfile, deleteMyBusinessProfile, getDirection, fetchLatestBusiness };