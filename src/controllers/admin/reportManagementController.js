const { isValidObjectId } = require("mongoose");
const { emptyList } = require("../../constants");
const Report = require("../../models/reportModel");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const convertToMongoId = require("../../utils/convertToMongoId");

// Fetch reports stats
const fetchReportStats = asyncHandler(async (request, response) => {
    const [jobReports, businessReports, productReports, communityReports] = await Promise.all([
        Report.countDocuments({ reportedModel: "Job" }),
        Report.countDocuments({ reportedModel: "BusinessProfile" }),
        Report.countDocuments({ reportedModel: "Product" }),
        Report.countDocuments({ reportedModel: "Community" })
    ]);

    // Payload
    const payload = { jobReports, businessReports, productReports, communityReports };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Report stats have been fetched"));
});

// Fetch job reports
const fetchJobReports = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Fetch
    const reports = await Report.aggregatePaginate([
        // Match
        { $match: { reportedModel: "Job" } },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "userProfileId",
                foreignField: "_id",
                as: "reportedBy",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "jobs",
                localField: "reportedContentId",
                foreignField: "_id",
                as: "job",
                pipeline: [
                    {
                        $lookup: {
                            from: "businessprofiles",
                            localField: "businessId",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[{ $project:{ _id:0, companyName: 1, email: "$primaryContactPerson.supportEmail", logo: 1 } }]
                        }
                    },

                    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: false } },
                    { $project: { _id: 0, jobTitle: 1, owner: 1 } }
                ]
            }
        },

        // Unwind
        { $unwind: { path: "$reportedBy", preserveNullAndEmptyArrays: false } }, 
        { $unwind: { path: "$job", preserveNullAndEmptyArrays: false } },  
        
        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        { 
            $project: { 
                reportedBy: 1, 
                reportedJob: "$job",
                reason: 1,  
                createdAt: 1 
            } 
        }
    ], { page, limit });
    if(!reports.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No reports found"));

    // Response
    return response.status(200).json(new ApiResponse(200, reports, "Reports have been fetched"));
});

// Fetch business profile reports
const fetchBusinessProfileReports = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Fetch
    const reports = await Report.aggregatePaginate([
        // Match
        { $match: { reportedModel: "BusinessProfile" } },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "userProfileId",
                foreignField: "_id",
                as: "reportedBy",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "reportedContentId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline: [{ $project: { _id: 0, companyName: 1, email: "$primaryContactPerson.supportEmail", logo: 1 } }]
            }
        },

        // Unwind
        { $unwind: { path: "$reportedBy", preserveNullAndEmptyArrays: false } }, 
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: false } },  
        
        // Sort
        { $sort: { createdAt: -1 } },        

        // Projection
        { 
            $project: { 
                reportedBy: 1, 
                reportedBusiness: "$businessProfile",
                reason: 1,  
                createdAt: 1 
            } 
        }
    ], { page, limit });
    if(!reports.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No reports found"));

    // Response
    return response.status(200).json(new ApiResponse(200, reports, "Reports have been fetched"));
});

// Fetch product reports
const fetchProductReports = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Fetch
    const reports = await Report.aggregatePaginate([
        // Match
        { $match: { reportedModel: "Product" } },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "userProfileId",
                foreignField: "_id",
                as: "reportedBy",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "products",
                localField: "reportedContentId",
                foreignField: "_id",
                as: "product",
                pipeline: [
                    {
                        $lookup: {
                            from: "businessprofiles",
                            localField: "businessId",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[{ $project:{ _id:0, companyName: 1, email: "$primaryContactPerson.supportEmail", logo: 1 } }]
                        }
                    },

                    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: false } },
                    { $project: { _id: 0, title: 1, owner: 1 } }
                ]
            }
        },

        // Unwind
        { $unwind: { path: "$reportedBy", preserveNullAndEmptyArrays: false } }, 
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: false } },   
        
        // Sort
        { $sort: { createdAt: -1 } },        

        // Projection
        { 
            $project: { 
                reportedBy: 1, 
                reportedProduct: "$product",
                reason: 1,  
                createdAt: 1 
            } 
        }
    ], { page, limit });
    if(!reports.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No reports found"));

    // Response
    return response.status(200).json(new ApiResponse(200, reports, "Reports have been fetched"));
});

// Fetch community reports
const fetchCommunityReports = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Fetch
    const reports = await Report.aggregatePaginate([
        // Match
        { $match: { reportedModel: "Community" } },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "userProfileId",
                foreignField: "_id",
                as: "reportedBy",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "communities",
                localField: "reportedContentId",
                foreignField: "_id",
                as: "community",
                pipeline: [
                    {
                        $lookup: {
                            from: "businessprofiles",
                            localField: "businessId",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[{ $project:{ _id:0, companyName: 1, email: "$primaryContactPerson.supportEmail", logo: 1 } }]
                        }
                    },

                    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: false } },
                    { $project: { _id: 0, name: 1, owner: 1 } }
                ]
            }
        },

        // Unwind
        { $unwind: { path: "$reportedBy", preserveNullAndEmptyArrays: false } }, 
        { $unwind: { path: "$community", preserveNullAndEmptyArrays: false } },  
        
        // Sort
        { $sort: { createdAt: -1 } },        

        // Projection
        { 
            $project: { 
                reportedBy: 1, 
                reportedCommunity: "$community",
                reason: 1,  
                createdAt: 1 
            } 
        }
    ], { page, limit });
    if(!reports.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No reports found"));

    // Response
    return response.status(200).json(new ApiResponse(200, reports, "Reports have been fetched"));
});

// View job report
const viewJobReport = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { reportId } = request.params;
    if(!isValidObjectId(reportId)) throw new ApiError(400, "Invalid Report ID");

    // Fetch
    const [report] = await Report.aggregate([
        // Match
        { $match: { _id: convertToMongoId(reportId), reportedModel: "Job" } },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "userProfileId",
                foreignField: "_id",
                as: "reportedBy",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "jobs",
                localField: "reportedContentId",
                foreignField: "_id",
                as: "job",
                pipeline: [
                    {
                        $lookup: {
                            from: "businessprofiles",
                            localField: "businessId",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[{ $project:{ _id: 0, companyName: 1 } }]
                        }
                    },

                    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: false } },
                    { $project: { _id: 0, jobTitle: 1, employmentType:1,  owner: 1 } }
                ]
            }
        },

        // Unwind
        { $unwind: { path: "$reportedBy", preserveNullAndEmptyArrays: false } }, 
        { $unwind: { path: "$job", preserveNullAndEmptyArrays: false } },        

        // Projection
        { 
            $project: { 
                reportedBy: 1, 
                reportedJob: "$job",
                reason: 1,  
                description: 1,
                media: 1,
                createdAt: 1 
            } 
        }        
    ]);
    if(!report) throw new ApiError(404, "Report not found");

    // Response
    return response.status(200).json(new ApiResponse(200, report, "Job report has been viewed"));
});

// View business report
const viewBusinessReport = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { reportId } = request.params;
    if(!isValidObjectId(reportId)) throw new ApiError(400, "Invalid Report ID");

    // Fetch
    const [report] = await Report.aggregate([
        // Match
        { $match: { _id: convertToMongoId(reportId), reportedModel: "BusinessProfile" } },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "userProfileId",
                foreignField: "_id",
                as: "reportedBy",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "reportedContentId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline: [{ $project: { _id: 0, companyName: 1, ownerName: 1, primaryIndustry:1, email: "$primaryContactPerson.supportEmail" } }]
            }
        },

        // Unwind
        { $unwind: { path: "$reportedBy", preserveNullAndEmptyArrays: false } }, 
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: false } },        

        // Projection
        { 
            $project: { 
                reportedBy: 1, 
                reportedBusiness: "$businessProfile",
                reason: 1,  
                description: 1,
                media: 1,
                createdAt: 1 
            } 
        }      
    ]);
    if(!report) throw new ApiError(404, "Report not found");

    // Response
    return response.status(200).json(new ApiResponse(200, report, "Business report has been viewed"));
});

// View product report
const viewProductReport = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { reportId } = request.params;
    if(!isValidObjectId(reportId)) throw new ApiError(400, "Invalid Report ID");

    // Fetch
    const [report] = await Report.aggregate([
        // Match
        { $match: { _id: convertToMongoId(reportId), reportedModel: "Product" } },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "userProfileId",
                foreignField: "_id",
                as: "reportedBy",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "products",
                localField: "reportedContentId",
                foreignField: "_id",
                as: "product",
                pipeline: [
                    {
                        $lookup: {
                            from: "businessprofiles",
                            localField: "businessId",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[{ $project:{ _id: 0, companyName: 1, email: "$primaryContactPerson.supportEmail" } }]
                        }
                    },

                    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: false } },
                    { $project: { _id: 0, title: 1, category: 1, pricePerUnit: 1, owner: 1 } }
                ]
            }
        },

        // Unwind
        { $unwind: { path: "$reportedBy", preserveNullAndEmptyArrays: false } }, 
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: false } },        

        // Projection
        { 
            $project: { 
                reportedBy: 1, 
                reportedProduct: "$product",
                reason: 1,  
                description: 1,
                media: 1,
                createdAt: 1 
            } 
        }     
    ]);
    if(!report) throw new ApiError(404, "Report not found");

    // Response
    return response.status(200).json(new ApiResponse(200, report, "Business report has been viewed"));
});

// View community report
const viewCommunityReport = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { reportId } = request.params;
    if(!isValidObjectId(reportId)) throw new ApiError(400, "Invalid Report ID");

    // Fetch
    const [report] = await Report.aggregate([
        // Match
        { $match: { _id: convertToMongoId(reportId), reportedModel: "Community" } },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "userProfileId",
                foreignField: "_id",
                as: "reportedBy",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "communities",
                localField: "reportedContentId",
                foreignField: "_id",
                as: "community",
                pipeline: [
                    {
                        $lookup: {
                            from: "businessprofiles",
                            localField: "businessId",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[{ $project:{ _id:0, companyName: 1, email: "$primaryContactPerson.supportEmail" } }]
                        }
                    },

                    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: false } },
                    { $project: { _id: 0, name: 1, type: 1, owner: 1 } }
                ]
            }
        },

        // Unwind
        { $unwind: { path: "$reportedBy", preserveNullAndEmptyArrays: false } }, 
        { $unwind: { path: "$community", preserveNullAndEmptyArrays: false } },        

        // Projection
        { 
            $project: { 
                reportedBy: 1, 
                reportedCommunity: "$community",
                reason: 1, 
                description: 1,
                media: 1, 
                createdAt: 1 
            } 
        }    
    ]);
    if(!report) throw new ApiError(404, "Report not found");

    // Response
    return response.status(200).json(new ApiResponse(200, report, "Business report has been viewed"));
});

module.exports = { fetchReportStats, fetchJobReports, fetchBusinessProfileReports, 
fetchProductReports, fetchCommunityReports, viewJobReport, viewBusinessReport, 
viewProductReport, viewCommunityReport };