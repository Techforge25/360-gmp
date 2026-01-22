const Job = require("../models/jobsSchema");
const SavedJob = require("../models/savedJobsModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { isValidObjectId } = require("mongoose");

// Save job
const saveJob = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { jobId } = request.params;
    if(!isValidObjectId(jobId)) throw new ApiError(400, "Invalid Mongodb ID");
    
    // Find job
    const [job, savedJob] = await Promise.all([
        Job.findById(jobId).select("_id").lean(),
        SavedJob.findOne({ userId, jobId }).lean()
    ]);
    if(!job) throw new ApiError(404, "Job not found");
    if(savedJob) return response.status(200).json(new ApiResponse(200, savedJob, "This job has already been saved"));

    // Mark job as save
    const save = await SavedJob.create({ userId, jobId });
    

    // Response
    return response.status(201).json(new ApiResponse(201, save, "Job has been saved!"));
});

// Unsaved job
const unsavedJob = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { jobId } = request.params;
    if(!isValidObjectId(jobId)) throw new ApiError(400, "Invalid Mongodb ID");

    // Unsave
    const unsave = await SavedJob.findOneAndDelete({ userId, jobId });
    if(!unsave) throw new ApiError(404, "Saved job not found");

    // Response
    return response.status(200).json(new ApiResponse(200, unsave, "Job has been unsaved"));
});

// Fetch my saved jobs
const fetchMySavedJobs = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find
    const savedJobs = await SavedJob.find({ userId }).populate("jobId");

    // Response
    return response.status(200).json(new ApiResponse(200, savedJobs, "My saved jobs have been fetched"));
});

module.exports = { saveJob, unsavedJob, fetchMySavedJobs };