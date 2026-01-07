const Community = require("../models/communityModel");
const CommunityMembership = require("../models/communityMembership");
const BusinessProfile = require("../models/businessProfileSchema");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createCommunitySchema, updateCommunitySchema, approveMembershipSchema } = require("../validations/communityValidator");

// Helper function to get userProfileId from userId
const getUserProfileId = async (userId) => {
    const userProfile = await UserProfile.findOne({ userId });
    if(!userProfile) throw new ApiError(404, "User profile not found. Please create your profile first.");
    return userProfile._id;
};

// Create Community (only business owner)
const createCommunity = asyncHandler(async (request, response) => {
    const { error, value } = createCommunitySchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Check if businessId exists
    const businessProfile = await BusinessProfile.findById(value.businessId);
    if(!businessProfile) {
        throw new ApiError(404, "Business profile not found. Invalid business ID");
    }

    // Verify that the user is the owner of the business
    if(businessProfile.ownerUserId.toString() !== request.user._id.toString()) {
        throw new ApiError(403, "Only business owner can create communities");
    }

    // Create community
    const community = await Community.create(value);
    if(!community) throw new ApiError(500, "Failed to create community");

    // Add business owner as community owner (auto-join)
    const userProfileId = await getUserProfileId(request.user._id);
    await CommunityMembership.create({
        communityId: community._id,
        userProfileId: userProfileId,
        role: "owner",
        status: "approved"
    });

    // Update member count
    community.memberCount = 1;
    await community.save();

    // Populate business details
    await community.populate("businessId", "companyName businessType primaryIndustry logo");

    return response.status(201).json(new ApiResponse(201, community, "Community created successfully"));
});

// Get All Communities (with pagination and filters)
const getAllCommunities = asyncHandler(async (request, response) => {
    const { businessId, type, status, category, page = 1, limit = 20 } = request.query;

    const filter = {};
    if(businessId) filter.businessId = businessId;
    if(type) filter.type = type;
    if(status) filter.status = status;
    if(category) filter.category = category;

    // Pagination
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Get total count
    const totalCommunities = await Community.countDocuments(filter);
    const totalPages = Math.ceil(totalCommunities / limitNumber);

    // Get communities
    const communities = await Community.find(filter)
        .populate("businessId", "companyName businessType primaryIndustry logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    const paginationInfo = {
        currentPage: pageNumber,
        totalPages: totalPages,
        totalCommunities: totalCommunities,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
    };

    return response.status(200).json(
        new ApiResponse(200, { communities, pagination: paginationInfo }, "Communities fetched successfully")
    );
});

// Get Community By ID
const getCommunityById = asyncHandler(async (request, response) => {
    const { id } = request.params;

    const community = await Community.findById(id)
        .populate("businessId", "companyName businessType primaryIndustry location logo banner website");

    if(!community) throw new ApiError(404, "Community not found");

    // Check if user is member (for private communities)
    let isMember = false;
    let membershipStatus = null;
    if(request.user?._id) {
        const userProfileId = await getUserProfileId(request.user._id);
        const membership = await CommunityMembership.findOne({
            communityId: id,
            userProfileId: userProfileId
        });
        if(membership) {
            isMember = true;
            membershipStatus = membership.status;
        }
    }

    return response.status(200).json(
        new ApiResponse(200, { community, isMember, membershipStatus }, "Community fetched successfully")
    );
});

// Join Community
const joinCommunity = asyncHandler(async (request, response) => {
    const { id } = request.params; // Get communityId from URL params

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Get user profile
    const userProfileId = await getUserProfileId(request.user._id);

    // Check if already a member
    const existingMembership = await CommunityMembership.findOne({
        communityId: id,
        userProfileId: userProfileId
    });

    if(existingMembership) {
        if(existingMembership.status === "approved") {
            throw new ApiError(400, "You are already a member of this community");
        } else if(existingMembership.status === "pending") {
            throw new ApiError(400, "Your join request is pending approval");
        } else {
            throw new ApiError(400, "Your join request was rejected");
        }
    }

    // Handle different community types
    let membershipStatus = "approved";
    let isPaid = false;

    if(community.type === "private") {
        membershipStatus = "pending";
    } else if(community.type === "featured") {
        // Check if user has subscription/paid access
        // For now, set as pending - business owner will approve after payment verification
        membershipStatus = "pending";
        isPaid = true;
    }
    // public communities: status = "approved" (default)

    // Create membership
    const membership = await CommunityMembership.create({
        communityId: id,
        userProfileId: userProfileId,
        role: "member",
        status: membershipStatus,
        isPaid: isPaid
    });

    // Update member count only if approved
    if(membershipStatus === "approved") {
        community.memberCount += 1;
        await community.save();
    }

    return response.status(201).json(
        new ApiResponse(
            201, 
            { membership, message: membershipStatus === "approved" ? "Successfully joined community" : "Join request sent. Waiting for approval" },
            membershipStatus === "approved" ? "Joined community successfully" : "Join request sent successfully"
        )
    );
});

// Approve/Reject Membership (for private/featured communities)
const approveMembership = asyncHandler(async (request, response) => {
    const { id } = request.params; // communityId
    const { error, value } = approveMembershipSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Verify user is business owner or admin
    const businessProfile = await BusinessProfile.findById(community.businessId);
    if(businessProfile.ownerUserId.toString() !== request.user._id.toString()) {
        // Check if user is admin/moderator of the community
        const userProfileId = await getUserProfileId(request.user._id);
        const userMembership = await CommunityMembership.findOne({
            communityId: id,
            userProfileId: userProfileId,
            role: { $in: ["owner", "admin", "moderator"] }
        });
        if(!userMembership) {
            throw new ApiError(403, "Only community owner/admins can approve memberships");
        }
    }

    // Find and update membership
    const membership = await CommunityMembership.findOneAndUpdate(
        {
            communityId: id,
            userProfileId: value.userProfileId
        },
        { 
            status: value.status,
            joinedAt: value.status === "approved" ? new Date() : undefined
        },
        { new: true }
    );

    if(!membership) throw new ApiError(404, "Membership request not found");

    // Update member count
    if(value.status === "approved") {
        community.memberCount += 1;
    } else if(value.status === "rejected" && membership.status === "pending") {
        // If rejecting a pending request, no change in count
    }
    await community.save();

    return response.status(200).json(
        new ApiResponse(200, membership, `Membership ${value.status} successfully`)
    );
});

// Get Pending Join Requests (for private/featured communities)
const getPendingRequests = asyncHandler(async (request, response) => {
    const { id } = request.params; // communityId
    const { page = 1, limit = 20 } = request.query;

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Verify user is business owner or admin
    const businessProfile = await BusinessProfile.findById(community.businessId);
    if(businessProfile.ownerUserId.toString() !== request.user._id.toString()) {
        const userProfileId = await getUserProfileId(request.user._id);
        const userMembership = await CommunityMembership.findOne({
            communityId: id,
            userProfileId: userProfileId,
            role: { $in: ["owner", "admin", "moderator"] }
        });
        if(!userMembership) {
            throw new ApiError(403, "Only community owner/admins can view pending requests");
        }
    }

    // Pagination
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Get pending memberships
    const pendingMemberships = await CommunityMembership.find({
        communityId: id,
        status: "pending"
    })
        .populate("userProfileId", "fullName title imageProfile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    const total = await CommunityMembership.countDocuments({
        communityId: id,
        status: "pending"
    });

    return response.status(200).json(
        new ApiResponse(200, { pendingRequests: pendingMemberships, total }, "Pending requests fetched successfully")
    );
});

// Get Community Members
const getCommunityMembers = asyncHandler(async (request, response) => {
    const { id } = request.params; // communityId
    const { page = 1, limit = 20, role, status } = request.query;

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Pagination
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = { communityId: id, status: "approved" };
    if(role) filter.role = role;
    if(status) filter.status = status;

    // Get members
    const members = await CommunityMembership.find(filter)
        .populate("userProfileId", "fullName title imageProfile bio")
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    const total = await CommunityMembership.countDocuments(filter);

    return response.status(200).json(
        new ApiResponse(200, { members, total }, "Community members fetched successfully")
    );
});

// Update Community
const updateCommunity = asyncHandler(async (request, response) => {
    const { id } = request.params;

    const { error, value } = updateCommunitySchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Verify user is business owner or admin
    const businessProfile = await BusinessProfile.findById(community.businessId);
    if(businessProfile.ownerUserId.toString() !== request.user._id.toString()) {
        const userProfileId = await getUserProfileId(request.user._id);
        const userMembership = await CommunityMembership.findOne({
            communityId: id,
            userProfileId: userProfileId,
            role: { $in: ["owner", "admin"] }
        });
        if(!userMembership) {
            throw new ApiError(403, "Only community owner/admins can update community");
        }
    }

    // Update community
    const updatedCommunity = await Community.findByIdAndUpdate(
        id,
        { $set: value },
        { new: true, runValidators: true }
    )
        .populate("businessId", "companyName businessType primaryIndustry logo");

    return response.status(200).json(
        new ApiResponse(200, updatedCommunity, "Community updated successfully")
    );
});

// Delete Community
const deleteCommunity = asyncHandler(async (request, response) => {
    const { id } = request.params;

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Verify user is business owner
    const businessProfile = await BusinessProfile.findById(community.businessId);
    if(businessProfile.ownerUserId.toString() !== request.user._id.toString()) {
        throw new ApiError(403, "Only business owner can delete community");
    }

    // Delete all memberships
    await CommunityMembership.deleteMany({ communityId: id });

    // Delete community
    await Community.findByIdAndDelete(id);

    return response.status(200).json(
        new ApiResponse(200, null, "Community deleted successfully")
    );
});

// Leave Community
const leaveCommunity = asyncHandler(async (request, response) => {
    const { id } = request.params; // communityId

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Get user profile
    const userProfileId = await getUserProfileId(request.user._id);

    // Find and remove membership
    const membership = await CommunityMembership.findOneAndDelete({
        communityId: id,
        userProfileId: userProfileId
    });

    if(!membership) throw new ApiError(404, "You are not a member of this community");

    // Update member count
    if(membership.status === "approved") {
        community.memberCount = Math.max(0, community.memberCount - 1);
        await community.save();
    }

    return response.status(200).json(
        new ApiResponse(200, null, "Left community successfully")
    );
});

module.exports = {
    createCommunity,
    getAllCommunities,
    getCommunityById,
    joinCommunity,
    approveMembership,
    getPendingRequests,
    getCommunityMembers,
    updateCommunity,
    deleteCommunity,
    leaveCommunity
};
