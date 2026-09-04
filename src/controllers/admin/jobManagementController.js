const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { emptyList } = require("../../constants");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../../utils/convertToMongoId");
const validate = require("../../utils/validate");
const sendNotification = require("../../utils/sendNotification");
const Job = require("../../models/jobsSchema");
const Report = require("../../models/reportModel");
const getDateFilter = require("../../utils/dateFilter");

// Allowed date filters
const allowedDateFilters = ["all", "1d", "3d", "7d"];

// Initiator
const jobManagementInitiator = asyncHandler(async (request, response) => {
    // Response
    return response.status(200).json(new ApiResponse(200, { hasAccess: true }, "Initiate Job Management Module"));
});

// Fetch stats
const fetchJobStats = asyncHandler(async (request, response) => {
    // Get date filter
    const { dateFilter } = getDateFilter(request);

    // Fetch
    const [totalActiveJobs, totalReportedJobs] = await Promise.all([
        Job.countDocuments({ status: "open", ...dateFilter }),
        Report.countDocuments({ reportedModel: "Job", ...dateFilter })
    ]);

    // Payload
    const payload = { totalActiveJobs, totalReportedJobs };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Job stats have been fetched"));
});

// Fetch active jobs
const fetchActiveJobs = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(request);

    // Filter out non-reported jobs
    const reportedJobs = await Report.find({ reportedModel: "Job" }).select("-_id reportedContentId");
    const reportedJobIds = reportedJobs.map(reportedJob => reportedJob?.reportedContentId);

    // Fetch
    const jobs = await Job.aggregatePaginate([
        // Match
        { $match: { status: "open", _id: { $nin: reportedJobIds }, ...dateFilter } },

        // Lookup business
        {
            $lookup: {
                from: "businessprofiles",
                localField: "businessId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline:[{ $project: { _id:0, companyName: 1, logo: 1 } }]
            }
        },

        // Lookup job applications
        {
            $lookup: {
                from: "jobapplications",
                localField: "_id",
                foreignField: "jobId",
                as: "jobApplications"
            }
        },        

        // Unwind
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: true } },

        // Count total job applicants
        {
            $addFields: {
                totalJobApplicants: { $size: "$jobApplications" }
            }
        },

        // Sort
        { $sort: { createdAt: -1 } },

        // Project
        {
            $project: {
                jobTitle: 1,
                location: 1,
                businessProfile: 1,
                totalJobApplicants: 1,
                createdAt: 1
            }
        },
    ], { page, limit });
    if(!jobs.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No active jobs found"));

    // Response
    return response.status(200).json(new ApiResponse(200, jobs, "Active jobs have been fetched"));
});

// View active job
const viewActiveJob = asyncHandler(async (request, response) => {
    const { jobId } = request.params;
    if(!isValidObjectId(jobId)) throw new ApiError(400, "Invalid Job ID");

    // Fetch
    const [job] = await Job.aggregate([
        // Match
        { $match: { _id: convertToMongoId(jobId) } },

        // Lookup business
        {
            $lookup: {
                from: "businessprofiles",
                localField: "businessId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline:[{ $project: { _id:0, companyName: 1, logo: 1, businessType: 1, email: "$primaryContactPerson.supportEmail" } }]
            }
        },

        // Lookup job applications
        {
            $lookup: {
                from: "jobapplications",
                localField: "_id",
                foreignField: "jobId",
                as: "jobApplications"
            }
        },        

        // Unwind
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: true } },

        // Count total job applicants
        {
            $addFields: {
                totalJobApplicants: { $size: "$jobApplications" }
            }
        },

        // Sort
        { $sort: { createdAt: -1 } },

        // Project
        {
            $project: {
                jobTitle: 1,
                location: 1,
                employmentType: 1,
                description: 1,
                businessProfile: 1,
                totalJobApplicants: 1,
                salaryMin: 1,
                salaryMax: 1,
                createdAt: 1
            }
        }
    ]);
    if(!job) throw new ApiError(404, "Job not found");

    // Response
    return response.status(200).json(new ApiResponse(200, job, "Job has been fetched"));
});

module.exports = { jobManagementInitiator, fetchJobStats, fetchActiveJobs, viewActiveJob };