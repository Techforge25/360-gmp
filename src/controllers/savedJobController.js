const Job = require("../models/jobsSchema");
const SavedJob = require("../models/savedJobsModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { isValidObjectId } = require("mongoose");

// Save job / unsave job
const saveJob = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { jobId } = request.params;
    if(!isValidObjectId(jobId)) throw new ApiError(400, "Invalid Mongodb ID");
    
    // Find job
    const [job, savedJob] = await Promise.all([
        Job.findById(jobId).select("_id").lean(),
        SavedJob.findOne({ userId, jobId })
    ]);

    // Validate
    if(!job) throw new ApiError(404, "Job not found");

    // Unsave job
    if(savedJob)
    {
        await savedJob.deleteOne();
        return response.status(200).json(new ApiResponse(200, null, "Job has been removed from saved list"));
    }

    // Mark job as save
    const save = await SavedJob.create({ userId, jobId });

    // Response
    return response.status(201).json(new ApiResponse(201, null, "Job has been saved!"));
});

// Fetch my saved jobs
const fetchMySavedJobs = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find
    const savedJobs = await SavedJob.find({ userId })
    .populate({ path: "jobId", select: "-__v -updatedAt -viewedBy -viewsCount -businessId" });

    // Response
    return response.status(200).json(new ApiResponse(200, savedJobs, "My saved jobs have been fetched"));
});

module.exports = { saveJob, fetchMySavedJobs };