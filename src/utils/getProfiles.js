const BusinessProfile = require("../models/businessProfileSchema");
const UserProfile = require("../models/userProfile");
const asyncHandler = require("./asyncHandler");

// Get user profile
const getUserProfile = asyncHandler(async (parentUserId) => {
    const userProfile = await UserProfile.findOne({ userId:parentUserId }).lean();
    return userProfile;
});

// Get business profile
const getBusinessProfile = asyncHandler(async (parentUserId) => {
    const businessProfile = await BusinessProfile.findOne({ ownerUserId:parentUserId }).lean();
    return businessProfile;
});

module.exports = { getUserProfile, getBusinessProfile };