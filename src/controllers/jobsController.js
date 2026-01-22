const Job = require("../models/jobsSchema");
const BusinessProfile = require("../models/businessProfileSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createJobSchema, updateJobSchema } = require("../validations/jobValidator");
const UserProfile = require("../models/userProfile");

// Create Job
const createJob = asyncHandler(async (request, response) => {
    // Validate
    const { error, value } = createJobSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Check if businessId exists
    const businessProfile = await BusinessProfile.findById(value.businessId);
    if(!businessProfile) {
        throw new ApiError(404, "Business profile not found. Invalid business ID");
    }

    // Create job
    const job = await Job.create(value);
    if(!job) throw new ApiError(500, "Failed to create job");

    // Populate businessId
    await job.populate("businessId", "companyName businessType primaryIndustry");

    return response.status(201).json(new ApiResponse(201, job, "Job has been created successfully"));
});

// Get All Jobs with Pagination
const getAllJobs = asyncHandler(async (request, response) => {
    const { businessId, status, jobCategory, employmentType, page = 1, limit = 20, search } = request.query;

    // Filter and searches
    const filter = {};
    if(search) filter.jobTitle = { $regex:search, $options: "i" };
    if(businessId) filter.businessId = businessId;
    if(status) filter.status = { $regex: status, $options: "i" };
    if(jobCategory) filter.jobCategory = { $regex: jobCategory, $options: "i" };
    if(employmentType) filter.employmentType = { $regex: employmentType, $options: "i" };

    // Convert page and limit to numbers
    const pageNumber = Number.parseInt(page, 20);
    const limitNumber = Number.parseInt(limit, 20);
    const skip = (pageNumber - 1) * limitNumber;

    // Get total count for pagination metadata
    const totalJobs = await Job.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / limitNumber);

    // Get jobs with pagination
    const jobs = await Job.find(filter)
        .populate("businessId", "companyName businessType primaryIndustry location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    const paginationInfo = {
        currentPage: pageNumber,
        totalPages: totalPages,
        totalJobs: totalJobs,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
    };

    return response.status(200).json(
        new ApiResponse(200, { jobs, pagination: paginationInfo }, "Jobs fetched successfully")
    );
});

// Fetch latest jobs for market place
const fetchLatestJobs = asyncHandler(async (request, response) => {
    // Get jobs
    const jobs = await Job.find({}).limit(10).lean();

    // Response
    return response.status(200).json(new ApiResponse(200, jobs, "Jobs has been fetched successfully"));
});

// Get Job By ID
const getJobById = asyncHandler(async (request, response) => { 
    const { id } = request.params;

    // Find job
    const job = await Job.findById(id)
    .populate("businessId", "companyName businessType primaryIndustry location website logo");
    if(!job) throw new ApiError(404, "Job not found");

    // Find user profile
    const userId = request.user._id;
    const [userProfile, businessProfile] = await Promise.all([
        UserProfile.findOne({ userId }).select("_id").lean(),
        BusinessProfile.findOne({ ownerUserId: userId })
    ]);

    // Only user's views can be counted
    if(userProfile)
    {
        await Job.findOneAndUpdate(
            { _id:id, viewedBy:{ $ne:userId }, businessId:{ $ne:businessProfile._id } },
            {
                $addToSet: { viewedBy:userId },
                $inc:{ viewsCount:1 }
            },
            { new:true }
        );
    }

    // Response
    return response.status(200).json(new ApiResponse(200, job, "Job fetched successfully"));
});

// Update Job
const updateJob = asyncHandler(async (request, response) => {
    const { id } = request.params;
  
    const { error, value } = updateJobSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    if(value.businessId) {
        const businessProfile = await BusinessProfile.findById(value.businessId);
        if(!businessProfile) {
            throw new ApiError(404, "Business profile not found. Invalid business ID");
        }
    }

    // Update
    const job = await Job.findByIdAndUpdate(
        id,
        { $set: value },
        { new: true, runValidators: true }
    );

    if(!job) throw new ApiError(404, "Job not found");

      
    await job.populate("businessId", "companyName businessType primaryIndustry");

    return response.status(200).json(new ApiResponse(200, job, "Job has been updated successfully"));
});

// Delete job
const deleteJob = asyncHandler(async (request, response) => {
    const { id } = request.params;

    const job = await Job.findByIdAndDelete(id);

    if(!job) throw new ApiError(404, "Job not found");

    return response.status(200).json(new ApiResponse(200, null, "Job has been deleted successfully"));
});

module.exports = { createJob, getAllJobs, getJobById, updateJob, deleteJob, fetchLatestJobs };
