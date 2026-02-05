const { emptyList } = require("../constants");
const JobApplication = require("../models/jobApplication");
const Job = require("../models/jobsSchema");
const Order = require("../models/orders");
const SavedJob = require("../models/savedJobsModel");
const UserProfile = require("../models/userProfile");
const User = require("../models/users");
const UserSocialLink = require("../models/userSocialLinkModel");
const Wallet = require("../models/walletModel");
const WorkExperience = require("../models/workExperienceModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { updateUserContactInfoValidationSchema, updateEducationValidationSchema, addWorkExperienceValidationSchema, updateJobPreferencesValidationSchema, userSocialLinkValidationSchema } = require("../validations/userProfile");
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

    // Update contact info
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

    // Get payload
    const { logo } = request.body || {};
    if(!logo) throw new ApiError(400, "User profile image is required");

    // Update logo
    const userProfile = await UserProfile.findOneAndUpdate({ userId }, { logo }, { new:true });
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, { logo:userProfile.logo }, "User logo has been updated!"));
});

// Update user profile (Resume)
const updateUserProfileResume = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get payload
    const { resumeUrl } = request.body || {};
    if(!resumeUrl) throw new ApiError(400, "Resume is required");

    // Update resume
    const userProfile = await UserProfile.findOneAndUpdate({ userId }, { resumeUrl }, { new:true });
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, { resumeUrl:userProfile.resumeUrl }, "Resume has been updated!"));
});

// Update user profile (Education)
const updateUserProfileEducation = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { institution, degree, fieldOfStudy, startDate, endDate,
    isCurrent, description, grade } = validate(updateEducationValidationSchema, request.body);

    // Update education object
    const userProfile = await UserProfile.findOneAndUpdate(
        { userId },
        {
            $set: {
                "education.institution": institution,
                "education.degree": degree,
                "education.fieldOfStudy": fieldOfStudy,
                "education.startDate": startDate,
                "education.endDate": endDate,
                "education.isCurrent": isCurrent,
                "education.description": description,
                "education.grade": grade
            }
        },
        { new:true }
    );
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, userProfile.education, "Education has been updated!"));
});

// Update user profile (Job preferences)
const updateUserProfileJobPreferences = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { targetJob, employmentType } = validate(updateJobPreferencesValidationSchema, request.body);

    // Update
    const updateUserProfile = await UserProfile.findOneAndUpdate(
        { userId },
        { targetJob, employmentType },
        { new:true }
    );

    // Prepare payload
    const payload = { 
        targetJob:updateUserProfile.targetJob, 
        employmentType:updateUserProfile.employmentType 
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Job preferences has been updated"));
});

// Delete user profile
const deleteUserProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Delete
    const userProfile = await UserProfile.findOneAndDelete({ userId });
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, userProfile._id, "User profile has been deleted!"));
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

// Create work experience
const createWorkExperience = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { jobTitle, employmentType, companyName, startDate, endDate, 
    location, description, isCurrentlyWorking } = validate(addWorkExperienceValidationSchema, request.body);

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Save work experience to db
    const workExperience = await WorkExperience.create({ userProfileId:userProfile._id, jobTitle, employmentType, companyName, 
    startDate, endDate, location, description, isCurrentlyWorking });
    if(!workExperience) throw new ApiError(500, "Failed to add work experience");

    // Response
    return response.status(201).json(new ApiResponse(201, workExperience._id, "Work experience has been added!"));
});

// Fetch work experiences
const fetchWorkExperiences = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Find work experience
    const workExperiences = await WorkExperience.find({ userProfileId:userProfile._id });
    if(!workExperiences.length) return response.status(200).json(new ApiResponse(200, [], "No work experience found"));

    // Response
    return response.status(200).json(new ApiResponse(200, workExperiences, "Work experiences have been fetched!"));
});

// Update work experience
const updateWorkExperience = asyncHandler(async (request, response) => {
    const { workExperienceId } = request.params;
    const userId = request.user._id;

    // Get validated payload
    const { jobTitle, employmentType, companyName, startDate, endDate, 
    location, description, isCurrentlyWorking } = validate(addWorkExperienceValidationSchema, request.body);

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Update work experience
    const workExperience = await WorkExperience.findOneAndUpdate(
        { _id:workExperienceId, userProfileId:userProfile._id },
        { 
            jobTitle, employmentType, companyName, startDate, 
            endDate, location, description, isCurrentlyWorking },
        { new:true }
    );
    if(!workExperience) throw new ApiError(404, "Work experience not found");

    // Response
    return response.status(200).json(new ApiResponse(200, workExperience, "Work experience has been updated!"));
});

// Delete work experience
const deleteWorkExperience = asyncHandler(async (request, response) => {
    const { workExperienceId } = request.params;
    const userId = request.user._id;

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Update work experience
    const workExperience = await WorkExperience.findOneAndDelete({ _id:workExperienceId, userProfileId:userProfile });
    if(!workExperience) throw new ApiError(404, "Work experience not found");

    // Response
    return response.status(200).json(new ApiResponse(200, workExperience._id, "Work experience has been deleted!"));
});

// Fetch jobs that matches with my job preferences
const fetchJobMatches = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Get already applied job IDs
    const appliedJobs = await JobApplication.find({ userProfileId: userProfile._id }).select("jobId").lean();
    const appliedJobIds = appliedJobs.map(app => app.jobId);

    // Build match query
    const matchQuery = { 
        status:"open",
        _id: { $nin:appliedJobIds } // Exclude applied jobs
    };

    // Match job title (if user set targetJob)
    if(userProfile.targetJob) matchQuery.jobTitle = { $regex:userProfile.targetJob, $options:"i" };
    
    // Match employment type
    if(userProfile.employmentType && userProfile.employmentType.length > 0) matchQuery.employmentType = { $in:userProfile.employmentType };

    // Salary overlap logic
    if(userProfile.minSalary || userProfile.maxSalary) 
    {
        matchQuery.$and = [];
        if(userProfile.minSalary) matchQuery.$and.push({ salaryMax:{ $gte:userProfile.minSalary } });
        if(userProfile.maxSalary) matchQuery.$and.push({ salaryMin:{ $lte:userProfile.maxSalary } });
    }

    // Fetch jobs with pagination
    const options = {
        page: parseInt(request.query.page) || 1,
        limit: parseInt(request.query.limit) || 10,
        sort: { createdAt:-1 }
    };

    // Find matches jobs
    const jobs = await Job.paginate(matchQuery, options);
    if(!jobs.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No job matches found"));

    // Response
    return response.status(200).json(new ApiResponse(200, jobs, "Matched jobs fetched successfully"));
});

// Add social link
const createUserSocialLink = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find user
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Get validated payload
    const { platformName, url } = validate(userSocialLinkValidationSchema, request.body) || {};

    const social = await UserSocialLink.create({ userProfileId:userProfile._id, platformName, url });
    if(!social) throw new ApiError(500, "Failed to create social link");

    // Response
    return response.status(201).json(new ApiResponse(201, { platformName, url }, "Social link has been created"));
});

module.exports = { createUserProfile, viewUserProfile, updateUserProfileBasicInfo, 
updateUserProfileContactInfo, updateUserProfileLogo, updateUserProfileResume,
updateUserProfileEducation, updateUserProfileJobPreferences, deleteUserProfile, 
fetchUserAnalytics, createWorkExperience, fetchWorkExperiences, updateWorkExperience, 
deleteWorkExperience, fetchJobMatches, createUserSocialLink };