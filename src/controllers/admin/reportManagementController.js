const { emptyList } = require("../../constants");
const Report = require("../../models/reportModel");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

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
                as: "userProfile",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1 } }]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "reportedContentId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline: [{ $project: { _id: 0, ownerName: 1, companyName: 1, email: "$primaryContactPerson.supportEmail" } }]
            }
        },

        // Unwind
        { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: false } }, 
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: false } },        

        // Projection
        { 
            $project: { 
                reporter: "$userProfile", 
                reportedBusiness: "$businessProfile",
                reason: 1, 
                description: 1, 
                media: 1, 
                createdAt: 1 
            } 
        }
    ], { page, limit });
    if(!reports.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No reports found"));

    // Response
    return response.status(200).json(new ApiResponse(200, reports, "Reports have been fetched"));
});

module.exports = { fetchBusinessProfileReports };