const { isValidObjectId } = require("mongoose");
const { emptyList } = require("../constants");
const JobApplication = require("../models/jobApplication");
const Job = require("../models/jobsSchema");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createJobApplicationSchema } = require("../validations/jobApplication");
const sendNotification = require("../utils/sendNotification");

// Create job application
const createJobApplicatiion = asyncHandler(async (request, response) => {
    const userId = request.user?._id;
    const { userProfileId } = request.user.profiles || {};
    const { jobId } = request.params;

    // Validate
    if(isValidObjectId(jobId)) throw new ApiError(400, "Invalid Job ID");

    // Get validated payload
    const validatedData = validate(createJobApplicationSchema, request.body);

    // Find user profile
    const job = await Job.findById(jobId)
    .populate({ path: "businessId", select:"ownerUserId" });
    if(!job) throw new ApiError(404, "Job not found!");

    // Check if user has already applied for the job
    const existingApplication = await JobApplication.exists({ jobId, userProfileId });
    if(existingApplication) throw new ApiError(400, "You have already applied for this job");

    // Save job application
    const jobApplication = await JobApplication.create({ jobId, userProfileId, ...validatedData });
    if(!jobApplication) throw new ApiError(500, "Failed to applied for job application");

    // Send notification to business
    await sendNotification({
        userId: job.businessId.ownerUserId,
        title: "New Job Application",
        content: "You have recieved a new job application",
        type: "BusinessProfile",
        io: request.app.get("io")        
    });  

    // Response
    return response.status(200).json(new ApiResponse(200, jobApplication, "Applied for job successfully!"));
});

// Fetch job applications for specific job
const fetchjobApplications = asyncHandler(async (request, response) => {
    const { jobId } = request.params;

    // Get authorize business
    const businessId = request.user.profiles.businessProfileId;

    // Find job
    const job = await Job.findOne({ _id:jobId, businessId }).select("_id").lean();
    if(!job) throw new ApiError(404, "Job not found! Invalid job ID");

    // Find job applications for specific job posted by business
    const { page = 1, limit = 10 } = request.query;
    const jobApplications = await JobApplication.paginate({ jobId }, { page, limit, populate:{ path:"userProfileId", select:"fullName email phone location" } });
    if(!jobApplications.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No job applications found at the moment"));
    return response.status(200).json(new ApiResponse(200, jobApplications, "Job applications have been fetched"));
});

// view Job application
const viewJobapplication = asyncHandler(async (request, response) => {
    const { jobApplicationId } = request.params;

    // Find job application
    const jobApplication = await JobApplication.findById(jobApplicationId);
    if(!jobApplication) throw new ApiError(404, "Job application not found! Invalid job application ID");

    // Update status to viewed if it's pending
    if(jobApplication.status === "pending") 
    {
        jobApplication.status = "viewed";
        await jobApplication.save();
    }

    // Response
    return response.status(200).json(new ApiResponse(200, jobApplication, "Job application has been fetched"));
});

// Update job application status
const updateJobApplicationStatus = asyncHandler(async (request, response) => {
    const { status } = request.body || {};
    const { jobApplicationId } = request.params;
    if(!["pending", "accepted", "rejected"].includes(status)) throw new ApiError(400, "Invalid status value");

    // Find job and update status
    const jobApplication = await JobApplication.findByIdAndUpdate(jobApplicationId, { status }, { new:true }).select("status");
    if(!jobApplication) throw new ApiError(404, "Job application not found! Invalid job application ID");

    // Response
    return response.status(200).json(new ApiResponse(200, jobApplication, "Job application status has been updated successfully"));
});

module.exports = { createJobApplicatiion, fetchjobApplications, viewJobapplication, updateJobApplicationStatus };