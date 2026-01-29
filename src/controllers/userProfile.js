const JobApplication = require("../models/jobApplication");
const Order = require("../models/orders");
const SavedJob = require("../models/savedJobsModel");
const UserProfile = require("../models/userProfile");
const User = require("../models/users");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
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

    // Update user status
    const user = await User.findByIdAndUpdate(profile.userId, { role:"user", isNewToPlatform:false }, { new:true, lean:true });
    if(!user) throw new ApiError(500, "Failed to update user status upon user profile creation");
    return response.status(201).json(new ApiResponse(201, { profile, isNewToPlatform:user.isNewToPlatform }, "User profile has been created"));
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

module.exports = { createUserProfile, fetchUserAnalytics };