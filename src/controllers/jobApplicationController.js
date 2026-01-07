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

    // Save job application
    const jobApplication = await JobApplication.create({ jobId, userProfileId:userProfile._id, ...validatedData });
    if(!jobApplication) throw new ApiError(500, "Failed to applied for job application");
    return response.status(200).json(new ApiResponse(200, jobApplication, "Applied for job successfully!"));
});

// Fetch all job applications
const fetchAlljobApplications = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;
    const jobApplications = await JobApplication.paginate({}, { page, limit });
    if(!jobApplications.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Job application not found"));
    return response.status(200).json(new ApiResponse(200, jobApplications, "Job applications have been fetched"));
});

// view Job application
const viewJobapplication = asyncHandler(async (request, response) => {
    const { id } = request.params;
    const jobApplication = await JobApplication.findById(id).lean();
    if(!jobApplication) throw new ApiError(404, "Job application not found! Invalid job application ID");
    return response.status(200).json(new ApiResponse(200, jobApplication, "Job application has been fetched"));
});

module.exports = { createJobApplicatiion, fetchAlljobApplications, viewJobapplication };