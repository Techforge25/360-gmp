const CommunityMembership = require("../models/communityMembership");
const Community = require("../models/communityModel");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// Remove member from community
const removeMemberFromCommunity = asyncHandler(async (request, response) => {
    const { communityId, memberId } = request.params;

    // Authentication check
    const { userProfileId, businessProfileId } = request.user.profiles || {};
    if(!userProfileId && !businessProfileId) throw new ApiError(401, "Unauthorized");

    // Check target member exists
    const targetMembership = await CommunityMembership.findOne({ memberId, communityId });
    if(!targetMembership) throw new ApiError(404, "A Member you are trying to remove is not found in this community");

    // Owner cannot be removed
    if(targetMembership.role === "owner") throw new ApiError(403, "Community owner cannot be removed");

    // Find requester membership (from either profile)
    const requesterMembership = await CommunityMembership.findOne({
        communityId,
        memberId: { $in: [userProfileId, businessProfileId] },
        status: "approved"
    });
    if(!requesterMembership) throw new ApiError(403, "You are not a member of this community");

    // Role check
    if(!["owner", "admin"].includes(requesterMembership.role)) throw new ApiError(403, "Only owner or admin can remove members");

    // Admin cannot remove another admin
    if(requesterMembership.role === "admin" && targetMembership.role === "admin") throw new ApiError(403, "Admin cannot remove another admin");

    // Remove member
    await targetMembership.deleteOne();

    // Update member count
    await Community.findByIdAndUpdate(communityId, { $inc: { memberCount: -1 } });

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Member removed successfully"));
});

module.exports = { removeMemberFromCommunity };