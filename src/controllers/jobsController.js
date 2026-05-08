const Job = require("../models/jobsSchema");
const BusinessProfile = require("../models/businessProfileSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createJobSchema, updateJobSchema } = require("../validations/jobValidator");
const UserProfile = require("../models/userProfile");
const JobApplication = require("../models/jobApplication");
const { emptyList } = require("../constants");
const { isValidObjectId } = require("mongoose");
const sendNotification = require("../utils/sendNotification");
const validate = require("../utils/validate");

// Create Job
const createJob = asyncHandler(async (request, response) => {
    const userId = request.user._id;

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

    // Send notification to business
    await sendNotification({
        userId,
        title: "Job Creation",
        content: "You have created a new job",
        type: "BusinessProfile",
        io: request.app.get("io")
    });

    // Response
    return response.status(201).json(new ApiResponse(201, job, "Job has been created successfully"));
});

// Get All Jobs with Pagination
const getAllJobs = asyncHandler(async (request, response) => {
    const { businessId, status, jobCategory, employmentType,
    page = 1, limit = 20, search, payRange, country, datePosted, sortedType = "newest" } = request.query;

    // Filter and searches
    const filter = {};
    if(search) filter.jobTitle = { $regex:search, $options:"i" };
    if(businessId) filter.businessId = businessId;
    if(status) filter.status = { $regex:status, $options:"i" };
    if(jobCategory) filter.jobCategory = { $regex:jobCategory, $options:"i" };
    if(employmentType) filter.employmentType = { $regex:employmentType, $options:"i" };
    if(country) filter["location.country"] = { $regex:country, $options:"i" };

    // Pay range (single value)
    if(payRange) 
    {
        const amount = Number(payRange);
        // filter.salaryMin = { $lte:amount };
        // filter.salaryMax = { $gte:amount };

        filter.salaryMin = { $gte: amount };
        filter.salaryMax = { $lte: amount };        
    }

    // Date Posted Filters unseen
    if(datePosted === "unseen") filter.viewedBy = { $ne: request.user._id };

    // Last 24 hours
    if(datePosted === "24h") filter.createdAt = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    
    // Last 7 days
    if(datePosted === "7d") filter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    
    // Last 14 days
    if(datePosted === "14d") filter.createdAt = { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) };

    // Sorting configuration
    const sortConfig = { createdAt:-1 }
    if(sortedType !== "newest") sortConfig.createdAt = 1;    

    // Find jobs
    const jobs = await Job.paginate(filter, {
        page: Number(page),
        limit: Number(limit),
        sort: sortConfig,
        populate: {
            path: "businessId",
            select: "companyName businessType primaryIndustry logo"
        }
    });

    // Response
    return response.status(200).json(new ApiResponse(200, jobs, "Jobs fetched successfully"));
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
    const { userProfileId } = request.user.profiles || {};

    const { id } = request.params;
    if(!id) throw new ApiError(400, "Job ID is missing");
    if(!isValidObjectId(id)) throw new ApiError(400, "Invalid MongoDB ID");

    // Find job
    const job = await Job.findById(id)
    .populate({ path:"businessId", select:"companyName businessType primaryIndustry location website logo" })
    .select("-__v -updatedAt").lean();
    if(!job) throw new ApiError(404, "Job not found");

    // Find user profile
    const userId = request.user?._id || null;
    if(!userId) throw new ApiError(400, "User ID is missing");

    const [userProfile, businessProfile] = await Promise.all([
        UserProfile.findOne({ userId }).select("_id").lean(),
        BusinessProfile.findOne({ ownerUserId: userId })
    ]);

    let isApplied = false;
    if(userProfile)
    {
        const application = await JobApplication.findOne({ jobId:id, userProfileId:userProfile._id }).select("_id").lean();
        isApplied = Boolean(application);
    }

    // Only user's views can be counted
    if(userProfile)
    {
        const searchFilter = { _id:id, viewedBy:{ $ne:userId } }
        if(businessProfile) searchFilter.businessId = { $ne:businessProfile?._id };

        await Job.findOneAndUpdate(searchFilter,
            {
                $addToSet: { viewedBy:userId },
                $inc:{ viewsCount:1 }
            },
            { new:true }
        );
    }

    // Response
    return response.status(200).json(new ApiResponse(200, { ...job, isApplied }, "Job fetched successfully"));
});

// Update Job
const updateJob = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { businessProfileId } = request.user.profiles || {};
    const { id } = request.params;

    // Validate ID
    if(!isValidObjectId(id)) throw new ApiError(400, "Invalid Job ID");
  
    // Get validated Payload
    const { 
        jobTitle, jobCategory, employmentType, experienceLevel, description,
        salaryMin, salaryMax, location 
    } = validate(updateJobSchema, request.body);

    // Find job
    const job = await Job.findById(id).lean();
    if(!job) throw new ApiError(404, "Job not found");

    // Check authorization
    if(String(businessProfileId) !== String(job.businessId)) throw new ApiError(403, "You are not authorized to update this job");

    // Update
    const updateJob = await Job.findByIdAndUpdate(
        id,
        { $set: { jobTitle, jobCategory, employmentType, experienceLevel, description, salaryMin, salaryMax, location } },
        { new: true, runValidators: true }
    );
    if(!updateJob) throw new ApiError(404, "Job not found");

    await updateJob.populate("businessId", "companyName businessType primaryIndustry");

    // Send notification to business
    await sendNotification({
        userId,
        title: "Job Modified",
        content: "You have updated a job",
        type: "BusinessProfile",
        io: request.app.get("io")        
    });

    // Response
    return response.status(200).json(new ApiResponse(200, updateJob, "Job has been updated successfully"));
});

// Delete job
const deleteJob = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { businessProfileId } = request.user.profiles || {};
    const { id } = request.params;

    // Delete
    const job = await Job.findById(id);
    if(!job) throw new ApiError(404, "Job not found");

    // Check authorization
    if(String(businessProfileId) !== String(job.businessId)) throw new ApiError(403, "You are not authorized to delete this job");

    // Delete
    await job.deleteOne();

    // Send notification to business
    await sendNotification({
        userId,
        title: "Job Deleted",
        content: "You have deleted a job",
        type: "BusinessProfile",
        io: request.app.get("io")        
    });    

    return response.status(200).json(new ApiResponse(200, null, "Job has been deleted successfully"));
});

// Fetch all jobs that user applied to
const fetchMyAppliedJobs = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id");
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Pagination
    const { page = 1, limit = 10 } = request.query;

    // Find applications + populate job details
    const applications = await JobApplication.paginate({ userProfileId:userProfile._id },
        {
            page: Number(page),
            limit: Number(limit),
            sort: { createdAt: -1 },
            populate: {
                path: "jobId",
                select: "jobTitle jobCategory employmentType experienceLevel salaryMin salaryMax location status businessId",
                populate: {
                    path: "businessId",
                    select: "companyName logo location"
                }
            }
        }
    );

    // Not applied yet
    if(!applications.docs.length) return response.status(200).json(new ApiResponse(200, emptyList, "You have not applied to any jobs yet"));

    // Response
    return response.status(200).json(new ApiResponse(200, applications, "Applied jobs fetched successfully"));
});

// Fetch Hired jobs
const fetchHiredJobs = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id");
    if (!userProfile) throw new ApiError(404, "User profile not found");

    // Pagination
    const { page = 1, limit = 10 } = request.query;

    // Find hired applications only
    const hiredJobs = await JobApplication.paginate({ userProfileId:userProfile._id, status:"hired"},
        {
            page: Number(page),
            limit: Number(limit),
            sort: { updatedAt:-1 },
            populate: {
                path: "jobId",
                select: "jobTitle jobCategory employmentType experienceLevel salaryMin salaryMax location businessId",
                populate: {
                    path: "businessId",
                    select: "companyName logo location"
                }
            }
        }
    );

    // If no hired jobs
    if(!hiredJobs.docs.length) return response.status(200).json(new ApiResponse(200, emptyList, "You have not been hired for any jobs yet"));

    // Response
    return response.status(200).json(new ApiResponse(200, hiredJobs, "Hired jobs fetched successfully"));
});

module.exports = { createJob, getAllJobs, getJobById, updateJob, deleteJob, 
fetchLatestJobs, fetchMyAppliedJobs, fetchHiredJobs };
