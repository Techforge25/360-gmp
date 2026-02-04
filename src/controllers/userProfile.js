const JobApplication = require("../models/jobApplication");
const Order = require("../models/orders");
const SavedJob = require("../models/savedJobsModel");
const UserProfile = require("../models/userProfile");
const User = require("../models/users");
const Wallet = require("../models/walletModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const updateUserContactInfoValidationSchema = require("../validations/updateUserContactInfoValidator");
const { createUserProfileSchema } = require("../validations/userProfile");

const createUserProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Validate
    const { error, value } = createUserProfileSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Profile payload
    const profileData = { ...value, userId };

    // Check if user has already created UserProfile
    const existingProfile = await UserProfile.findOne({ userId }).lean();
    if(existingProfile) throw new ApiError(400, "You have already created a user profile");

    // Create profile
    const profile = await UserProfile.create(profileData);
    if(!profile) throw new ApiError(500, "Failed to create user profile");

   // Executes queries parallel
    const [wallet, user] = await Promise.all([
        Wallet.create({ ownerId:profile._id, ownerModel:"UserProfile" }),
        User.findByIdAndUpdate(userId, { role:"user", isNewToPlatform:false }, { new:true, lean:true })
    ]);

    // Validate
    if(!wallet) throw new ApiError(500, "Failed to setup wallet account for user");
    if(!user) throw new ApiError(500, "Failed to update user status upon user profile creation");

    // Response
    return response.status(201).json(new ApiResponse(201, { profile, isNewToPlatform:user.isNewToPlatform }, "User profile has been created"));
}); 

// View user profile
const viewUserProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    
    // Get user profile
    const userProfile = await UserProfile.findOne({ userId }).lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, userProfile, "User profile has been viewed"));
});

// Update user profile (basic info)
const updateUserProfileBasicInfo = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get payload
    const { fullName, bio } = request.body || {};
    if(!fullName) throw new ApiError(400, "Full name is required");

    // Update user profile
    const userProfile = await UserProfile.findOneAndUpdate({ userId }, { fullName, bio }, { new:true });
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Prepare payload
    const payload = { fullName:userProfile.fullName, bio:userProfile.bio };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "User profile has been updated!"));
});

// Update user profile (contact info)
const updateUserProfileContactInfo = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { email, phone, location } = validate(updateUserContactInfoValidationSchema, request.body);

    // Update user profile
    const userProfile = await UserProfile.findOneAndUpdate({ userId }, { email, phone, location }, { new:true });
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Prepare payload
    const payload = { 
        email: userProfile.email, 
        phone: userProfile.phone, 
        location: userProfile.location, 
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "User contact info has been updated!"));
});

// Update user profile (Profile logo)
const updateUserProfileLogo = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { logo } = request.body || {};
    if(!logo) throw new ApiError(400, "User profile image is required");

    // Update user profile
    const userProfile = await UserProfile.findOneAndUpdate({ userId }, { logo }, { new:true });
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, { logo:userProfile.logo }, "User logo has been updated!"));
});

// Delete user profile
const deleteUserProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Delete
    const userProfile = await UserProfile.findOneAndDelete({ userId });
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, userProfile._id, "User profile has been deleted successfully"));
});

// Fetch user profile analytics
const fetchUserAnalytics = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Extract user profile ID
    const userProfileId = userProfile._id;

    // Date range
    const { range = "7d" } = request.query;

    // Decide date
    const now = new Date();
    let startDate = new Date();

    // Range filter
    if(range === "7d") 
    {
        startDate.setDate(now.getDate() - 7);
    } 
    else if(range === "1m") 
    {
        startDate.setMonth(now.getMonth() - 1);
    }
    else if(range === "3m") 
    {
        startDate.setMonth(now.getMonth() - 3);
    }      
    else 
    {
        throw new ApiError(400, "Invalid range. Use 7d, 1m or 1m");
    }    

    // Run all counts in parallel
    const [totalProductsPurchased, totalAppliedJobs, totalSavedJobs, totalInterviewInvites] = await Promise.all([
        // Total products purchased (orders count)
        Order.countDocuments({ 
            buyerUserProfileId:userProfileId, 
            status:{ $in:["paid", "completed"] },
            createdAt:{ $gte:startDate, $lte:now }
        }),

        // Total jobs applied
        JobApplication.countDocuments({ 
            userProfileId,
            createdAt:{ $gte:startDate, $lte:now }
        }),

        // Total saved jobs
        SavedJob.countDocuments({ 
            userId:userProfileId,
            createdAt:{ $gte:startDate, $lte:now }
        }),

        // Interview invites
        JobApplication.countDocuments({ 
            userProfileId, 
            status:"interview",
            createdAt:{ $gte:startDate, $lte:now } 
        })
    ]);

    // Prepare payload
    const payload = { totalProductsPurchased, totalAppliedJobs, totalSavedJobs, totalInterviewInvites };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "User analytics fetched successfully"));
});

module.exports = { createUserProfile, viewUserProfile, updateUserProfileBasicInfo, 
updateUserProfileContactInfo, updateUserProfileLogo, deleteUserProfile, fetchUserAnalytics };