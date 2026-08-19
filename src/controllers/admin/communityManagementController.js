const Community = require("../../models/communityModel");
const CommunityMembership = require("../../models/communityMembership");
const CommunityPost = require("../../models/communityPostModel");
const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const Report = require("../../models/reportModel");
const { emptyList } = require("../../constants");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../../utils/convertToMongoId");

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

        // Add member count field
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

// View community
const viewCommunity = asyncHandler(async (request, response) => {
    // Validate ID
    const { communityId } = request.params;
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid Community ID");

    // Fetch
    const [community] = await Community.aggregate([
        // Match
        { $match: { _id: convertToMongoId(communityId) } },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "businessId",
                foreignField: "_id",
                as: "creator",
                pipeline: [{ $project: { ownerName: 1, companyName: 1, logo: 1, createdAt: 1,  } }]
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
        
        // Add member count field
        {
            $addFields: {
                membersCount: { $size: "$membership" }
            }
        },        

        // Projection
        {
            $project: {
                name: 1,
                profileImage: 1,
                description: 1,
                status: 1,
                type: 1,
                purpose: 1,
                category: 1,
                membersCount: 1,
                createdAt: 1,
                creator: 1
            }
        }
    ]);
    if(!community) throw new ApiError(404, "Community not found");

    // Response
    return response.status(200).json(new ApiResponse(200, community, "Community has been fetched"));
});

// Fetch community members
const fetchCommunityMembers = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Validate ID
    const { communityId } = request.params;
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid Community ID");

    // Find community
    const members = await CommunityMembership.aggregatePaginate([

    ], { page, limit });
    if(!members.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No "))

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Community members have been fetched"));
});

module.exports = { communityManagementInitiator, fetchCommunityStats, fetchCommunities, 
viewCommunity, fetchCommunityMembers };