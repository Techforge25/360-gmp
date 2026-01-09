const BusinessProfile = require("../models/businessProfileSchema");
const UserProfile = require("../models/userProfile");
const ApiError = require("./ApiError");
const asyncHandler = require("./asyncHandler");

// Get user profile
const getUserProfile = async (parentUserId) => {
    if(!parentUserId) throw new ApiError(400, "Parent user ID is missing");
    try 
    {
        const userProfile = await UserProfile.findOne({ userId:parentUserId }).lean();
        return userProfile;
    } 
    catch(error) 
    {
        throw error;
    }
};

// Get business profile
const getBusinessProfile = async (parentUserId) => {
    if(!parentUserId) throw new ApiError(400, "Parent user ID is missing");
    try 
    {
        const businessProfile = await BusinessProfile.findOne({ ownerUserId:parentUserId }).lean();
        return businessProfile;        
    }
    catch(error) 
    {
        throw error;
    }
};

module.exports = { getUserProfile, getBusinessProfile };