const BusinessProfile = require("../models/businessProfileSchema");
const UserProfile = require("../models/userProfile");
const ApiError = require("./ApiError");

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

// Allowed profile models
const allowedProfileModels = ["UserProfile", "BusinessProfile"];

// Get profile ID
const getProfileId = async (ownerId, profileModel) => {
    try 
    {
        // Validate
        if(!ownerId) throw new ApiError(400, "Owner ID is missing");
        if(!profileModel) throw new ApiError(400, "Profile model is missing");
        if(!allowedProfileModels.includes(profileModel)) throw new ApiError(400, "Invalid profile model");

        // User profile
        if(profileModel === "UserProfile")
        {
            const userProfile = await UserProfile.findOne({ userId:ownerId }).lean();
            if(!userProfile) throw new ApiError(404, "User profile not found while getting profile ID");
            return { profileId:userProfile._id, profileModel };
        }
        // Business profile
        if(profileModel === "BusinessProfile")
        {
            const businessProfile = await BusinessProfile.findOne({ ownerUserId:ownerId }).lean();
            if(!businessProfile) throw new ApiError(404, "Business profile not found while getting profile ID");
            return { profileId:businessProfile._id, profileModel };
        }  
        
        // Fallback
        return { profileId:null, profileModel:null };
    } 
    catch (error) 
    {
        return { profileId:null, profileModel:null };
    }
};

module.exports = { getUserProfile, getBusinessProfile, getProfileId };