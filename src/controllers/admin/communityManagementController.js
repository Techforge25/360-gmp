const Community = require("../../models/communityModel");
const CommunityMembership = require("../../models/communityMembership");
const CommunityPost = require("../../models/communityPostModel");
const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const Report = require("../../models/reportModel");

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

module.exports = { communityManagementInitiator, fetchCommunityStats };