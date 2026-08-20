const Community = require("../../models/communityModel");
const CommunityMembership = require("../../models/communityMembership");
const CommunityPost = require("../../models/communityPostModel");
const CommunityWarning = require("../../models/communityWarningModel");
const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const Report = require("../../models/reportModel");
const { emptyList } = require("../../constants");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../../utils/convertToMongoId");
const validate = require("../../utils/validate");
const { warnCommunityOwnerValidator } = require("../../validations/communityManagementValidator");
const sendNotification = require("../../utils/sendNotification");

// Allowed date filters
const allowedDateFilters = ["all", "1d", "3d", "7d"];

// Helper function to implement date range
const getDateFilter = (request, fieldName = "createdAt") => {
    // Date filter
    const { dateRange = "all" } = request.query;
    if(!allowedDateFilters.includes(dateRange)) throw new ApiError(400, "Invalid date range");

    // Date filter
    const dateFilter = {};

    if(dateRange !== "all")
    {
        // Calculate date
        const now = new Date();
        let startDate = new Date();

        if(dateRange === "1d") startDate.setDate(now.getDate() - 1);
        if(dateRange === "3d") startDate.setDate(now.getDate() - 3);
        if(dateRange === "7d") startDate.setDate(now.getDate() - 7);

        // Inject date range
        dateFilter[fieldName] = { $gte: startDate };
    }

    return { dateFilter };
};

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
        
        // Lookup community warnings
        {
            $lookup: {
                from: "communitywarnings",
                localField: "_id",
                foreignField: "communityId",
                as: "communitywarnings"
            }
        },         

        // Unwind
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        
        // Add member count and warning count fields
        {
            $addFields: {
                membersCount: { $size: "$membership" },
                warningsCount: { $size: "$communitywarnings" }
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
                warningsCount: 1,
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
    const { page = 1, limit = 10, search = "" } = request.query;

    // Validate ID
    const { communityId } = request.params;
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid Community ID");

    // Fetch
    const members = await CommunityMembership.aggregatePaginate([
        // Match
        { $match: { communityId: convertToMongoId(communityId) } },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "memberId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline: [{ $project: { _id: 0, name: "$ownerName", logo: 1 } }]
            }
        },   
        
        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "memberId",
                foreignField: "_id",
                as: "userProfile",
                pipeline: [{ $project: { _id: 0, name: "$fullName", logo: 1 } }]
            }
        },         
        
        // Unwind
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: true } }, 
        
        // Search by business owner name or user's full name
        ...(search ? [{ 
            $match: {
                $or: [
                    { 'businessProfile.name': { $regex: search, $options: "i" } },
                    { 'userProfile.name': { $regex: search, $options: "i" } },
                ]
            }           
        }] : []),

        // Sort
        { $sort: { joinedAt: -1 } },

        // Projection
        {
            $project: {
                role: 1,
                joinedAt: 1,
                member: {
                    $cond: [
                        { $eq: ["$memberModel", "UserProfile"] },
                        "$userProfile",
                        "$businessProfile"
                    ]
                }
            }
        }
    ], { page, limit });
    if(!members.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No community members found"));

    // Response
    return response.status(200).json(new ApiResponse(200, members, "Community members have been fetched"));
});

// Fetch community posts
const fetchCommunityPosts = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Validate ID
    const { communityId } = request.params;
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid Community ID");

    // Get date filter
    const { dateFilter } = getDateFilter(request);

    // Fetch
    const posts = await CommunityPost.aggregatePaginate([
        // Match
        { $match: { communityId: convertToMongoId(communityId), ...dateFilter } }, 
        
        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "authorId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline:[{ $project: { _id: 0, name: "$ownerName", logo: 1 } }]
            }
        },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "authorId",
                foreignField: "_id",
                as: "userProfile",
                pipeline:[{ $project: { _id: 0, name: "$fullName", logo: 1 } }]
            }
        },        

        // Unwind
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: true } },         
        
        // Sort
        { $sort: { createdAt: -1 } },
        
        // Projection
        {
            $project: {
                type: 1,
                content: 1,
                postedBy:{
                    $cond: [
                        { $eq: ["$authorModel", "UserProfile"] },
                        "$userProfile",
                        "$businessProfile"
                    ]
                },
                file: {
                    $cond: [
                        { $eq: ["$type", "file"] },
                        "$file",
                        "$$REMOVE"
                    ]                    
                },
                event: {
                    $cond: [
                        { $eq: ["$type", "event"] },
                        "$event",
                        "$$REMOVE"
                    ]                     
                },
                poll: {
                    $cond: [
                        { $eq: ["$type", "poll"] },
                        "$poll",
                        "$$REMOVE"
                    ]                      
                },
                images: 1,
                createdAt: 1
            }
        }
    ], { page, limit });
    if(!posts.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No community posts found"));

    // Response
    return response.status(200).json(new ApiResponse(200, posts, "Community posts have been fetched"));
});

// Send warning to community owner
const warnCommunityOwner = asyncHandler(async (request, response) => {
    const adminId = request.admin._id;

    // Validate ID
    const { communityId } = request.params;
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid Community ID");   

    // Get validated payload
    const { reason, description } = validate(warnCommunityOwnerValidator, request.body) || {};

    // Execute parallel queries
    const [community, warningCounts] = await Promise.all([
        // Find community
        Community.findById(communityId).select("-_id name")
        .populate({ path: "businessId", select: "-_id ownerUserId" }).lean(),

        // Get warning counts
        CommunityWarning.countDocuments({ communityId })
    ]);

    // Validate
    if(!community) throw new ApiError(404, "Community not found");
    if(warningCounts >= 3) throw new ApiError(403, "You can only issue up to three warnings to a community");

    // Save to db
    const warning = await CommunityWarning.create({ adminId, communityId, reason, description });
    if(!warning) throw new ApiError(500, "Failed to issue warning");

    // Send notification
    await sendNotification({
        type: "BusinessProfile",
        title: `Community Warning (${community.name})`,
        content: description ? `${reason} - ${description}` : `${reason} ${description}`,
        userId: community.businessId.ownerUserId,
        io: request.app.get("io")
    });

    // Response
    return response.status(201).json(new ApiResponse(201, null, "Warning has been issued to community owner"));
});

// Suspend community
const suspendCommunity = asyncHandler(async (request, response) => {
    // Validate ID
    const { communityId } = request.params;
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid Community ID");   

    // Execute parallel queries
    const [community, warningCounts] = await Promise.all([
        // Find community
        Community.findById(communityId).select("name status")
        .populate({ path: "businessId", select: "-_id ownerUserId" }),

        // Get warning counts
        CommunityWarning.countDocuments({ communityId })
    ]);

    // Validate
    if(!community) throw new ApiError(404, "Community not found");
    if(community.status === "suspended") throw new ApiError(400, "This community has already been suspended");
    if(warningCounts < 3) throw new ApiError(403, "A community must receive at least three warnings before it can be suspended");

    // Save to db
    community.status = "suspended";
    await community.save();

    // Send notification
    await sendNotification({
        type: "BusinessProfile",
        title: `Community Suspension (${community.name})`,
        content: `Your community "${community.name}" has been suspended`,
        userId: community.businessId.ownerUserId,
        io: request.app.get("io")
    });

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Community has been suspended"));
});

// Re-activate community
const activateCommunity = asyncHandler(async (request, response) => {
    // Validate ID
    const { communityId } = request.params;
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid Community ID");   

    // Find community
    const community = await Community.findById(communityId).select("name status")
    .populate({ path: "businessId", select: "-_id ownerUserId" });

    // Validate
    if(!community) throw new ApiError(404, "Community not found");
    if(community.status !== "suspended") throw new ApiError(400, "This community is already in active mode");

    // Save to db
    community.status = "active";
    await community.save();

    // Delete warnings
    await CommunityWarning.deleteMany({ communityId });

    // Send notification
    await sendNotification({
        type: "BusinessProfile",
        title: `Community Activation (${community.name})`,
        content: `Your community "${community.name}" has been re-actived`,
        userId: community.businessId.ownerUserId,
        io: request.app.get("io")
    });

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Community has been re-activated"));
});

module.exports = { communityManagementInitiator, fetchCommunityStats, fetchCommunities, 
viewCommunity, fetchCommunityMembers, fetchCommunityPosts, warnCommunityOwner,
suspendCommunity, activateCommunity };