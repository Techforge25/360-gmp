const { emptyList } = require("../constants");
const JobApplication = require("../models/jobApplication");
const Job = require("../models/jobsSchema");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createJobApplicationSchema } = require("../validations/jobApplication");

// Create job application
const createJobApplicatiion = asyncHandler(async (request, response) => {
    const _id = request.user?._id;
    const { jobId } = request.params;
    const validatedData = validate(createJobApplicationSchema, request.body);

    // Find user profile
    const [job, userProfile] = await Promise.all([
        Job.findById(jobId).select("_id").lean(),
        UserProfile.findOne({ userId:_id }).select("_id").lean()
    ])
    if(!job) throw new ApiError(404, "Job not found! Invalid job ID");
    if(!userProfile) throw new ApiError(404, "User profile not found!");

    // Check if user has already applied for the job
    const existingApplication = await JobApplication.findOne({ jobId, userProfileId:userProfile._id }).lean();
    if(existingApplication) throw new ApiError(400, "You have already applied for this job");

    // Save job application
    const jobApplication = await JobApplication.create({ jobId, userProfileId:userProfile._id, ...validatedData });
    if(!jobApplication) throw new ApiError(500, "Failed to applied for job application");
    return response.status(200).json(new ApiResponse(200, jobApplication, "Applied for job successfully!"));
});

// Fetch job applications for specific job
const fetchjobApplications = asyncHandler(async (request, response) => {
    const { jobId } = request.params;

    // Find job
    const job = await Job.findById(jobId).select("_id").lean();
    if(!job) throw new ApiError(404, "Job not found! Invalid job ID");

    // Find job applications for specific job posted by business
    const { page = 1, limit = 10 } = request.query;
    const jobApplications = await JobApplication.paginate({ jobId }, { page, limit });
    if(!jobApplications.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No job applications found at the moment"));
    return response.status(200).json(new ApiResponse(200, jobApplications, "Job applications have been fetched"));
});

// view Job application
const viewJobapplication = asyncHandler(async (request, response) => {
    const { jobApplicationId } = request.params;
    const jobApplication = await JobApplication.findById(jobApplicationId).lean();
    if(!jobApplication) throw new ApiError(404, "Job application not found! Invalid job application ID");
    return response.status(200).json(new ApiResponse(200, jobApplication, "Job application has been fetched"));
});

module.exports = { createJobApplicatiion, fetchjobApplications, viewJobapplication };