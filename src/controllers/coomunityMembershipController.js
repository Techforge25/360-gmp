const CommunityMembership = require("../models/communityMembership");
const Community = require("../models/communityModel");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { isValidObjectId } = require("mongoose");

// Remove member from community
const removeMemberFromCommunity = asyncHandler(async (request, response) => {
    const { communityId, memberId } = request.params;

    // Validate IDs
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid communityId");
    if(!isValidObjectId(memberId)) throw new ApiError(400, "Invalid memberId");

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

// Make admin to member
const makeAdmin = asyncHandler(async (request, response) => {
    const { communityId, memberId } = request.params;

    // Validate IDs
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid communityId");
    if(!isValidObjectId(memberId)) throw new ApiError(400, "Invalid memberId");

    // Authentication check
    const { userProfileId, businessProfileId } = request.user.profiles || {};
    if(!userProfileId && !businessProfileId) throw new ApiError(401, "Unauthorized");

    // Check target member exists
    const targetMembership = await CommunityMembership.findOne({ memberId, communityId });
    if(!targetMembership) throw new ApiError(404, "A Member you are trying to make admin is not found in this community");

    // Owner cannot be made admin
    if(targetMembership.role === "owner") throw new ApiError(403, "Community owner is already admin");
    
    // Find requester membership (from either profile)
    const requesterMembership = await CommunityMembership.findOne({
        communityId,
        memberId: { $in: [userProfileId, businessProfileId] },
        status: "approved"
    });
    if(!requesterMembership) throw new ApiError(403, "You are not a member of this community");

    // Role check
    if(requesterMembership.role !== "owner") throw new ApiError(403, "Only owner can make admin");

    // Update role to admin
    const updatedMembership = await CommunityMembership.updateOne(
        { memberId, communityId },
        { $set: { role: "admin" } }
    );
    if(updatedMembership.modifiedCount === 0) throw new ApiError(500, "Failed to update member role");

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Member made admin successfully"));
});

// Demote admin to member
const demoteAdmin = asyncHandler(async (request, response) => {
    const { communityId, memberId } = request.params;

    // Validate IDs
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid communityId");
    if(!isValidObjectId(memberId)) throw new ApiError(400, "Invalid memberId");

    // Authentication check
    const { userProfileId, businessProfileId } = request.user.profiles || {};
    if(!userProfileId && !businessProfileId) throw new ApiError(401, "Unauthorized");
    
    // Check target member exists
    const targetMembership = await CommunityMembership.findOne({ memberId, communityId });
    if(!targetMembership) throw new ApiError(404, "A Member you are trying to demote is not found in this community");

    // Owner cannot be demoted
    if(targetMembership.role === "owner") throw new ApiError(403, "Community owner cannot be demoted");

    // Find requester membership (from either profile)
    const requesterMembership = await CommunityMembership.findOne({
        communityId,
        memberId: { $in: [userProfileId, businessProfileId] },
        status: "approved"
    });
    if(!requesterMembership) throw new ApiError(403, "You are not a member of this community");

    // Role check
    if(requesterMembership.role !== "owner") throw new ApiError(403, "Only owner can demote admin");

    // Update role to member
    const updatedMembership = await CommunityMembership.updateOne(
        { memberId, communityId },
        { $set: { role: "member" } }
    );
    if(updatedMembership.modifiedCount === 0) throw new ApiError(500, "Failed to update member role");

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Admin demoted to member successfully"));
});

module.exports = { removeMemberFromCommunity, makeAdmin, demoteAdmin };