const BusinessProfile = require("../models/businessProfileSchema");
const UserProfile = require("../models/userProfile");

// User profile verification
const isVerifiedUser = asyncHandler(async (request, response, next) => {
    const userId = request.user?._id;
    const role = request.user?.role;
    if(role !== "user") return next();

    // Check if user profile is verified
    const userProfile = await UserProfile.findOne({ userId }).lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Please create user profile first");
    if(!userProfile.isVerified) throw new ApiError(403, "User profile is not verified");
    return next();
});

// Business profile verification
const isVerifiedBusiness = asyncHandler(async (request, response, next) => {
    const userId = request.user?._id;
    const role = request.user?.role;
    if(role !== "business") return next();

    // Check if business profile is verified
    const businessProfile = await BusinessProfile.findOne({ ownerUserId:userId }).lean();
    if(!businessProfile) throw new ApiError(404, "Business profile not found! Please create business profile first");
    if(!businessProfile.isVerified) throw new ApiError(403, "Business profile is not verified");
    return next();
});
module.exports = { isVerifiedUser, isVerifiedBusiness };