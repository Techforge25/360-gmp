const Community = require("../../models/communityModel");
const CommunityMembership = require("../../models/communityMembership");
const CommunityPost = require("../../models/communityPostModel");
const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const Report = require("../../models/reportModel");
const { emptyList } = require("../../constants");

// Initiator
const communityManagementInitiator = asyncHandler(async (request, response) => {
    // Response
    return response.status(200).json(new ApiResponse(200, { hasAccess: true }, "Initiate Community Management Module"));
});

// Fetch community stats
const fetchCommunityStats = asyncHandler(async (request, response) => {
    const [activeCommunitiesCount, reportedCommunitiesCount] = await Promise.all([
        Community.countDocuments({ status: "active" }),
        Report.countDocuments({ reportedModel: "Community" })
    ]);

    // Prepare payload
    const payload = {
        activeCommunitiesCount,
        reportedCommunitiesCount
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Dashboard stats have been fetched"));
});

// Fetch communities
const fetchCommunities = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search, status, category } = request.query;

    // Search filters
    const searchFilter = {};
    if(search) searchFilter.name = { $regex: search, $options: "i" };
    if(status) searchFilter.status = { $regex: status, $options: "i" };
    if(category) searchFilter.category = { $regex: category, $options: "i" };

    // Fetch
    const communities = await Community.aggregatePaginate([
        // Match
        { $match: searchFilter },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "businessId",
                foreignField: "_id",
                as: "creator",
                pipeline: [{ $project: { ownerName: 1 } }]
            }
        },

        // Lookup community membership
        {
            $lookup: {
                from: "communitymemberships",
                localField: "_id",
                foreignField: "communityId",
                as: "membership",
                pipeline:[
                    { $match: { status: "approved" } }
                ]
            }
        },        

        // Unwind
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },

        // Add fields
        {
            $addFields: {
                membersCount: { $size: "$membership" }
            }
        },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        {
            $project: {
                name: 1,
                profileImage: 1,
                creator: "$creator.ownerName",
                type: 1,
                category: 1,
                membersCount: 1,
                status: 1
            }
        },
    ], { page, limit });
    if(!communities.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No communities found"));

    // Response
    return response.status(200).json(new ApiResponse(200, communities, "Communities have been fetched"));
});

module.exports = { communityManagementInitiator, fetchCommunityStats, fetchCommunities };