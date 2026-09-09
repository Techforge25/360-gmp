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
const JobApplication = require("../../models/jobApplication");

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
    const [totalActiveJobs, reportedJobIds] = await Promise.all([
        Job.countDocuments({ status: "open", ...dateFilter }),
        Report.distinct("reportedContentId", { reportedModel: "Job", ...dateFilter })
    ]);

    // Payload
    const payload = { totalActiveJobs, totalReportedJobs: reportedJobIds.length };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Job stats have been fetched"));
});

// Fetch sector distribution graph
const fetchSectorDistributionGraph = asyncHandler(async (request, response) => {
    const [result] = await Job.aggregate([
        // Group jobs by category
        {
            $group: {
                _id: "$jobCategory",
                count: { $sum: 1 }
            }
        },

        // Get total jobs and category data
        {
            $group: {
                _id: null,
                totalJobs: { $sum: "$count" },
                categories: {
                    $push: {
                        category: "$_id",
                        count: "$count"
                    }
                }
            }
        },

        // Calculate percentage for each category
        {
            $project: {
                _id: 0,
                data: {
                    $arrayToObject: {
                        $map: {
                            input: "$categories",
                            as: "item",
                            in: {
                                k: {
                                    $ifNull: [
                                        "$$item.category",
                                        "Uncategorized"
                                    ]
                                },
                                v: {
                                    $round: [
                                        {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        "$$item.count",
                                                        "$totalJobs"
                                                    ]
                                                },
                                                100
                                            ]
                                        },
                                        2
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        }
    ]);

    // Final data
    const data = result?.data || {};

    // Response
    return response.status(200).json(new ApiResponse(200, data, "Sector distribution graph has been fetched"));
});

// Fetch active jobs
const fetchActiveJobs = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(request);

    // Fetch
    const jobs = await Job.aggregatePaginate([
        // Match
        { $match: { status: "open", ...dateFilter } },

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
                employmentType: 1,
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
    if(!job) throw new ApiError(404, "Active job not found");

    // Response
    return response.status(200).json(new ApiResponse(200, job, "Active job has been fetched"));
});

// Fetch reported jobs
const fetchReportedJobs = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(request);

    // Fetch reported jobs
    const jobs = await Job.aggregatePaginate([
        // Match jobs
        { $match: { status: "open", ...dateFilter } },

        // Lookup business
        {
            $lookup: {
                from: "businessprofiles",
                localField: "businessId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline: [{ $project: { _id: 0, companyName: 1, logo: 1 } }]
            }
        },

        // Lookup reports for this job
        {
            $lookup: {
                from: "reports",
                let: { jobId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$reportedContentId", "$$jobId"] },
                                    { $eq: ["$reportedModel", "Job"] }
                                ]
                            }
                        }
                    },
                    { $sort: { createdAt: -1 } }
                ],
                as: "reports"
            }
        },

        // Only jobs that have reports
        { $match: { "reports.0": { $exists: true } } },

        // Unwind business
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: true } },

        // Add report count and latest report date
        {
            $addFields: {
                reportCount: { $size: "$reports" },
                latestReportAt: {
                    $arrayElemAt: ["$reports.createdAt", 0]
                }
            }
        },

        // Sort by latest report
        { $sort: { latestReportAt: -1 } },

        // Projection
        {
            $project: {
                jobTitle: 1,
                location: 1,
                businessProfile: 1,
                reportCount: 1,
                latestReportAt: 1,
                createdAt: 1
            }
        }
    ], { page, limit });
    if(!jobs.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No reported jobs found"));
    
    // Response
    return response.status(200).json(new ApiResponse(200, jobs, "Reported jobs have been fetched"));
});

// View reported job
const viewReportedJob = asyncHandler(async (request, response) => {
    const { jobId } = request.params;
    if(!isValidObjectId(jobId)) throw new ApiError(400, "Invalid Job ID");

    // Check if job is reported
    const exist = await Report.exists({ reportedContentId: jobId });
    if(!exist) throw new ApiError(404, "No reported job found");

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
        
        // Lookup job reports
        {
            $lookup: {
                from: "reports",
                localField: "_id",
                foreignField: "reportedContentId",
                as: "jobReports",
                pipeline:[
                    // Lookup user profile
                    {
                        $lookup: {
                            from: "userprofiles",
                            localField: "userProfileId",
                            foreignField: "_id",
                            as: "userProfile",
                            pipeline:[{ $project: { _id: 0, fullName: 1, logo: 1, email: 1, } }]
                        }
                    },

                    // Unwind
                    { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: true } },

                    // Sort
                    { $sort: { createdAt: -1 } },

                    // Projection
                    { $project: { _id: 0, reason: 1, description: 1, media: 1, createdAt: 1, userProfile: 1 } },
                ]
            }
        },        

        // Unwind
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: true } },

        // Count total job applicants and reports
        {
            $addFields: {
                totalJobApplicants: { $size: "$jobApplications" },
                reportCount: { $size: "$jobReports" }
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
                reportCount: 1,
                salaryMin: 1,
                salaryMax: 1,
                createdAt: 1,
                jobReports: 1
            }
        }
    ]);
    if(!job) throw new ApiError(404, "Reported job not found");

    // Response
    return response.status(200).json(new ApiResponse(200, job, "Reported job has been fetched"));
});

// Delete reported job
const deleteJob = asyncHandler(async (request, response) => {
    const { jobId } = request.params;
    if(!isValidObjectId(jobId)) throw new ApiError(400, "Invalid Job ID");

    // Check if job is reported
    const exist = await Report.exists({ reportedContentId: jobId });
    if(!exist) throw new ApiError(404, "You can only delete a reported job");

    // Delete
    const job = await Job.findByIdAndDelete(jobId)
    .populate({ path: "businessId", select: "ownerUserId" });
    if(!job) throw new ApiError(404, "Job not found");

    // Cleanup
    await Promise.all([
        // Delete all reports associated with this job
        Report.deleteMany({ reportedContentId: jobId }),

        // Delete all applications associated with this job
        JobApplication.deleteMany({ jobId }),

        // Send notification to business
        sendNotification({
            userId: job.businessId.ownerUserId,
            type: "BusinessProfile",
            title: `Job Deleted`,
            content: `Your job "${job.jobTitle}" has been deleted by an Admin`,
            io: request.app.get("io")
        })     
    ]);

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Job has been deleted"));
});

module.exports = { jobManagementInitiator, fetchJobStats, fetchActiveJobs, 
fetchSectorDistributionGraph, viewActiveJob, fetchReportedJobs, 
viewReportedJob, deleteJob };